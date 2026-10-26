"""Pydantic schemas for structured LLM output across the debate pipeline."""

from typing import Annotated, Literal, Optional
from pydantic import BaseModel, BeforeValidator, Field

from factors import FACTOR_IDS

# Cheap models (esp. smaller ones like Mistral Small) don't always follow the
# "use exactly this id" instruction — they'll often echo a raw tool field name
# instead (e.g. "earnings_growth" instead of "earnings_guidance"). Rather than
# hard-failing the whole debate on a strict Literal mismatch, normalize known
# variants before validation runs.
_FACTOR_SYNONYMS = {
    "earnings_growth": "earnings_guidance",
    "revenue_growth": "earnings_guidance",
    "earnings_quarterly_growth": "earnings_guidance",
    "eps_growth": "earnings_guidance",
    "guidance": "earnings_guidance",
    "eps": "earnings_guidance",
    "pe": "pe_ratio",
    "p_e": "pe_ratio",
    "trailing_pe": "pe_ratio",
    "forward_pe": "pe_ratio",
    "valuation": "pe_ratio",
    "analyst_rating": "analyst_ratings",
    "recommendation": "analyst_ratings",
    "price_target": "analyst_ratings",
    "target_mean_price": "analyst_ratings",
    "target_price": "analyst_ratings",
    "mean_target": "analyst_ratings",
    "target_median_price": "analyst_ratings",
    "insider": "insider_selling",
    "insider_transactions": "insider_selling",
    "insider_trading": "insider_selling",
    "technical": "technical_signal",
    "technicals": "technical_signal",
    "rsi": "technical_signal",
    "sma": "technical_signal",
    "moving_average": "technical_signal",
    "golden_cross": "technical_signal",
    "fed_funds_rate": "fed_rate",
    "interest_rate": "fed_rate",
    "fed_funds": "fed_rate",
    "market_capitalization": "market_cap",
    "cap": "market_cap",
    "sector_performance": "sector_rally",
    "sector_etf": "sector_rally",
    "news": "news_sentiment",
    "sentiment": "news_sentiment",
    "risk": "beta",
    "volatility": "beta",
    "dividend": "pe_ratio",
    "dividend_yield": "pe_ratio",
    "yield": "pe_ratio",
    "payout": "pe_ratio",
    "revenue": "earnings_guidance",
    "profit": "earnings_guidance",
    "margin": "earnings_guidance",
    "growth": "earnings_guidance",
    "momentum": "technical_signal",
    "price": "technical_signal",
    "performance": "technical_signal",
}


def _normalize_factor(v):
    if not isinstance(v, str):
        return v
    key = v.strip().lower().replace(" ", "_").replace("-", "_").replace("/", "_")
    if key in FACTOR_IDS:
        return key
    if key in _FACTOR_SYNONYMS:
        return _FACTOR_SYNONYMS[key]

    key_words = set(key.split("_"))
    # word-level synonym match, e.g. "rsi_14" -> {"rsi", "14"} -> "rsi" -> technical_signal
    for word in key_words:
        if word in _FACTOR_SYNONYMS:
            return _FACTOR_SYNONYMS[word]

    for fid in FACTOR_IDS:
        if fid in key or key in fid:
            return fid

    for fid in FACTOR_IDS:
        if set(fid.split("_")) & key_words:
            return fid

    # Unmappable label from a small model (e.g. a made-up "free_cash_flow"). Crashing the whole
    # debate over a tag is worse than filing it under valuation, so use that as the last resort.
    return "pe_ratio"


FactorId = Annotated[Literal[tuple(FACTOR_IDS)], BeforeValidator(_normalize_factor)]  # type: ignore


class Claim(BaseModel):
    """A single factual data point a debater cited in support of their argument."""
    factor: FactorId = Field(description=f"Which factor this claim relates to. One of: {', '.join(FACTOR_IDS)}")
    statement: str = Field(description="The specific factual claim made, in the debater's own words.")
    cited_value: str = Field(description="The specific number/figure/rating cited, e.g. 'P/E of 42.3' or '3 insider sales totaling $12M'.")
    source: str = Field(description="Where this came from, e.g. 'yfinance', 'Tavily: reuters.com article title', 'FRED: FEDFUNDS series'.")


def _coerce_rebuttal_to_str(v):
    """A cheap model occasionally hands back a mini-object for a rebuttal
    (e.g. {"factor": "insider_selling", "statement": "..."}) instead of
    the plain string the schema asks for. Rather than hard-failing the
    whole debate on a formatting quirk, extract the readable part."""
    if isinstance(v, str):
        return v
    if isinstance(v, dict):
        for key in ("statement", "rebuttal", "text"):
            if key in v and isinstance(v[key], str):
                return v[key]
        return " — ".join(str(x) for x in v.values())
    return str(v)


RebuttalStr = Annotated[str, BeforeValidator(_coerce_rebuttal_to_str)]


class DebaterArgument(BaseModel):
    """Structured output for one debater in one round."""
    ticker: str
    round: int = Field(description="1 = pro argument for own ticker, 2 = con argument attacking opponent's ticker")
    argument: str = Field(description="The written argument, referencing the claims below. Punchy and specific, max ~150 words — this is a cost-sensitive app, not an essay.")
    # max_length here is a safety net against a genuine runaway loop, not
    # a real limit — a thorough round covering all 10 factors plus a few
    # nuanced claims can legitimately reach ~13-15; capping too low (an
    # earlier version used 12) rejects perfectly normal responses.
    claims: list[Claim] = Field(default_factory=list)
    rebuttals: list[RebuttalStr] = Field(
        default_factory=list,
        description=(
            "Round 2 only: AT MOST 3-4 entries — the single most important opponent claims "
            "being directly rebutted, quoted or closely paraphrased, as plain text sentences "
            "(not objects with fields). Do not list every point; pick the strongest few. Stop "
            "after that — do not keep restating the same rebuttal with slightly different wording."
        ),
    )


class ClaimVerification(BaseModel):
    factor: FactorId
    original_statement: str
    original_cited_value: str
    verdict: Literal["verified", "unverified", "false"]
    actual_value: Optional[str] = Field(default=None, description="What the judge's own re-fetch found, if different or if unverifiable.")
    explanation: str = Field(description="ONE short sentence, max ~15 words. No elaboration.")


class ClaimVerificationBatch(BaseModel):
    """One ticker's worth of fact-check verdicts — kept as its own call
    (instead of both tickers in one FactCheckResult) so the output stays
    small enough to reliably fit the token budget regardless of how many
    claims either debater made."""
    claims: list[ClaimVerification]


class FactCheckResult(BaseModel):
    ticker_A: str
    ticker_B: str
    claims_A: list[ClaimVerification]
    claims_B: list[ClaimVerification]
    unavailable: bool = False  # True when the whole fact-check step failed and every claim was left unverified


class FactorScore(BaseModel):
    factor: FactorId
    score_A: float = Field(ge=0, le=10)
    score_B: float = Field(ge=0, le=10)
    reasoning: str = Field(description="ONE short sentence, max ~20 words. Note any fact-check penalty tersely, no elaboration.")


class RoundScore(BaseModel):
    round: int
    ticker_A: str
    ticker_B: str
    factor_scores: list[FactorScore]
    rebuttal_quality_A: Optional[str] = Field(default=None, description="Round 2 only, ONE short sentence max ~20 words: did A correctly counter B's weak/false points, or dodge?")
    rebuttal_quality_B: Optional[str] = Field(default=None, description="Same as rebuttal_quality_A but for B, one short sentence.")


class FinalVerdict(BaseModel):
    ticker_A: str
    ticker_B: str
    total_score_A: float
    total_score_B: float
    confidence_A_pct: float
    confidence_B_pct: float
    winner: str
    summary: str = Field(description="Factor-by-factor rationale, but TERSE: max ~120 words total, short bullet-style sentences, no headers or markdown sections — this is a cost-sensitive app, not a report.")
