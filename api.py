"""
HTTP API for the StockDuel frontend.

This file only *wraps* the existing debate engine (graph.py, history.py,
chatbot.py, tools). It does not change any debate, scoring or fact-check
logic. The Next.js site in /frontend talks to it.

Run:  uvicorn api:app --host 0.0.0.0 --port 8000
"""

import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from threading import Lock

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from chatbot import ask_chatbot, build_debate_context, build_history_context, stream_chatbot
from factors import FACTORS
from history import get_debate_by_id, load_history, save_debate, update_chat
from ticker_lookup import SP500_TICKERS, parse_selection

logger = logging.getLogger("stockduel.api")

app = FastAPI(title="StockDuel API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FACTOR_NAME = {f["id"]: f["name"] for f in FACTORS}
MARKET_TICKERS = ("AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "JPM", "V", "UNH")
QUOTE_TTL = 300

_quote_cache: dict = {}
_quote_lock = Lock()
_results: dict = {}  # debate id -> full engine result, so the chat can use it


# ---------------------------------------------------------------------------
# Market data
# ---------------------------------------------------------------------------


def _price_history(ticker: str, period: str = "1M") -> dict:
    # Imported on first use: the data/AI libraries take seconds to import.
    from tools import get_price_history

    return get_price_history(ticker, period)


def _fetch_quote(ticker: str):
    now = time.time()
    with _quote_lock:
        hit = _quote_cache.get(ticker)
        if hit and now - hit[0] < QUOTE_TTL:
            return hit[1]
    try:
        data = _price_history(ticker, "1M")
    except Exception:
        logger.exception("Price lookup failed for %s", ticker)
        return None
    closes = data.get("close") or []
    if len(closes) < 2:
        quote = None
    else:
        price, prev = closes[-1], closes[-2]
        quote = {
            "ticker": ticker,
            "name": SP500_TICKERS.get(ticker, "Custom ticker"),
            "price": price,
            "change_pct": (price / prev - 1) * 100 if prev else 0.0,
            "closes": closes[-30:],
        }
    with _quote_lock:
        _quote_cache[ticker] = (now, quote)
    return quote


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/tickers")
def tickers():
    return [{"ticker": t, "name": n} for t, n in SP500_TICKERS.items()]


@app.get("/api/resolve")
def resolve(q: str = Query(..., min_length=1)):
    return {"ticker": parse_selection(q)}


@app.get("/api/quote/{ticker}")
def quote(ticker: str):
    q = _fetch_quote(ticker.upper())
    if not q:
        raise HTTPException(404, f"No price data for {ticker.upper()}")
    return q


@app.get("/api/quotes")
def quotes():
    with ThreadPoolExecutor(max_workers=len(MARKET_TICKERS)) as ex:
        found = list(ex.map(_fetch_quote, MARKET_TICKERS))
    return [q for q in found if q]


@app.get("/api/price/{ticker}")
def price(ticker: str, period: str = "1M"):
    data = _price_history(ticker.upper(), period)
    return {"ticker": ticker.upper(), "period": period, "dates": data.get("dates", []), "close": data.get("close", [])}


@app.get("/api/factors")
def factors():
    return FACTORS


# ---------------------------------------------------------------------------
# Serialising engine results
# ---------------------------------------------------------------------------


def _claim_dict(claim, verification=None, unavailable=False):
    out = {
        "factor": claim.factor,
        "factor_name": FACTOR_NAME.get(claim.factor, str(claim.factor).replace("_", " ").title()),
        "statement": claim.statement,
        "cited_value": claim.cited_value,
        "source": claim.source,
        "verdict": "unavailable" if unavailable else "pending",
        "actual_value": None,
        "explanation": None,
    }
    if verification is not None and not unavailable:
        out["verdict"] = verification.verdict
        out["actual_value"] = verification.actual_value
        out["explanation"] = verification.explanation
    return out


def _match_verifications(claims, verifications):
    """Pair each Claim with its judge verdict: exact/substring statement
    match first, then fall back to position for anything left over."""
    used, pairs = set(), []
    for claim in claims:
        match = None
        for i, v in enumerate(verifications):
            if i in used:
                continue
            cs, vs = claim.statement.strip(), v.original_statement.strip()
            if cs == vs or cs in vs or vs in cs:
                match = v
                used.add(i)
                break
        pairs.append([claim, match])
    remaining = [v for i, v in enumerate(verifications) if i not in used]
    for pair in pairs:
        if pair[1] is None and remaining:
            pair[1] = remaining.pop(0)
    return pairs


def _argument_dict(arg, verifications=None, unavailable=False):
    pairs = _match_verifications(arg.claims, verifications or [])
    return {
        "ticker": arg.ticker,
        "round": arg.round,
        "argument": arg.argument,
        "rebuttals": list(arg.rebuttals),
        "claims": [_claim_dict(c, v, unavailable) for c, v in pairs],
    }


def _lean(verdict):
    gap = abs(verdict.confidence_A_pct - 50)
    if verdict.winner == "Tie" or gap < 2.5:
        return {"headline": "Too close to call", "strength": "close", "label": "Mixed signals"}
    if gap < 8:
        return {"headline": f"{verdict.winner} leads", "strength": "slight", "label": "Slight lead"}
    return {"headline": f"{verdict.winner} leads", "strength": "clear", "label": "Clear lead"}


def serialize_result(result: dict, elapsed: int, debate_id: str) -> dict:
    tA, tB = result["ticker_A"], result["ticker_B"]
    v = result["final_verdict"]
    fc = result["factcheck_results"]
    r1 = result["round1_scores"]
    sa = {fs.factor: fs.score_A for fs in r1.factor_scores}
    sb = {fs.factor: fs.score_B for fs in r1.factor_scores}
    rows = [(f, sa.get(f["id"], 5.0), sb.get(f["id"], 5.0)) for f in FACTORS]

    def edge(name, f, own, other):
        return {"name": f["name"], "own": round(own, 1), "other": round(other, 1), "weight": round(f["weight"] * 100)}

    a_adv = sorted([r for r in rows if r[1] - r[2] > 0.05], key=lambda r: r[2] - r[1])[:3]
    b_adv = sorted([r for r in rows if r[2] - r[1] > 0.05], key=lambda r: r[1] - r[2])[:3]

    risks = []
    if v.winner in (tA, tB):
        winner_is_a = v.winner == tA
        behind = sorted(
            [r for r in rows if (r[2] - r[1] if winner_is_a else r[1] - r[2]) > 0.05],
            key=lambda r: -((r[2] - r[1]) if winner_is_a else (r[1] - r[2])),
        )[:2]
        for r in behind:
            ws, ls = (r[1], r[2]) if winner_is_a else (r[2], r[1])
            risks.append(f"{v.winner} trails on {r[0]['name']} ({ws:.1f} vs {ls:.1f}).")
    if fc.unavailable:
        risks.append("The fact-check did not run, so no claim was independently verified.")
    else:
        disputed = sum(1 for c in fc.claims_A + fc.claims_B if c.verdict == "false")
        if disputed:
            risks.append(
                f"The fact-checker disputed {disputed} claim{'s' if disputed != 1 else ''}; "
                "those arguments leaned on wrong numbers."
            )
    if not risks:
        risks.append("No major weak spots showed up in the factor scores.")

    close = sorted(rows, key=lambda r: (abs(r[1] - r[2]), -r[0]["weight"]))[:3]
    watch = [
        f"{r[0]['name']} ({round(r[0]['weight'] * 100)}% weight): {r[1]:.1f} vs {r[2]:.1f}, close enough to swing."
        for r in close
    ]

    n1A, n2B = len(result["round1_A"].claims), len(result["round2_B"].claims)
    n1B, n2A = len(result["round1_B"].claims), len(result["round2_A"].claims)
    un = fc.unavailable
    counts = {"verified": 0, "unverified": 0, "false": 0}
    for c in fc.claims_A + fc.claims_B:
        counts[c.verdict] = counts.get(c.verdict, 0) + 1

    return {
        "id": debate_id,
        "ticker_A": tA,
        "ticker_B": tB,
        "name_A": SP500_TICKERS.get(tA, tA),
        "name_B": SP500_TICKERS.get(tB, tB),
        "elapsed": elapsed,
        "factcheck_unavailable": un,
        "claim_counts": counts,
        "verdict": {
            "winner": v.winner,
            "total_A": round(v.total_score_A, 2),
            "total_B": round(v.total_score_B, 2),
            "confidence_A": v.confidence_A_pct,
            "confidence_B": v.confidence_B_pct,
            "summary": v.summary,
            "lean": _lean(v),
        },
        "points": {
            "a_stronger": [edge(r[0]["name"], r[0], r[1], r[2]) for r in a_adv],
            "b_stronger": [edge(r[0]["name"], r[0], r[2], r[1]) for r in b_adv],
            "risks": risks,
            "watch": watch,
        },
        "factors": [
            {
                "id": f["id"],
                "name": f["name"],
                "category": f["category"],
                "weight": f["weight"],
                "score_A": round(a, 1),
                "score_B": round(b, 1),
            }
            for f, a, b in rows
        ],
        "rounds": {
            "r1_A": _argument_dict(result["round1_A"], fc.claims_A[:n1A], un),
            "r1_B": _argument_dict(result["round1_B"], fc.claims_B[:n1B], un),
            "r2_A": _argument_dict(result["round2_A"], fc.claims_B[n1B:n1B + n2A], un),
            "r2_B": _argument_dict(result["round2_B"], fc.claims_A[n1A:n1A + n2B], un),
        },
    }


# ---------------------------------------------------------------------------
# Running a debate (server-sent events)
# ---------------------------------------------------------------------------


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


@app.get("/api/debate/stream")
def debate_stream(a: str, b: str, v: str = ""):
    tA, tB = parse_selection(a), parse_selection(b)

    def gen():
        if not tA or not tB:
            yield _sse("fail", {"message": "Choose a stock in each box."})
            return
        if tA == tB:
            yield _sse("fail", {"message": "Choose two different stocks."})
            return
        missing = [t for t in (tA, tB) if t not in SP500_TICKERS and _fetch_quote(t) is None]
        if missing:
            names = " and ".join(f'"{m}"' for m in missing)
            yield _sse("fail", {"message": f"We could not find {names}. Check the ticker symbol, for example AAPL for Apple."})
            return

        from graph import run_debate_streaming

        start = time.time()
        yield _sse("stage", {"step": 0, "note": f"Pulling live data for {tA} and {tB}, then writing the opening cases"})
        shown, final_state = set(), {}
        try:
            for state in run_debate_streaming(tA, tB):
                final_state = state
                if "round1_A" in state and "round1_B" in state and "r1" not in shown:
                    shown.add("r1")
                    yield _sse("round1", {
                        "step": 1,
                        "note": "Opening cases are in. Each analyst is now attacking the other side",
                        "A": _argument_dict(state["round1_A"], [], False),
                        "B": _argument_dict(state["round1_B"], [], False),
                    })
                if "round2_A" in state and "round2_B" in state and "r2" not in shown:
                    shown.add("r2")
                    yield _sse("round2", {
                        "step": 2,
                        "note": "Rebuttals are in. The judge is re-checking every claim against real data",
                        "A": _argument_dict(state["round2_A"], [], False),
                        "B": _argument_dict(state["round2_B"], [], False),
                    })
                if "factcheck_results" in state and "fc" not in shown:
                    shown.add("fc")
                    yield _sse("stage", {"step": 3, "note": "Fact-check done. Scoring both rounds against the 10 factors"})
                if "round1_scores" in state and "sc" not in shown:
                    shown.add("sc")
                    yield _sse("stage", {"step": 4, "note": "Scores are in. Writing the final verdict"})
            if "final_verdict" not in final_state:
                raise RuntimeError("The debate ended before a verdict was produced.")
            elapsed = int(time.time() - start)
            debate_id = None
            try:
                entry = save_debate(final_state, elapsed, owner=v or None)
                debate_id = entry["id"]
            except Exception:
                logger.exception("Failed to save debate to history")
            debate_id = debate_id or f"tmp{int(time.time())}"
            _results[debate_id] = final_state
            yield _sse("done", serialize_result(final_state, elapsed, debate_id))
        except Exception as e:
            logger.exception("Debate failed for %s vs %s", tA, tB)
            yield _sse("fail", {"message": "This debate could not finish.", "details": str(e)})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ---------------------------------------------------------------------------
# History and chat
# ---------------------------------------------------------------------------


def _owned(entry: dict | None, visitor: str) -> bool:
    """History is private per visitor: an entry belongs to the browser that ran it."""
    return bool(entry) and bool(visitor) and entry.get("owner") == visitor


@app.get("/api/history")
def history(q: str = "", v: str = ""):
    if not v:
        return []
    items = [e for e in load_history() if e.get("owner") == v]
    q = q.strip().upper()
    if q:
        items = [e for e in items if q in e.get("ticker_A", "") or q in e.get("ticker_B", "") or q in e.get("winner", "")]
    # The owner id is a private key; never send it back to the browser.
    return [{k: val for k, val in e.items() if k != "owner"} for e in items]


@app.get("/api/history/{debate_id}")
def history_item(debate_id: str, v: str = ""):
    entry = get_debate_by_id(debate_id)
    if not _owned(entry, v):
        raise HTTPException(404, "Debate not found")
    return {k: val for k, val in entry.items() if k != "owner"}


class ChatIn(BaseModel):
    debate_id: str
    question: str
    history: list[dict] = []
    visitor: str = ""


def _chat_context(body: ChatIn) -> str:
    """Debate data for this chat. 404 if the debate is someone else's or does not exist."""
    entry = get_debate_by_id(body.debate_id)
    if entry is not None and not _owned(entry, body.visitor):
        raise HTTPException(404, "Debate not found")  # someone else's debate
    result = _results.get(body.debate_id)
    if result is not None:
        return build_debate_context(result)
    if not entry:
        raise HTTPException(404, "Debate not found")
    return build_history_context(entry)


def _save_chat(body: ChatIn, answer: str):
    updated = list(body.history) + [
        {"role": "user", "content": body.question},
        {"role": "assistant", "content": answer},
    ]
    try:
        update_chat(body.debate_id, updated)
    except Exception:
        logger.exception("Failed to save chat history")


@app.post("/api/chat")
def chat(body: ChatIn):
    context = _chat_context(body)
    try:
        answer = ask_chatbot(body.question, context, body.history)
    except Exception:
        logger.exception("Chatbot failed")
        answer = "Sorry, I could not answer that just now. Please try again in a moment."
    _save_chat(body, answer)
    return {"answer": answer}


@app.post("/api/chat/stream")
def chat_stream(body: ChatIn):
    """Same answer as /api/chat, but sent piece by piece as the model writes it."""
    context = _chat_context(body)

    def gen():
        parts: list[str] = []
        try:
            for piece in stream_chatbot(body.question, context, body.history):
                parts.append(piece)
                yield _sse("delta", {"text": piece})
        except Exception:
            logger.exception("Chatbot stream failed")
            if not parts:
                parts.append("Sorry, I could not answer that just now. Please try again in a moment.")
                yield _sse("delta", {"text": parts[0]})
        answer = "".join(parts)
        _save_chat(body, answer)
        yield _sse("done", {"answer": answer})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@app.on_event("startup")
def _warm_up():
    """Load the AI libraries in the background so the very first chat answer is not slow."""
    import threading

    def load():
        try:
            import config
            config.get_judge_llm()
        except Exception:
            logger.exception("Warm-up failed")

    threading.Thread(target=load, daemon=True).start()
