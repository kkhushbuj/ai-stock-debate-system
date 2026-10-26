"""The winner, totals and confidence split are plain Python. The summary text comes from the LLM, so it is faked here."""
import pytest

import agents.judge as judge
from factors import FACTOR_IDS
from schemas import FactorScore, RoundScore


class FakeLLM:
    def invoke(self, prompt):
        class Reply:
            text = "summary"
        return Reply()


def round_score(n, a, b):
    return RoundScore(
        round=n, ticker_A="AAA", ticker_B="BBB",
        factor_scores=[FactorScore(factor=f, score_A=a, score_B=b, reasoning="x") for f in FACTOR_IDS],
    )


def verdict(a1, b1, a2, b2, monkeypatch):
    monkeypatch.setattr(judge, "get_judge_llm", lambda *a, **k: FakeLLM())
    state = {"ticker_A": "AAA", "ticker_B": "BBB", "round1_scores": round_score(1, a1, b1), "round2_scores": round_score(2, a2, b2)}
    return judge.final_verdict_node(state)["final_verdict"]


def test_higher_scores_win(monkeypatch):
    v = verdict(8, 4, 8, 4, monkeypatch)
    assert v.winner == "AAA"
    assert v.total_score_A == pytest.approx(8.0)
    assert v.total_score_B == pytest.approx(4.0)
    assert v.confidence_A_pct == pytest.approx(66.7)
    assert v.confidence_A_pct + v.confidence_B_pct == pytest.approx(100)


def test_both_rounds_count_equally(monkeypatch):
    v = verdict(10, 0, 0, 10, monkeypatch)  # one round each
    assert v.winner == "Tie"
    assert v.confidence_A_pct == 50


def test_zero_scores_do_not_divide_by_zero(monkeypatch):
    v = verdict(0, 0, 0, 0, monkeypatch)
    assert v.winner == "Tie" and v.confidence_A_pct == 50
