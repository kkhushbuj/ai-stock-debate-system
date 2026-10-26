"""
Backtest 1 — Consistency check.

Runs the SAME stock-pair debate N times with all live data frozen after
its first fetch (including News Sentiment, per the project's testing
rule), logging each verdict. Low variance across runs = stable,
trustworthy reasoning. High variance = a reportable reliability weakness,
since none of it can be blamed on the market moving mid-test.

Usage:
    python -m backtests.consistency_check NVDA AMD --runs 5
"""

import os

os.environ["FREEZE_DATA_FOR_BACKTEST"] = "true"

import argparse
import json
import time
from pathlib import Path
from statistics import mean, pstdev

from graph import run_debate

OUTPUT_DIR = Path(__file__).parent / "results"
OUTPUT_DIR.mkdir(exist_ok=True)


def run(ticker_A: str, ticker_B: str, n_runs: int = 5) -> dict:
    runs = []
    failures = []
    for i in range(n_runs):
        print(f"Run {i + 1}/{n_runs}: {ticker_A} vs {ticker_B}...")
        try:
            state = run_debate(ticker_A, ticker_B)
            v = state["final_verdict"]
        except Exception as e:
            # One bad generation (e.g. a small model looping on a field
            # until it runs out of output budget) shouldn't lose every
            # other run's data — log it and keep going.
            print(f"  FAILED: {e}")
            failures.append({"run": i + 1, "error": str(e)})
            continue
        runs.append({
            "run": i + 1,
            "winner": v.winner,
            "total_score_A": v.total_score_A,
            "total_score_B": v.total_score_B,
            "confidence_A_pct": v.confidence_A_pct,
            "confidence_B_pct": v.confidence_B_pct,
        })

    if not runs:
        print("\nAll runs failed — nothing to summarize.")
        return {"ticker_A": ticker_A, "ticker_B": ticker_B, "n_runs": n_runs, "runs": [], "failures": failures}

    winners = [r["winner"] for r in runs]
    modal_winner = max(set(winners), key=winners.count)
    conf_A_values = [r["confidence_A_pct"] for r in runs]

    summary = {
        "ticker_A": ticker_A,
        "ticker_B": ticker_B,
        "n_runs": n_runs,
        "n_succeeded": len(runs),
        "runs": runs,
        "failures": failures,
        "modal_winner": modal_winner,
        "winner_agreement_pct": round(winners.count(modal_winner) / len(runs) * 100, 1),
        "confidence_A_mean": round(mean(conf_A_values), 2),
        "confidence_A_stdev": round(pstdev(conf_A_values), 2) if len(runs) > 1 else 0.0,
    }

    out_path = OUTPUT_DIR / f"consistency_{ticker_A}_vs_{ticker_B}_{int(time.time())}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\nSaved to {out_path}")
    if failures:
        print(f"({len(failures)}/{n_runs} runs failed and were excluded — see 'failures' in the output file)")
    print(f"Winner agreement: {summary['winner_agreement_pct']}% (of {len(runs)} successful runs) | "
          f"Confidence-A stdev: {summary['confidence_A_stdev']} pts")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the same debate N times on frozen data and measure verdict variance.")
    parser.add_argument("ticker_A")
    parser.add_argument("ticker_B")
    parser.add_argument("--runs", type=int, default=5)
    args = parser.parse_args()
    run(args.ticker_A, args.ticker_B, args.runs)
