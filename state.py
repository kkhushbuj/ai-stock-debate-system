from typing import Optional, TypedDict

from schemas import DebaterArgument, FactCheckResult, FinalVerdict, RoundScore


class DebateState(TypedDict, total=False):
    ticker_A: str
    ticker_B: str

    round1_A: DebaterArgument
    round1_B: DebaterArgument
    round2_A: DebaterArgument
    round2_B: DebaterArgument

    factcheck_results: FactCheckResult
    ground_truth_A: dict
    ground_truth_B: dict
    round1_scores: RoundScore
    round2_scores: RoundScore
    final_verdict: FinalVerdict


def initial_state(ticker_A: str, ticker_B: str) -> DebateState:
    return DebateState(ticker_A=ticker_A.upper(), ticker_B=ticker_B.upper())
