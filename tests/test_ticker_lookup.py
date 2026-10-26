from ticker_lookup import SP500_TICKERS, parse_selection


def test_picked_option_returns_the_ticker():
    assert parse_selection("NVDA — NVIDIA") == "NVDA"


def test_plain_ticker_any_case():
    assert parse_selection("nvda") == "NVDA"


def test_company_name_resolves_to_ticker():
    name = SP500_TICKERS["AAPL"]
    assert parse_selection(name) == "AAPL"
    assert parse_selection(name.lower()) == "AAPL"


def test_empty_input_gives_empty_string():
    assert parse_selection("") == ""
    assert parse_selection("   ") == ""


def test_unknown_text_falls_back_to_uppercase_symbol():
    assert parse_selection("zzzq") == "ZZZQ"
