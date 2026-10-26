"""
Judge: 3-stage pipeline, run by a separate (typically stronger) model than
either debater.

  1. judge_factcheck_node — independently re-fetches EVERY factor for BOTH
                            tickers and tags every debater claim as verified /
                            unverified / false.
  2. judge_score_node     — scores both stocks on the 10 weighted factors
                            using ONLY the ground-truth data. The judge never
                            sees the debater arguments, so writing quality
                            cannot influence the scores.
  3. final_verdict_node   — deterministic Python aggregation of the per-factor
                            scores into a single weighted total and confidence
                            split. The LLM writes the narrative rationale only.
"""

import concurrent.futures
import json
import logging

from langchain_core.exceptions import OutputParserException
from openai import LengthFinishReasonError

import config
from config import get_judge_llm, invoke_structured
from factors import FACTOR_IDS, FACTORS, blended_score
from schemas import Claim, ClaimVerification, ClaimVerificationBatch, FactCheckResult, FinalVerdict, RoundScore
from state import DebateState
from tools import (
    get_analyst_ratings,
    get_earnings_guidance,
    get_fed_funds_rate,
    get_insider_transactions,
    get_sector_rally,
    get_technical_signal,
    get_valuation_snapshot,
    parallel_fetch,
    search_news,
)

logger = logging.getLogger("stockduel.judge")


def _is_truncation_error(e: Exception) -> bool:
    """True when a structured-output call failed because the reply was cut
    off by max_tokens. OpenAI raises LengthFinishReasonError from inside its
    own client, before LangChain can hand back the raw message — so
    include_raw=True alone never sees it. Other providers surface the same
    problem as an unparseable (half-written) JSON reply."""
    return (
        isinstance(e, (LengthFinishReasonError, OutputParserException))
        or "length limit" in str(e).lower()
    )


def _unavailable_verification(claim: Claim) -> ClaimVerification:
    return ClaimVerification(
        factor=claim.factor,
        original_statement=claim.statement,
        original_cited_value=claim.cited_value,
        verdict="unverified",
        actual_value=None,
        explanation="Fact-check unavailable for this debate.",
    )


_FACTOR_TABLE = "\n".join(f"- {f['name']} ({f['id']}), weight {f['weight']*100:.0f}%, category {f['category']}" for f in FACTORS)

_FACTOR_TO_TICKER_TOOL = {
    "earnings_guidance": get_earnings_guidance,
    "pe_ratio": get_valuation_snapshot,
    "market_cap": get_valuation_snapshot,
    "beta": get_valuation_snapshot,
    "analyst_ratings": get_analyst_ratings,
    "insider_selling": get_insider_transactions,
    "technical_signal": get_technical_signal,
    "sector_rally": get_sector_rally,
}


def _fmt_claims(claims: list[Claim]) -> str:
    if not claims:
        return "(none)"
    return "\n".join(
        f"{i+1}. [{c.factor}] \"{c.statement}\" — cited value: {c.cited_value} (claimed source: {c.source})"
        for i, c in enumerate(claims)
    )



def _reconcile_verifications(claims: list[Claim], verifications: list[ClaimVerification]) -> list[ClaimVerification]:
    """Guarantee exactly one ClaimVerification per input claim, in the same
    order as `claims`. The judge is instructed to verify every claim, but
    under token pressure a cheap model can still drop one. Two real
    problems follow from that if left unfixed:
      1. The scoring stage only ever sees claims.claims_A/B, so a dropped
         claim silently gets NO fact-check adjustment at all in scoring —
         not "unverified", just invisible.
      2. api.py pairs claims to verifications positionally when rendering;
         a missing entry shifts every verification after it onto the
         wrong claim, not just the one that was skipped.
    Matching by statement overlap and padding any unmatched claim with an
    explicit "unverified" verdict fixes both at the source.
    """
    used = set()
    reconciled = []
    for claim in claims:
        match = None
        for i, v in enumerate(verifications):
            if i in used:
                continue
            if claim.statement.strip() == v.original_statement.strip() or \
               claim.statement.strip() in v.original_statement or \
               v.original_statement in claim.statement:
                match = v
                used.add(i)
                break
        if match is None:
            match = ClaimVerification(
                factor=claim.factor,
                original_statement=claim.statement,
                original_cited_value=claim.cited_value,
                verdict="unverified",
                actual_value=None,
                explanation="Judge did not return a verdict for this claim — defaulted to unverified.",
            )
        reconciled.append(match)
    return reconciled


def _build_factor_calls(ticker: str, factor_ids) -> list[tuple]:
    """Build (key, tool, args) calls for a set of factors about this
    ticker — the factor already tells us exactly which tool to call, so
    this needs no LLM. `fed_rate` is intentionally left out here since
    it's ticker-independent and fetched once, shared across both tickers."""
    calls = []
    seen_tools = set()
    for factor in factor_ids:
        if factor == "fed_rate":
            continue
        if factor == "news_sentiment":
            calls.append((f"{ticker}:news_sentiment", search_news, {"query": f"{ticker} stock news"}))
            continue
        tool_fn = _FACTOR_TO_TICKER_TOOL.get(factor)
        if tool_fn is None or tool_fn.name in seen_tools:
            continue
        seen_tools.add(tool_fn.name)
        calls.append((f"{ticker}:{tool_fn.name}", tool_fn, {"ticker": ticker}))
    return calls


def judge_factcheck_node(state: DebateState) -> dict:
    ticker_A, ticker_B = state["ticker_A"], state["ticker_B"]
    claims_about_A = state["round1_A"].claims + state["round2_B"].claims
    claims_about_B = state["round1_B"].claims + state["round2_A"].claims

    # Fetch EVERY factor for both tickers, not just whatever either debater
    # happened to cite. This becomes the judge's objective ground truth for
    # SCORING (see _score_round) — comparing real numbers directly, instead
    # of leaning on which debater's model wrote a more persuasive argument.
    # Backtest evidence for why this matters: with the old claims-only
    # approach, swapping which model argued which stock flipped the winner
    # in 4 of 5 fair-fight pairs — the score was tracking writing quality,
    # not company fundamentals.
    calls = _build_factor_calls(ticker_A, FACTOR_IDS) + _build_factor_calls(ticker_B, FACTOR_IDS)
    calls.append(("fed_rate", get_fed_funds_rate, {"_": "current"}))
    fetched = parallel_fetch(calls)

    fresh_data_A = {k.split(":", 1)[1]: v for k, v in fetched.items() if k.startswith(f"{ticker_A}:")}
    fresh_data_B = {k.split(":", 1)[1]: v for k, v in fetched.items() if k.startswith(f"{ticker_B}:")}
    fresh_data_A["fed_rate"] = fetched["fed_rate"]
    fresh_data_B["fed_rate"] = fetched["fed_rate"]

    MAX_CLAIMS_PER_CALL = 6  # smaller batches = less chance a cheap model

    # drops an easily-checkable claim under load, which would otherwise
    # surface as a false "unverified" and unfairly zero out real evidence.

    def _verify_batch(ticker: str, batch: list[Claim], fresh_data: dict) -> list[ClaimVerification]:
        """Verify one batch of claims. Uses include_raw=True so we can see
        the actual finish_reason and any parsing_error BEFORE anything
        tries to use a possibly-incomplete parsed result — a response cut
        off mid-JSON by the token limit otherwise surfaces as a raw
        "Could not parse response content as the length limit was reached"
        crash. On truncation, retries with the batch split in half instead
        of crashing — a batch too big for the token budget usually fits
        once halved. Bottoms out at batch size 1: if even a single claim's
        verdict won't fit, it's recorded as unverified rather than
        crashing the whole debate."""
        llm = config.get_debater_llm(config.JUDGE_MODEL, temperature=0.0, max_tokens=8000)
        structurer = llm.with_structured_output(ClaimVerificationBatch, include_raw=True)
        prompt = (
            f"You are an independent fact-checking judge. You do not trust the debater's "
            f"figures. Below is freshly re-fetched data for {ticker}, retrieved independently "
            f"of anything the debater said — use ONLY this data to verify their claims, never "
            f"eyeball plausibility.\n\n"
            f"Freshly re-fetched data for {ticker}:\n{json.dumps(fresh_data, default=str)}\n\n"
            f"Claims made about {ticker} to verify:\n{_fmt_claims(batch)}\n\n"
            f"For each claim decide:\n"
            f"- verified: the fresh data confirms the cited value is materially accurate\n"
            f"- unverified: the fresh data doesn't cover this specific point either way\n"
            f"- false: the fresh data contradicts the cited value, or it looks fabricated/outdated\n\n"
            f"Every claim listed above must appear exactly once with a verdict. "
            f"CRITICAL: whenever verdict is 'false', you MUST fill in `actual_value` with the "
            f"correct real number/fact from the data above — this replaces the debater's wrong "
            f"figure and is what the next scoring stage will use instead. Never leave "
            f"`actual_value` blank on a false verdict.\n\n"
            f"KEEP IT COMPACT: `explanation` must be ONE short sentence, max ~15 words, never a "
            f"paragraph — do not restate the claim, just say why it's verified/false/unverified."
        )
        parsed = None
        try:
            result = structurer.invoke(prompt)
        except Exception as e:
            if not _is_truncation_error(e):
                raise  # a real failure (bad key, network...) — handled by the node-level soft-fail
            truncated = True
        else:
            raw_msg, parsed, parsing_error = result["raw"], result["parsed"], result["parsing_error"]
            finish_reason = (raw_msg.response_metadata or {}).get("finish_reason")
            truncated = finish_reason == "length" or parsed is None or parsing_error is not None

        if truncated:
            logger.warning("Fact-check reply for %s was cut off (%d claims) — retrying in smaller pieces", ticker, len(batch))
            if len(batch) == 1:
                return _reconcile_verifications(batch, [])
            mid = len(batch) // 2
            return (_verify_batch(ticker, batch[:mid], fresh_data) +
                    _verify_batch(ticker, batch[mid:], fresh_data))

        return _reconcile_verifications(batch, parsed.claims)

    def _verify_ticker(ticker: str, claims: list[Claim], fresh_data: dict) -> list[ClaimVerification]:
        if not claims:
            return []
        batches = [claims[i:i + MAX_CLAIMS_PER_CALL] for i in range(0, len(claims), MAX_CLAIMS_PER_CALL)]
        if len(batches) == 1:
            return _verify_batch(ticker, batches[0], fresh_data)
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(batches)) as batch_ex:
            batch_results = list(batch_ex.map(lambda b: _verify_batch(ticker, b, fresh_data), batches))
        return [v for result in batch_results for v in result]

    # Soft-fail: if verification breaks in a way splitting can't fix, the
    # debate must still finish. Every claim is left "unverified" and the
    # result is flagged so the UI can say "Fact-check unavailable".
    unavailable = False
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
            future_A = ex.submit(_verify_ticker, ticker_A, claims_about_A, fresh_data_A)
            future_B = ex.submit(_verify_ticker, ticker_B, claims_about_B, fresh_data_B)
            verified_A = future_A.result()
            verified_B = future_B.result()
    except Exception:
        logger.exception("Fact-check step failed — continuing without verification")
        unavailable = True
        verified_A = [_unavailable_verification(c) for c in claims_about_A]
        verified_B = [_unavailable_verification(c) for c in claims_about_B]

    factcheck = FactCheckResult(
        ticker_A=ticker_A, ticker_B=ticker_B, claims_A=verified_A, claims_B=verified_B, unavailable=unavailable
    )
    return {
        "factcheck_results": factcheck,
        "ground_truth_A": fresh_data_A,
        "ground_truth_B": fresh_data_B,
    }


def judge_score_node(state: DebateState) -> dict:
    """Score both stocks purely from ground-truth data. The debater arguments
    are intentionally NOT included — the judge never sees what the AIs wrote,
    so the scores cannot be influenced by writing quality or model style."""
    ticker_A, ticker_B = state["ticker_A"], state["ticker_B"]
    ground_truth_A = state["ground_truth_A"]
    ground_truth_B = state["ground_truth_B"]
    llm = get_judge_llm()
    prompt = (
        f"You are an independent investment analyst scoring {ticker_A} vs {ticker_B} "
        f"on these 10 weighted factors:\n{_FACTOR_TABLE}\n\n"
        f"OBJECTIVE DATA for {ticker_A} (fetched live from market APIs):\n"
        f"{json.dumps(ground_truth_A, default=str)}\n\n"
        f"OBJECTIVE DATA for {ticker_B} (fetched live from market APIs):\n"
        f"{json.dumps(ground_truth_B, default=str)}\n\n"
        f"SCORING RULE: for each of the 10 factors, give score_A and score_B on a 0-10 "
        f"scale based ENTIRELY on the objective data above. A higher score means that "
        f"stock is stronger on that factor. Compare the two stocks' real numbers directly "
        f"— for example, lower P/E is usually better, higher analyst consensus is better, "
        f"less insider selling is better. If data for a factor is missing or unclear for "
        f"both stocks, give both a neutral 5.\n\n"
        f"You must produce exactly one FactorScore entry for each of these factor ids: "
        f"{', '.join(FACTOR_IDS)}."
    )
    score: RoundScore = invoke_structured(llm, RoundScore, prompt)
    score.round = 1
    score.ticker_A = ticker_A
    score.ticker_B = ticker_B
    return {"round1_scores": score, "round2_scores": score}


def final_verdict_node(state: DebateState) -> dict:
    r1: RoundScore = state["round1_scores"]
    r2: RoundScore = state["round2_scores"]

    r1_A = {fs.factor: fs.score_A for fs in r1.factor_scores}
    r1_B = {fs.factor: fs.score_B for fs in r1.factor_scores}
    r2_A = {fs.factor: fs.score_A for fs in r2.factor_scores}
    r2_B = {fs.factor: fs.score_B for fs in r2.factor_scores}

    # Equal-weight the two rounds per factor, then apply the locked factor
    # weights deterministically — no LLM ever touches this arithmetic.
    combined_A = {fid: (r1_A.get(fid, 5.0) + r2_A.get(fid, 5.0)) / 2 for fid in FACTOR_IDS}
    combined_B = {fid: (r1_B.get(fid, 5.0) + r2_B.get(fid, 5.0)) / 2 for fid in FACTOR_IDS}

    total_A = blended_score(combined_A)
    total_B = blended_score(combined_B)

    denom = total_A + total_B
    confidence_A = round((total_A / denom) * 100, 1) if denom > 0 else 50.0
    confidence_B = round(100 - confidence_A, 1)

    ticker_A, ticker_B = state["ticker_A"], state["ticker_B"]
    if total_A > total_B:
        winner = ticker_A
    elif total_B > total_A:
        winner = ticker_B
    else:
        winner = "Tie"

    breakdown_lines = []
    for fid in FACTOR_IDS:
        name = next(f["name"] for f in FACTORS if f["id"] == fid)
        breakdown_lines.append(
            f"- {name}: {ticker_A} {combined_A[fid]:.1f}/10 vs {ticker_B} {combined_B[fid]:.1f}/10"
        )

    llm = get_judge_llm()
    summary_prompt = (
        f"Write a factor-by-factor investment debate verdict summary (not a black-box "
        f"one-liner — reference the specific factors that drove the outcome). "
        f"{ticker_A} scored {total_A:.2f}/10 overall, {ticker_B} scored {total_B:.2f}/10, "
        f"giving a confidence split of {confidence_A:.1f}% {ticker_A} / {confidence_B:.1f}% "
        f"{ticker_B}, and the winner is {winner}.\n\nPer-factor breakdown:\n" + "\n".join(breakdown_lines) +
        f"\n\nSTRICT formatting rules — this renders directly inside a compact web page section, "
        f"not a standalone document:\n"
        f"- Max 120 words total.\n"
        f"- Plain flowing prose or a short bullet list only.\n"
        f"- NEVER use markdown headers (no '#', '##', etc. — not even one, not even a title).\n"
        f"- No document-style title or restating 'Winner: X' — that's already shown above this text."
    )
    summary_text = llm.invoke(summary_prompt).text

    verdict = FinalVerdict(
        ticker_A=ticker_A,
        ticker_B=ticker_B,
        total_score_A=total_A,
        total_score_B=total_B,
        confidence_A_pct=confidence_A,
        confidence_B_pct=confidence_B,
        winner=winner,
        summary=summary_text,
    )
    return {"final_verdict": verdict}
