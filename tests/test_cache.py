import cache


def test_second_call_uses_the_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(cache, "CACHE_DIR", str(tmp_path))
    calls = []

    def fetch():
        calls.append(1)
        return {"pe": 30}

    assert cache.cached_fetch("t.pe", "NVDA", fetch, ttl_seconds=60) == {"pe": 30}
    assert cache.cached_fetch("t.pe", "NVDA", fetch, ttl_seconds=60) == {"pe": 30}
    assert len(calls) == 1


def test_expired_entry_is_fetched_again(tmp_path, monkeypatch):
    monkeypatch.setattr(cache, "CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(cache, "FREEZE_DATA_FOR_BACKTEST", False)
    calls = []
    cache.cached_fetch("t.x", "k", lambda: calls.append(1) or 1, ttl_seconds=0)
    cache.cached_fetch("t.x", "k", lambda: calls.append(1) or 1, ttl_seconds=0)
    assert len(calls) == 2


def test_backtest_freeze_ignores_expiry(tmp_path, monkeypatch):
    monkeypatch.setattr(cache, "CACHE_DIR", str(tmp_path))
    monkeypatch.setattr(cache, "FREEZE_DATA_FOR_BACKTEST", True)
    calls = []
    cache.cached_fetch("t.x", "k", lambda: calls.append(1) or 1, ttl_seconds=0)
    cache.cached_fetch("t.x", "k", lambda: calls.append(1) or 1, ttl_seconds=0)
    assert len(calls) == 1


def test_corrupt_cache_file_is_refetched(tmp_path, monkeypatch):
    monkeypatch.setattr(cache, "CACHE_DIR", str(tmp_path))
    cache.cached_fetch("t.x", "k", lambda: 1, ttl_seconds=60)
    for f in tmp_path.iterdir():
        f.write_text("{ not json", encoding="utf-8")
    assert cache.cached_fetch("t.x", "k", lambda: 2, ttl_seconds=60) == 2
