from factors import FACTORS, FACTOR_IDS, FACTOR_WEIGHTS, blended_score, cache_tier_for
import pytest


def test_there_are_ten_factors_and_weights_sum_to_one():
    assert len(FACTORS) == 10
    assert sum(FACTOR_WEIGHTS.values()) == pytest.approx(1.0)


def test_all_tens_blend_to_ten_and_all_zeros_to_zero():
    assert blended_score({fid: 10 for fid in FACTOR_IDS}) == pytest.approx(10.0)
    assert blended_score({fid: 0 for fid in FACTOR_IDS}) == 0


def test_missing_factors_count_as_neutral_five():
    assert blended_score({}) == pytest.approx(5.0)


def test_heavier_factor_moves_the_score_more():
    base = {fid: 5 for fid in FACTOR_IDS}
    heavy = dict(base, earnings_guidance=10)  # weight 0.15
    light = dict(base, beta=10)               # weight 0.08
    assert blended_score(heavy) > blended_score(light) > blended_score(base)


def test_cache_tier_lookup():
    assert cache_tier_for("news_sentiment") == "2h"
    with pytest.raises(KeyError):
        cache_tier_for("not_a_factor")
