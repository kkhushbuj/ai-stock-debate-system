"""Save and load debate history to a local JSON file."""

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from factors import FACTORS

HISTORY_FILE = Path(__file__).parent / "data" / "history.json"


def _ensure_dir():
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not HISTORY_FILE.exists():
        HISTORY_FILE.write_text("[]", encoding="utf-8")


def save_debate(result: dict, elapsed: int = 0, owner: str | None = None):
    _ensure_dir()
    v = result["final_verdict"]
    scores = result["round1_scores"]
    fc = result["factcheck_results"]

    sa = {fs.factor: fs.score_A for fs in scores.factor_scores}
    sb = {fs.factor: fs.score_B for fs in scores.factor_scores}

    factor_detail = []
    for f in FACTORS:
        fid = f["id"]
        factor_detail.append({
            "id": fid,
            "name": f["name"],
            "weight": f["weight"],
            "score_A": sa.get(fid, 5.0),
            "score_B": sb.get(fid, 5.0),
        })

    verified_a = sum(1 for c in fc.claims_A if c.verdict == "verified")
    verified_b = sum(1 for c in fc.claims_B if c.verdict == "verified")
    false_a = sum(1 for c in fc.claims_A if c.verdict == "false")
    false_b = sum(1 for c in fc.claims_B if c.verdict == "false")

    entry = {
        "id": uuid.uuid4().hex[:12],
        "owner": owner,
        "chat_history": [],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ticker_A": v.ticker_A,
        "ticker_B": v.ticker_B,
        "winner": v.winner,
        "total_score_A": round(v.total_score_A, 2),
        "total_score_B": round(v.total_score_B, 2),
        "confidence_A_pct": v.confidence_A_pct,
        "confidence_B_pct": v.confidence_B_pct,
        "summary": v.summary,
        "factors": factor_detail,
        "claims_A": len(fc.claims_A),
        "claims_B": len(fc.claims_B),
        "verified_A": verified_a,
        "verified_B": verified_b,
        "false_A": false_a,
        "false_B": false_b,
        "factcheck_unavailable": fc.unavailable,
        "elapsed_seconds": elapsed,
    }

    history = load_history()
    history.insert(0, entry)
    HISTORY_FILE.write_text(json.dumps(history, indent=2), encoding="utf-8")
    return entry


def load_history() -> list[dict]:
    _ensure_dir()
    try:
        data = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def search_history(query: str) -> list[dict]:
    q = query.strip().upper()
    if not q:
        return load_history()
    return [
        e for e in load_history()
        if q in e.get("ticker_A", "") or q in e.get("ticker_B", "") or q in e.get("winner", "")
    ]


def update_chat(debate_id: str, chat_history: list[dict]):
    _ensure_dir()
    history = load_history()
    for entry in history:
        if entry.get("id") == debate_id:
            entry["chat_history"] = chat_history
            break
    HISTORY_FILE.write_text(json.dumps(history, indent=2), encoding="utf-8")


def get_debate_by_id(debate_id: str) -> dict | None:
    for entry in load_history():
        if entry.get("id") == debate_id:
            return entry
    return None
