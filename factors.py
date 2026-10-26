"""
The 10 locked, weighted factors used by the judge to score every round.
Weights sum to 1.0. Scoring is always done deterministically in Python
(judge_scoring.py) from LLM-produced per-factor sub-scores (0-10) — the
LLM never outputs the final blended number itself.
"""

FACTORS = [
    {"id": "earnings_guidance", "category": "Fundamental", "name": "Earnings Guidance", "weight": 0.15, "cache_tier": "2d"},
    {"id": "pe_ratio", "category": "Fundamental", "name": "P/E Ratio", "weight": 0.12, "cache_tier": "24h"},
    {"id": "analyst_ratings", "category": "Market Intelligence", "name": "Analyst Ratings", "weight": 0.12, "cache_tier": "24h"},
    {"id": "insider_selling", "category": "Fundamental", "name": "Insider Selling", "weight": 0.10, "cache_tier": "2d"},
    {"id": "technical_signal", "category": "Market Intelligence", "name": "Technical Signal", "weight": 0.10, "cache_tier": "24h"},
    {"id": "fed_rate", "category": "Macro", "name": "Fed Rate", "weight": 0.09, "cache_tier": "24h"},
    {"id": "market_cap", "category": "Fundamental", "name": "Market Cap", "weight": 0.08, "cache_tier": "2d"},
    {"id": "sector_rally", "category": "Market Intelligence", "name": "Sector Rally", "weight": 0.08, "cache_tier": "24h"},
    {"id": "news_sentiment", "category": "External", "name": "News Sentiment", "weight": 0.08, "cache_tier": "2h"},
    {"id": "beta", "category": "Macro", "name": "Beta", "weight": 0.08, "cache_tier": "24h"},
]

FACTOR_WEIGHTS = {f["id"]: f["weight"] for f in FACTORS}
FACTOR_IDS = [f["id"] for f in FACTORS]

assert abs(sum(FACTOR_WEIGHTS.values()) - 1.0) < 1e-9, "Factor weights must sum to 1.0"


def blended_score(factor_scores: dict) -> float:
    """
    factor_scores: {factor_id: sub_score_0_to_10}
    Returns a single 0-10 weighted score. Missing factors are treated as
    a neutral 5.0 rather than silently dropped, so an incomplete judge
    response doesn't accidentally inflate/deflate the total.
    """
    total = 0.0
    for fid, weight in FACTOR_WEIGHTS.items():
        score = factor_scores.get(fid, 5.0)
        total += score * weight
    return round(total, 3)


def cache_tier_for(factor_id: str) -> str:
    for f in FACTORS:
        if f["id"] == factor_id:
            return f["cache_tier"]
    raise KeyError(f"Unknown factor id: {factor_id}")
