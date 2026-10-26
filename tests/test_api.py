import pytest
from fastapi.testclient import TestClient

import api
from schemas import Claim, ClaimVerification


@pytest.fixture
def client():
    return TestClient(api.app)


def test_health(client):
    assert client.get("/api/health").json() == {"ok": True}


def test_resolve_company_name(client):
    assert client.get("/api/resolve", params={"q": "nvda"}).json() == {"ticker": "NVDA"}


def test_factors_endpoint_lists_ten(client):
    assert len(client.get("/api/factors").json()) == 10


def test_history_is_private_per_visitor(client):
    # no visitor id -> nothing is shown
    assert client.get("/api/history").json() == []
    assert client.get("/api/history/does-not-exist", params={"v": "someone"}).status_code == 404


def test_owner_check():
    assert api._owned({"owner": "a"}, "a")
    assert not api._owned({"owner": "a"}, "b")
    assert not api._owned({"owner": "a"}, "")
    assert not api._owned(None, "a")


def _claim(text):
    return Claim(factor="beta", statement=text, cited_value="1", source="x")


def _ver(text, verdict="verified"):
    return ClaimVerification(factor="beta", original_statement=text, original_cited_value="1", verdict=verdict, explanation="e")


def test_claims_match_their_own_verdict_even_if_order_differs():
    claims = [_claim("beta is 2"), _claim("pe is 30")]
    vers = [_ver("pe is 30", "false"), _ver("beta is 2", "verified")]
    pairs = api._match_verifications(claims, vers)
    assert pairs[0][1].verdict == "verified"
    assert pairs[1][1].verdict == "false"


def test_unmatched_claims_get_leftovers_by_position_or_none():
    pairs = api._match_verifications([_claim("a"), _claim("b")], [_ver("zzz")])
    assert pairs[0][1] is not None and pairs[1][1] is None
