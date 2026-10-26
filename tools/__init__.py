import concurrent.futures
import json

from tools.yfinance_tool import (
    get_valuation_snapshot,
    get_insider_transactions,
    get_analyst_ratings,
    get_technical_signal,
    get_sector_rally,
    get_earnings_guidance,
    get_price_history,
)
from tools.tavily_tool import search_news
from tools.fred_tool import get_fed_funds_rate

ALL_TOOLS = [
    get_valuation_snapshot,
    get_insider_transactions,
    get_analyst_ratings,
    get_technical_signal,
    get_sector_rally,
    get_earnings_guidance,
    search_news,
    get_fed_funds_rate,
]

_TICKER_TOOLS = [
    get_valuation_snapshot,
    get_insider_transactions,
    get_analyst_ratings,
    get_technical_signal,
    get_sector_rally,
    get_earnings_guidance,
]


def parallel_fetch(calls: list[tuple]) -> dict:
    """Run several tool calls concurrently instead of sequentially.

    calls: list of (key, tool, args_dict). Returns {key: parsed_result},
    with a per-call error captured as {"error": ...} instead of raising,
    so one flaky provider doesn't sink the whole batch. Network-bound I/O
    like this is exactly what Python threads are good at even under the
    GIL, since each call is mostly spent waiting on a response.
    """
    if not calls:
        return {}

    def _run(key, tool_fn, args):
        try:
            return key, json.loads(tool_fn.invoke(args))
        except Exception as e:
            return key, {"error": str(e)}

    data = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(calls)) as ex:
        futures = [ex.submit(_run, k, t, a) for k, t, a in calls]
        for f in concurrent.futures.as_completed(futures):
            key, result = f.result()
            data[key] = result
    return data


def prefetch_all_factors(ticker: str) -> dict:
    """Fetch live data for every factor on one ticker, all at once.

    Used to front-load a debater/judge prompt with everything it needs in
    a single fast parallel batch, instead of a slow sequential
    agentic tool-calling loop where the model decides one tool call at a
    time and waits on each round-trip.
    """
    calls = [(t.name, t, {"ticker": ticker}) for t in _TICKER_TOOLS]
    calls.append(("search_news", search_news, {"query": f"{ticker} stock news"}))
    calls.append(("get_fed_funds_rate", get_fed_funds_rate, {"_": "current"}))
    return parallel_fetch(calls)
