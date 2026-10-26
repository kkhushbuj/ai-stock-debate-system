"""
Debater agents. Each debater gets every relevant factor's live data
up front via tools.prefetch_all_factors — a single parallel batch of
tool calls done in plain Python — then writes its argument in ONE
structured-output LLM call.

This intentionally skips an agentic ReAct tool-calling loop: letting the
model decide tool calls one at a time and wait on each round-trip is both
slower (sequential network I/O) and more expensive (many LLM turns) than
just fetching everything concurrently up front, since a debater
realistically needs close to all 8 tools every round anyway.

Round 1 node: builds the PRO case for the debater's own ticker.
Round 2 node: attacks the OPPONENT's ticker, required to directly rebut
specific claims from the opponent's Round 1 argument (passed in via
full conversation state, not a summary).
"""

import json

import config
from config import get_debater_llm, invoke_structured
from schemas import DebaterArgument
from state import DebateState
from tools import prefetch_all_factors


def _model_for(agent_key: str) -> str:
    # Read from the config module (not a module-level constant captured at
    # import time) so the fair-fight backtest can swap DEBATER_A_MODEL /
    # DEBATER_B_MODEL at runtime between the straight and flipped runs.
    return config.DEBATER_A_MODEL if agent_key == "A" else config.DEBATER_B_MODEL


def _opponent_key(agent_key: str) -> str:
    return "B" if agent_key == "A" else "A"


def make_round1_node(agent_key: str):
    def node(state: DebateState) -> dict:
        ticker_own = state[f"ticker_{agent_key}"]
        ticker_opp = state[f"ticker_{_opponent_key(agent_key)}"]
        llm = get_debater_llm(_model_for(agent_key))
        data = prefetch_all_factors(ticker_own)

        prompt = (
            f"You are Debater {agent_key}, an equity analyst arguing FOR {ticker_own} in a "
            f"head-to-head investment debate against {ticker_opp}.\n\n"
            f"Freshly fetched live data for {ticker_own} (valuation, insider transactions, "
            f"analyst ratings, technicals, sector performance, earnings guidance, news, Fed "
            f"funds rate):\n{json.dumps(data, default=str)}\n\n"
            f"Build a persuasive, specific, data-grounded PRO case for {ticker_own} using ONLY "
            f"the data above — never invent numbers. Cover as many of the 10 factors as the "
            f"data supports favorably: Earnings Guidance, P/E Ratio, Analyst Ratings, Insider "
            f"Selling, Technical Signal, Fed Rate, Market Cap, Sector Rally, News Sentiment, "
            f"Beta.\n\n"
            f"Produce the full written argument, plus a list of every specific factual claim "
            f"made — each tagged with its factor id, the exact statement, the cited value, and "
            f"the source (name which part of the data above it came from).\n\n"
            f"CRITICAL: the `claims` list must capture EVERY number or fact you use in the "
            f"argument text above — one Claim entry per data point (P/E ratio, analyst rating, "
            f"beta, market cap, technical signal, etc). Never mention a figure in your prose and "
            f"then leave it out of `claims` — only what's in `claims` gets fact-checked and "
            f"scored, so skipping the list only makes your own case look weaker than it is."
        )
        structured: DebaterArgument = invoke_structured(llm, DebaterArgument, prompt)
        structured.ticker = ticker_own
        structured.round = 1
        return {f"round1_{agent_key}": structured}

    return node


def make_round2_node(agent_key: str):
    def node(state: DebateState) -> dict:
        opp_key = _opponent_key(agent_key)
        own_ticker = state[f"ticker_{agent_key}"]
        target_ticker = state[f"ticker_{opp_key}"]
        opponent_round1: DebaterArgument = state[f"round1_{opp_key}"]
        llm = get_debater_llm(_model_for(agent_key))
        data = prefetch_all_factors(target_ticker)

        opponent_claims_text = "\n".join(
            f"- [{c.factor}] {c.statement} (cited: {c.cited_value}, source: {c.source})"
            for c in opponent_round1.claims
        ) or "(no structured claims were extracted from their argument)"

        prompt = (
            f"You are Debater {agent_key}, representing {own_ticker} in a head-to-head "
            f"investment debate against {target_ticker}.\n\n"
            f"Freshly fetched live data for {target_ticker} (valuation, insider transactions, "
            f"analyst ratings, technicals, sector performance, earnings guidance, news, Fed "
            f"funds rate):\n{json.dumps(data, default=str)}\n\n"
            f"Opponent's Round 1 argument for {target_ticker}:\n\"\"\"{opponent_round1.argument}\"\"\"\n\n"
            f"Opponent's specific cited claims:\n{opponent_claims_text}\n\n"
            f"Build an attack on {target_ticker}'s weaknesses using ONLY the data above — never "
            f"invent numbers. For at least 2-3 of the opponent's specific claims listed above, "
            f"directly quote or closely paraphrase the claim and explain concretely — with your "
            f"own data — why it's weak, overstated, outdated, or outweighed by other factors. "
            f"Generic criticism that ignores their specific wording is not acceptable.\n\n"
            f"Produce the full written argument, a list of every specific factual claim made "
            f"(tagged with factor id, exact statement, cited value, and source), and a "
            f"`rebuttals` list naming the specific opponent claims you directly countered. "
            f"STRICT LIMIT: `rebuttals` must have AT MOST 3-4 entries, no more — pick only the "
            f"strongest few and stop. Never repeat the same rebuttal reworded as a new entry.\n\n"
            f"CRITICAL: the `claims` list must capture EVERY number or fact you use in the "
            f"argument text above — one Claim entry per data point. Never mention a figure in "
            f"your prose and then leave it out of `claims` — only what's in `claims` gets "
            f"fact-checked and scored, so skipping the list only makes your own case look "
            f"weaker than it is."
        )
        structured: DebaterArgument = invoke_structured(llm, DebaterArgument, prompt)
        structured.ticker = target_ticker
        structured.round = 2
        return {f"round2_{agent_key}": structured}

    return node
