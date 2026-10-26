export type Verdict = "verified" | "unverified" | "false" | "pending" | "unavailable";

export interface Claim {
  factor: string;
  factor_name: string;
  statement: string;
  cited_value: string;
  source: string;
  verdict: Verdict;
  actual_value: string | null;
  explanation: string | null;
}

export interface Argument {
  ticker: string;
  round: number;
  argument: string;
  rebuttals: string[];
  claims: Claim[];
}

export interface Quote {
  ticker: string;
  name: string;
  price: number;
  change_pct: number;
  closes: number[];
}

export interface FactorRow {
  id: string;
  name: string;
  category: string;
  weight: number;
  score_A: number;
  score_B: number;
}

export interface Edge {
  name: string;
  own: number;
  other: number;
  weight: number;
}

export interface DebateResult {
  id: string;
  ticker_A: string;
  ticker_B: string;
  name_A: string;
  name_B: string;
  elapsed: number;
  factcheck_unavailable: boolean;
  claim_counts: { verified: number; unverified: number; false: number };
  verdict: {
    winner: string;
    total_A: number;
    total_B: number;
    confidence_A: number;
    confidence_B: number;
    summary: string;
    lean: { headline: string; strength: "close" | "slight" | "clear"; label: string };
  };
  points: { a_stronger: Edge[]; b_stronger: Edge[]; risks: string[]; watch: string[] };
  factors: FactorRow[];
  rounds: { r1_A: Argument; r1_B: Argument; r2_A: Argument; r2_B: Argument };
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  ticker_A: string;
  ticker_B: string;
  winner: string;
  total_score_A: number;
  total_score_B: number;
  confidence_A_pct: number;
  confidence_B_pct: number;
  summary: string;
  factors: { id: string; name: string; weight: number; score_A: number; score_B: number }[];
  claims_A: number;
  claims_B: number;
  verified_A: number;
  verified_B: number;
  false_A: number;
  false_B: number;
  factcheck_unavailable: boolean;
  elapsed_seconds: number;
  chat_history: { role: "user" | "assistant"; content: string }[];
}

export interface TickerOption {
  ticker: string;
  name: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
