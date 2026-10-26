"""
Backtest 2 — Fair-fight (model-bias) check.

For each stock pair, runs the debate twice with data frozen: once with
DEBATER_A_MODEL arguing Stock A / DEBATER_B_MODEL arguing Stock B, once
flipped. If the same STOCK keeps winning regardless of which model
argues it, the system is fair. If the same MODEL keeps winning
regardless of which stock it argues, that's a reportable model bias.

Usage:
    python -m backtests.fair_fight_check
    python -m backtests.fair_fight_check --pairs NVDA:AMD MSFT:GOOGL
"""

import os

os.environ["FREEZE_DATA_FOR_BACKTEST"] = "true"

import argparse
import json
import time
from pathlib import Path

import config
from graph import run_debate

OUTPUT_DIR = Path(__file__).parent / "results"
OUTPUT_DIR.mkdir(exist_ok=True)

DEFAULT_PAIRS = [
    ("NVDA", "AMD"), ("MSFT", "GOOGL"), ("AAPL", "MSFT"),
    ("TSLA", "F"), ("META", "SNAP"),
]


def run(pairs=None) -> dict:
    pairs = pairs or DEFAULT_PAIRS
    model_A, model_B = config.DEBATER_A_MODEL, config.DEBATER_B_MODEL
    results = []
    failures = []

    try:
        for ticker_A, ticker_B in pairs:
            print(f"\n=== {ticker_A} vs {ticker_B} ===")

            config.DEBATER_A_MODEL, config.DEBATER_B_MODEL = model_A, model_B
            print(f"Straight: {model_A} argues {ticker_A}, {model_B} argues {ticker_B}")
            try:
                v1 = run_debate(ticker_A, ticker_B)["final_verdict"]
            except Exception as e:
                print(f"  FAILED (straight): {e}")
                failures.append({"ticker_A": ticker_A, "ticker_B": ticker_B, "direction": "straight", "error": str(e)})
                continue

            config.DEBATER_A_MODEL, config.DEBATER_B_MODEL = model_B, model_A
            print(f"Flipped:  {model_B} argues {ticker_A}, {model_A} argues {ticker_B}")
            try:
                v2 = run_debate(ticker_A, ticker_B)["final_verdict"]
            except Exception as e:
                # A bad generation (e.g. a small model looping on a field
                # until it runs out of output budget) shouldn't lose every
                # other pair's data — log it and keep going, instead of an
                # uncaught exception killing the whole backtest.
                print(f"  FAILED (flipped): {e}")
                failures.append({"ticker_A": ticker_A, "ticker_B": ticker_B, "direction": "flipped", "error": str(e)})
                continue

            results.append({
                "ticker_A": ticker_A,
                "ticker_B": ticker_B,
                "straight": {
                    "model_on_A": model_A, "model_on_B": model_B,
                    "winner": v1.winner, "confidence_A_pct": v1.confidence_A_pct, "confidence_B_pct": v1.confidence_B_pct,
                },
                "flipped": {
                    "model_on_A": model_B, "model_on_B": model_A,
                    "winner": v2.winner, "confidence_A_pct": v2.confidence_A_pct, "confidence_B_pct": v2.confidence_B_pct,
                },
                "stock_winner_consistent": v1.winner == v2.winner,
            })
    finally:
        # Always restore the real defaults, even if the loop broke partway
        # through with the models still swapped to "flipped".
        config.DEBATER_A_MODEL, config.DEBATER_B_MODEL = model_A, model_B

    n_consistent = sum(r["stock_winner_consistent"] for r in results)
    summary = {
        "debater_models": {"model_A_default": model_A, "model_B_default": model_B},
        "pairs_tested": len(results),
        "pairs_failed": len(failures),
        "failures": failures,
        "stock_winner_consistent_pct": round(n_consistent / len(results) * 100, 1) if results else None,
        "results": results,
    }

    out_path = OUTPUT_DIR / f"fair_fight_{int(time.time())}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\nSaved to {out_path}")
    if failures:
        print(f"({len(failures)} pair-direction(s) failed and were excluded — see 'failures' in the output file)")
    print(f"Stock winner consistent across model-flip: {summary['stock_winner_consistent_pct']}% (of {len(results)} completed pairs)")
    print("(Low % here means the debater's MODEL is driving outcomes more than the stock's actual merits.)")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run each pair with debater models straight and flipped to detect model bias.")
    parser.add_argument("--pairs", nargs="*", help="e.g. NVDA:AMD MSFT:GOOGL — defaults to a built-in 5-pair set")
    args = parser.parse_args()
    pairs = [tuple(p.split(":")) for p in args.pairs] if args.pairs else None
    run(pairs)
