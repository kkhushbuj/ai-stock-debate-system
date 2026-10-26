r"""
LangGraph wiring. Only genuinely dependent stages run sequentially —
everything else fans out concurrently:

  START --> round1_A --\            /--> round2_A --\
        \--> round1_B --+--(join)--+                 +--(join)--> judge_factcheck
                                    \--> round2_B --/

  judge_factcheck --> judge_score --> final_verdict --> END

round2_A/round2_B each declare edges from BOTH round1_A and round1_B (not
just their "own" round1 node) because LangGraph's Pregel execution only
runs a node once every predecessor from the prior superstep has finished
— this is what makes round1_B's argument available to round2_A for its
cross-attack rebuttal, and vice versa, without an explicit join node.

judge_score is a single scoring pass that uses ONLY the ground-truth data
fetched by judge_factcheck — it never reads the debater arguments, so the
scores cannot be influenced by writing quality or model style.
"""

from langgraph.graph import END, START, StateGraph

from agents.debater import make_round1_node, make_round2_node
from agents.judge import (
    final_verdict_node,
    judge_factcheck_node,
    judge_score_node,
)
from state import DebateState, initial_state


def build_graph():
    graph = StateGraph(DebateState)

    graph.add_node("round1_A", make_round1_node("A"))
    graph.add_node("round1_B", make_round1_node("B"))
    graph.add_node("round2_A", make_round2_node("A"))
    graph.add_node("round2_B", make_round2_node("B"))
    graph.add_node("judge_factcheck", judge_factcheck_node)
    graph.add_node("judge_score", judge_score_node)
    graph.add_node("final_verdict", final_verdict_node)

    graph.add_edge(START, "round1_A")
    graph.add_edge(START, "round1_B")

    # round2 nodes need BOTH round1 arguments (own + opponent's, for rebuttal)
    graph.add_edge("round1_A", "round2_A")
    graph.add_edge("round1_B", "round2_A")
    graph.add_edge("round1_A", "round2_B")
    graph.add_edge("round1_B", "round2_B")

    # fact-check needs both round2 outputs
    graph.add_edge("round2_A", "judge_factcheck")
    graph.add_edge("round2_B", "judge_factcheck")
    graph.add_edge("judge_factcheck", "judge_score")
    graph.add_edge("judge_score", "final_verdict")
    graph.add_edge("final_verdict", END)

    return graph.compile()


_compiled_graph = None


def get_compiled_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph


def run_debate(ticker_A: str, ticker_B: str) -> DebateState:
    app = get_compiled_graph()
    result = app.invoke(initial_state(ticker_A, ticker_B))
    return result


def run_debate_streaming(ticker_A: str, ticker_B: str):
    """Yields the cumulative DebateState after every superstep completes,
    instead of only returning the final result — lets the UI render each
    stage (Round 1, Round 2, fact-check, scores, verdict) the moment it's
    ready rather than showing one long blank spinner for the whole run.
    stream_mode="values" gives the full accumulated state each time,
    which is simpler to consume than diffing per-node "updates" events
    when a superstep has multiple nodes finishing together (e.g. both
    debaters in Round 1)."""
    app = get_compiled_graph()
    yield from app.stream(initial_state(ticker_A, ticker_B), stream_mode="values")


if __name__ == "__main__":
    import sys

    # Windows consoles default to a legacy codepage that can't render
    # characters like em-dashes the LLM output uses, silently mangling
    # them to "?" instead of raising — force UTF-8 stdout explicitly.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    a = sys.argv[1] if len(sys.argv) > 1 else "NVDA"
    b = sys.argv[2] if len(sys.argv) > 2 else "AMD"
    final_state = run_debate(a, b)
    verdict = final_state["final_verdict"]
    print(f"\nWinner: {verdict.winner}")
    print(f"{verdict.ticker_A}: {verdict.total_score_A:.2f}/10 ({verdict.confidence_A_pct}%)")
    print(f"{verdict.ticker_B}: {verdict.total_score_B:.2f}/10 ({verdict.confidence_B_pct}%)")
    print(f"\n{verdict.summary}")
