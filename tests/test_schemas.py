import pytest
from pydantic import ValidationError

from factors import FACTOR_IDS
from schemas import Claim, FactorScore


def claim(factor):
    return Claim(factor=factor, statement="s", cited_value="1", source="x")


@pytest.mark.parametrize("raw,expected", [
    ("pe_ratio", "pe_ratio"),
    ("P/E Ratio", "pe_ratio"),
    ("Earnings Guidance", "earnings_guidance"),
    ("earnings_growth", "earnings_guidance"),
    ("eps", "earnings_guidance"),
])
def test_factor_label_is_normalised(raw, expected):
    assert claim(raw).factor == expected


def test_unknown_factor_label_never_crashes():
    assert claim("free_cash_flow").factor in FACTOR_IDS


def test_score_must_be_between_zero_and_ten():
    with pytest.raises(ValidationError):
        FactorScore(factor="beta", score_A=11, score_B=5, reasoning="x")
    with pytest.raises(ValidationError):
        FactorScore(factor="beta", score_A=5, score_B=-1, reasoning="x")
    assert FactorScore(factor="beta", score_A=0, score_B=10, reasoning="x").score_B == 10
