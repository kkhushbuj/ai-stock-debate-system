"""yfinance-backed tools. No API key required."""

import json

import yfinance as yf
from langchain_core.tools import tool

from cache import cached_fetch


def _ticker_key(ticker: str, suffix: str) -> str:
    return f"{ticker.upper()}:{suffix}"


@tool
def get_valuation_snapshot(ticker: str) -> str:
    """Get current valuation data for a stock ticker: trailing & forward P/E,
    market cap, beta, current price, and 52-week high/low. Use this for the
    P/E Ratio, Market Cap, and Beta factors."""

    def _fetch():
        info = yf.Ticker(ticker).info
        return {
            "ticker": ticker.upper(),
            "trailing_pe": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "market_cap": info.get("marketCap"),
            "beta": info.get("beta"),
            "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
        }

    result = cached_fetch("yfinance.valuation", _ticker_key(ticker, "valuation"), _fetch, factor_id="pe_ratio")
    return json.dumps(result)


@tool
def get_insider_transactions(ticker: str) -> str:
    """Get recent insider buy/sell transactions for a stock ticker (last
    reported trades: insider name, transaction type, shares, value). Use
    this for the Insider Selling factor."""

    def _fetch():
        tx = yf.Ticker(ticker).insider_transactions
        if tx is None or tx.empty:
            return {"ticker": ticker.upper(), "transactions": []}
        recent = tx.head(15).to_dict(orient="records")
        return {"ticker": ticker.upper(), "transactions": recent}

    result = cached_fetch("yfinance.insider", _ticker_key(ticker, "insider"), _fetch, factor_id="insider_selling")
    return json.dumps(result, default=str)


@tool
def get_analyst_ratings(ticker: str) -> str:
    """Get Wall Street analyst ratings for a stock ticker: buy/hold/sell
    counts and mean price target. Use this for the Analyst Ratings factor."""

    def _fetch():
        t = yf.Ticker(ticker)
        info = t.info
        rec = t.recommendations
        rec_summary = rec.tail(1).to_dict(orient="records") if rec is not None and not rec.empty else []
        return {
            "ticker": ticker.upper(),
            "recommendation_key": info.get("recommendationKey"),
            "recommendation_mean": info.get("recommendationMean"),
            "number_of_analysts": info.get("numberOfAnalystOpinions"),
            "target_mean_price": info.get("targetMeanPrice"),
            "target_high_price": info.get("targetHighPrice"),
            "target_low_price": info.get("targetLowPrice"),
            "latest_recommendation_counts": rec_summary,
        }

    result = cached_fetch("yfinance.analyst", _ticker_key(ticker, "analyst"), _fetch, factor_id="analyst_ratings")
    return json.dumps(result, default=str)


@tool
def get_technical_signal(ticker: str) -> str:
    """Get technical indicators for a stock ticker: 50-day and 200-day
    simple moving averages, current price relative to each, and 14-day RSI.
    Use this for the Technical Signal factor."""

    def _fetch():
        hist = yf.Ticker(ticker).history(period="1y")
        if hist.empty:
            return {"ticker": ticker.upper(), "error": "no price history available"}
        close = hist["Close"]
        sma50 = close.rolling(50).mean().iloc[-1]
        sma200 = close.rolling(200).mean().iloc[-1] if len(close) >= 200 else None
        current = close.iloc[-1]

        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean().iloc[-1]
        loss = (-delta.clip(upper=0)).rolling(14).mean().iloc[-1]
        rsi = 100.0 if loss == 0 else 100 - (100 / (1 + gain / loss))

        return {
            "ticker": ticker.upper(),
            "current_price": round(float(current), 2),
            "sma_50": round(float(sma50), 2) if sma50 == sma50 else None,
            "sma_200": round(float(sma200), 2) if sma200 is not None and sma200 == sma200 else None,
            "golden_cross": bool(sma200 is not None and sma50 == sma50 and sma200 == sma200 and sma50 > sma200),
            "rsi_14": round(float(rsi), 2) if rsi == rsi else None,
        }

    result = cached_fetch("yfinance.technical", _ticker_key(ticker, "technical"), _fetch, factor_id="technical_signal")
    return json.dumps(result)


@tool
def get_sector_rally(ticker: str) -> str:
    """Get the stock's sector classification and how its sector ETF has
    performed vs the S&P 500 (SPY) over the last 1 and 3 months. Use this
    for the Sector Rally factor."""

    _SECTOR_ETF = {
        "Technology": "XLK", "Financial Services": "XLF", "Healthcare": "XLV",
        "Consumer Cyclical": "XLY", "Consumer Defensive": "XLP", "Energy": "XLE",
        "Industrials": "XLI", "Basic Materials": "XLB", "Real Estate": "XLRE",
        "Utilities": "XLU", "Communication Services": "XLC",
    }

    def _pct_change(hist, days):
        if len(hist) < days + 1:
            return None
        return round(float((hist["Close"].iloc[-1] / hist["Close"].iloc[-days - 1] - 1) * 100), 2)

    def _fetch():
        info = yf.Ticker(ticker).info
        sector = info.get("sector")
        etf_symbol = _SECTOR_ETF.get(sector)

        spy_hist = yf.Ticker("SPY").history(period="4mo")
        spy_1mo = _pct_change(spy_hist, 21)
        spy_3mo = _pct_change(spy_hist, 63)

        sector_1mo = sector_3mo = None
        if etf_symbol:
            etf_hist = yf.Ticker(etf_symbol).history(period="4mo")
            sector_1mo = _pct_change(etf_hist, 21)
            sector_3mo = _pct_change(etf_hist, 63)

        return {
            "ticker": ticker.upper(),
            "sector": sector,
            "sector_etf": etf_symbol,
            "sector_1mo_pct": sector_1mo,
            "sector_3mo_pct": sector_3mo,
            "spy_1mo_pct": spy_1mo,
            "spy_3mo_pct": spy_3mo,
        }

    result = cached_fetch("yfinance.sector_rally", _ticker_key(ticker, "sector_rally"), _fetch, factor_id="sector_rally")
    return json.dumps(result)


@tool
def get_earnings_guidance(ticker: str) -> str:
    """Get forward earnings guidance for a stock ticker: EPS growth
    estimate, revenue growth estimate, and next earnings date. Use this
    for the Earnings Guidance factor."""

    def _fetch():
        info = yf.Ticker(ticker).info
        return {
            "ticker": ticker.upper(),
            "earnings_growth": info.get("earningsGrowth"),
            "revenue_growth": info.get("revenueGrowth"),
            "earnings_quarterly_growth": info.get("earningsQuarterlyGrowth"),
            "next_earnings_date": str(info.get("earningsTimestamp") or ""),
            "eps_forward": info.get("forwardEps"),
            "eps_trailing": info.get("trailingEps"),
        }

    result = cached_fetch("yfinance.guidance", _ticker_key(ticker, "guidance"), _fetch, factor_id="earnings_guidance")
    return json.dumps(result)


_CHART_PERIODS = {
    # label -> (yfinance period, yfinance interval, cache TTL seconds)
    "1D": ("1d", "5m", 5 * 60),
    "1W": ("5d", "15m", 15 * 60),
    "1M": ("1mo", "1d", 3600),
    "1Y": ("1y", "1d", 24 * 3600),
}


def get_price_history(ticker: str, period_label: str = "1M") -> dict:
    """Closing price history for charting in the UI, for one of the four
    ranges in _CHART_PERIODS. 1D/1W use intraday intervals (5m/15m) so the
    chart actually shows movement within the day/week instead of a
    handful of daily dots; 1M/1Y use daily closes.

    Deliberately NOT an @tool — this is for the price chart
    only, never fed to a debater/judge prompt. Making it an LLM tool would
    mean a full season of closes landing in every prompt that calls it,
    which is expensive for zero benefit (debaters already get the
    computed technical stats — SMA/RSI/golden cross — from
    get_technical_signal; they don't need the raw series)."""
    period, interval, ttl_seconds = _CHART_PERIODS.get(period_label, _CHART_PERIODS["1M"])

    def _fetch():
        hist = yf.Ticker(ticker).history(period=period, interval=interval)
        # The most recent row can be an in-progress session with no close
        # yet (NaN) — e.g. fetched mid-day before the market closes, or
        # mid-bar for intraday intervals. Drop incomplete rows rather than
        # let a NaN slip into "latest price" downstream.
        closes = hist["Close"].dropna()
        if closes.empty:
            return {"ticker": ticker.upper(), "dates": [], "close": []}
        is_intraday = interval.endswith("m") or interval.endswith("h")
        return {
            "ticker": ticker.upper(),
            "dates": [str(d) if is_intraday else str(d.date()) for d in closes.index],
            "close": [round(float(c), 2) for c in closes],
        }

    return cached_fetch(
        "yfinance.price_history", _ticker_key(ticker, f"price_history_{period_label}"), _fetch, ttl_seconds=ttl_seconds
    )
