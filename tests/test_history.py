import history


def entry(owner, a="AAA", b="BBB", winner="AAA"):
    return {"id": owner + a, "owner": owner, "ticker_A": a, "ticker_B": b, "winner": winner}


def test_search_finds_by_ticker_or_winner(tmp_path, monkeypatch):
    monkeypatch.setattr(history, "HISTORY_FILE", tmp_path / "h.json")
    import json
    (tmp_path / "h.json").write_text(json.dumps([entry("x", "NVDA", "AMD", "NVDA"), entry("x", "MSFT", "AAPL", "AAPL")]))
    assert len(history.search_history("amd")) == 1
    assert len(history.search_history("")) == 2
    assert history.search_history("zzz") == []


def test_missing_or_broken_file_gives_empty_history(tmp_path, monkeypatch):
    monkeypatch.setattr(history, "HISTORY_FILE", tmp_path / "h.json")
    assert history.load_history() == []
    (tmp_path / "h.json").write_text("not json")
    assert history.load_history() == []


def test_get_debate_by_id(tmp_path, monkeypatch):
    import json
    monkeypatch.setattr(history, "HISTORY_FILE", tmp_path / "h.json")
    (tmp_path / "h.json").write_text(json.dumps([entry("x")]))
    assert history.get_debate_by_id("xAAA")["owner"] == "x"
    assert history.get_debate_by_id("nope") is None
