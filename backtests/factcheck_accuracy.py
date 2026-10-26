"""
Backtest 3 — Fact-check accuracy (lie-detector) check.

Logs every claim either debater made, plus the judge's verified /
unverified / false tag, to JSON. You then manually spot-check a sample
(~30-50 claims) against real numbers and fill in "manual_verdict" for
each, and this script computes how accurately the judge's tags matched
your manual ground truth — same evaluation style as the Hallucination
Detector project's accuracy stat.

Usage:
    # Step 1: run debates and collect claims + judge verdicts
    python -m backtests.factcheck_accuracy collect --pairs NVDA:AMD MSFT:GOOGL

    # Step 2: open the resulting JSON, fill in "manual_verdict" for a
    # sample of entries (true/false/null=skip), then:
    python -m backtests.factcheck_accuracy score results/factcheck_claims_<ts>.json
"""

import os

os.environ["FREEZE_DATA_FOR_BACKTEST"] = "true"

import argparse
import json
import time
from pathlib import Path

from graph import run_debate

OUTPUT_DIR = Path(__file__).parent / "results"
OUTPUT_DIR.mkdir(exist_ok=True)

DEFAULT_PAIRS = [("NVDA", "AMD"), ("MSFT", "GOOGL"), ("TSLA", "F")]


def collect(pairs=None) -> Path:
    pairs = pairs or DEFAULT_PAIRS
    entries = []
    failures = []

    for ticker_A, ticker_B in pairs:
        print(f"\n=== {ticker_A} vs {ticker_B} ===")
        try:
            state = run_debate(ticker_A, ticker_B)
        except Exception as e:
            # One bad generation (e.g. a small model looping on a field
            # until it runs out of output budget) shouldn't lose every
            # other pair's claims — log it and keep going.
            print(f"  FAILED: {e}")
            failures.append({"ticker_A": ticker_A, "ticker_B": ticker_B, "error": str(e)})
            continue
        fc = state["factcheck_results"]

        for v in fc.claims_A:
            entries.append({
                "pair": f"{ticker_A}_vs_{ticker_B}",
                "ticker": ticker_A,
                "factor": v.factor,
                "statement": v.original_statement,
                "cited_value": v.original_cited_value,
                "judge_verdict": v.verdict,
                "judge_actual_value": v.actual_value,
                "judge_explanation": v.explanation,
                "manual_verdict": None,  # fill with true/false after your own spot-check; leave null to skip
            })
        for v in fc.claims_B:
            entries.append({
                "pair": f"{ticker_A}_vs_{ticker_B}",
                "ticker": ticker_B,
                "factor": v.factor,
                "statement": v.original_statement,
                "cited_value": v.original_cited_value,
                "judge_verdict": v.verdict,
                "judge_actual_value": v.actual_value,
                "judge_explanation": v.explanation,
                "manual_verdict": None,
            })

    out_path = OUTPUT_DIR / f"factcheck_claims_{int(time.time())}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"total_claims": len(entries), "claims": entries, "failed_pairs": failures}, f, indent=2)

    n_ok = len(pairs) - len(failures)
    print(f"\nCollected {len(entries)} claims across {n_ok}/{len(pairs)} debate(s).")
    if failures:
        print(f"({len(failures)} pair(s) failed and were skipped — see 'failed_pairs' in the output file)")
    print(f"Saved to {out_path}")
    print("Next: open this file, spot-check ~30-50 claims against real data, "
          "set manual_verdict to true (judge's real/false verdict was correct) "
          "or false (judge got it wrong), then run the 'score' command on this file.")
    return out_path


def score(json_path: str):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    checked = [c for c in data["claims"] if c["manual_verdict"] is not None]
    if not checked:
        print("No claims have a manual_verdict filled in yet — nothing to score.")
        return

    correct = sum(1 for c in checked if c["manual_verdict"] is True)
    accuracy = round(correct / len(checked) * 100, 1)

    by_verdict = {}
    for c in checked:
        bucket = by_verdict.setdefault(c["judge_verdict"], {"n": 0, "correct": 0})
        bucket["n"] += 1
        bucket["correct"] += 1 if c["manual_verdict"] is True else 0

    print(f"Manually spot-checked: {len(checked)} / {data['total_claims']} claims")
    print(f"Overall judge accuracy on spot-checked sample: {accuracy}%")
    for verdict, stats in by_verdict.items():
        pct = round(stats["correct"] / stats["n"] * 100, 1) if stats["n"] else 0.0
        print(f"  {verdict}: {stats['correct']}/{stats['n']} correct ({pct}%)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Collect debate claims + judge verdicts, or score judge accuracy against manual spot-checks.")
    sub = parser.add_subparsers(dest="command", required=True)

    collect_p = sub.add_parser("collect")
    collect_p.add_argument("--pairs", nargs="*", help="e.g. NVDA:AMD MSFT:GOOGL — defaults to a built-in 3-pair set")

    score_p = sub.add_parser("score")
    score_p.add_argument("json_path")

    args = parser.parse_args()
    if args.command == "collect":
        pairs = [tuple(p.split(":")) for p in args.pairs] if args.pairs else None
        collect(pairs)
    elif args.command == "score":
        score(args.json_path)
