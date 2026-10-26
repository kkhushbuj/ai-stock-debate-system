"""
File-based cache with per-factor TTL tiers.

Two modes:
  - Normal mode: each factor's cached value expires per its cache_tier
    (see factors.py) and is re-fetched live once stale.
  - Backtest freeze mode (FREEZE_DATA_FOR_BACKTEST=true): TTLs are ignored.
    The first call for a given key fetches and persists; every call after
    that for the rest of the session reuses the same cached value, even
    for News Sentiment. This isolates "did the reasoning change" from
    "did the market move mid-test".
"""

import hashlib
import json
import os
import threading
import time

from config import CACHE_DIR, FREEZE_DATA_FOR_BACKTEST
from factors import cache_tier_for

_TIER_SECONDS = {
    "2d": 2 * 24 * 3600,
    "24h": 24 * 3600,
    "2h": 2 * 3600,
}


def _cache_path(namespace: str, key: str) -> str:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]
    safe_ns = "".join(c if c.isalnum() else "_" for c in namespace)
    return os.path.join(CACHE_DIR, f"{safe_ns}__{digest}.json")


def cached_fetch(namespace: str, key: str, fetch_fn, factor_id: str = None, ttl_seconds: int = None):
    """
    namespace: logical bucket, e.g. "yfinance.pe_ratio" or "tavily.news"
    key: uniquely identifies this specific call, e.g. ticker or search query
    fetch_fn: zero-arg callable that performs the live fetch and returns
              a JSON-serializable value
    factor_id: if given, TTL is looked up from factors.py's cache_tier
    ttl_seconds: explicit override; takes precedence over factor_id
    """
    path = _cache_path(namespace, key)

    if ttl_seconds is None:
        if factor_id is not None:
            ttl_seconds = _TIER_SECONDS[cache_tier_for(factor_id)]
        else:
            ttl_seconds = _TIER_SECONDS["24h"]

    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                entry = json.load(f)
            age = time.time() - entry["fetched_at"]
            if FREEZE_DATA_FOR_BACKTEST or age < ttl_seconds:
                return entry["value"]
        except (json.JSONDecodeError, KeyError, OSError):
            pass  # half-written or corrupt cache file: just re-fetch

    value = fetch_fn()
    entry = {"fetched_at": time.time(), "namespace": namespace, "key": key, "value": value}
    tmp = f"{path}.{os.getpid()}.{threading.get_ident()}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(entry, f, indent=2, default=str)
    os.replace(tmp, path)  # atomic: readers never see a half-written file
    return value


def clear_cache():
    """Wipe all cached entries. Not used by the live app; handy between backtest sessions."""
    for fname in os.listdir(CACHE_DIR):
        if fname.endswith(".json"):
            os.remove(os.path.join(CACHE_DIR, fname))
