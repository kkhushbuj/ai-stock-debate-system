"""Tavily-backed live news search tool."""

import json

from langchain_core.tools import tool
from tavily import TavilyClient

from cache import cached_fetch
from config import TAVILY_API_KEY

_client = None


def _get_client() -> TavilyClient:
    global _client
    if _client is None:
        if not TAVILY_API_KEY:
            raise RuntimeError("TAVILY_API_KEY is not set in .env")
        _client = TavilyClient(api_key=TAVILY_API_KEY)
    return _client


@tool
def search_news(query: str) -> str:
    """Search live news and web results for a query, e.g. 'NVDA Q2 2026
    earnings guidance' or 'AMD insider selling August 2026'. Returns
    recent article titles, snippets, sources, and URLs. Use this for News
    Sentiment, Earnings Guidance context, and to fact-check any claim that
    yfinance/FRED don't directly cover."""

    def _fetch():
        client = _get_client()
        resp = client.search(query=query, search_depth="advanced", max_results=6, topic="news")
        results = [
            {
                "title": r.get("title"),
                "url": r.get("url"),
                "content": r.get("content"),
                "published_date": r.get("published_date"),
                "score": r.get("score"),
            }
            for r in resp.get("results", [])
        ]
        return {"query": query, "results": results}

    result = cached_fetch("tavily.search", query.strip().lower(), _fetch, factor_id="news_sentiment")
    return json.dumps(result)
