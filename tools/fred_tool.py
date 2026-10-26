"""FRED-backed macro data tool (Fed Funds Rate)."""

import json

from fredapi import Fred
from langchain_core.tools import tool

from cache import cached_fetch
from config import FRED_API_KEY

_client = None


def _get_client() -> Fred:
    global _client
    if _client is None:
        if not FRED_API_KEY:
            raise RuntimeError("FRED_API_KEY is not set in .env")
        _client = Fred(api_key=FRED_API_KEY)
    return _client


@tool
def get_fed_funds_rate(_: str = "current") -> str:
    """Get the current effective Federal Funds Rate and its trend over the
    last 6 months. Sector/ticker-agnostic — call this once per debate, not
    per ticker. Use this for the Fed Rate factor."""

    def _fetch():
        client = _get_client()
        series = client.get_series("FEDFUNDS").dropna()
        latest = series.iloc[-5:]
        return {
            "series": "FEDFUNDS",
            "latest_rate_pct": float(series.iloc[-1]),
            "latest_date": str(series.index[-1].date()),
            "trailing_5_readings": [
                {"date": str(idx.date()), "rate_pct": float(val)} for idx, val in latest.items()
            ],
            "trend": "rising" if series.iloc[-1] > series.iloc[-5] else (
                "falling" if series.iloc[-1] < series.iloc[-5] else "flat"
            ),
        }

    result = cached_fetch("fred.fed_funds_rate", "FEDFUNDS", _fetch, factor_id="fed_rate")
    return json.dumps(result)
