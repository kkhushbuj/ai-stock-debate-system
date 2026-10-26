import type { ChatMessage, HistoryEntry, Quote, TickerOption } from "./types";
import { getVisitorId } from "./visitor";

/** Browser calls go to /api/* (Next forwards them to the Python API).
 *  The live debate stream connects straight to NEXT_PUBLIC_API_URL when it is
 *  set, because some proxies buffer server-sent events. */
const DIRECT = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  tickers: () => get<TickerOption[]>("/api/tickers"),
  quotes: () => get<Quote[]>("/api/quotes"),
  quote: (t: string) => get<Quote>(`/api/quote/${encodeURIComponent(t)}`),
  price: (t: string, period: string) =>
    get<{ ticker: string; dates: string[]; close: number[] }>(`/api/price/${encodeURIComponent(t)}?period=${period}`),
  resolve: (q: string) => get<{ ticker: string }>(`/api/resolve?q=${encodeURIComponent(q)}`),
  history: (q = "") =>
    get<HistoryEntry[]>(`/api/history?v=${encodeURIComponent(getVisitorId())}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  chat: async (debateId: string, question: string, history: ChatMessage[]) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debate_id: debateId, question, history, visitor: getVisitorId() }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as { answer: string };
  },
  /** Streams the chat answer. `onDelta` gets each piece as the server sends it; resolves with the full text. */
  chatStream: async (debateId: string, question: string, history: ChatMessage[], onDelta: (text: string) => void) => {
    const res = await fetch(`${DIRECT}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debate_id: debateId, question, history, visitor: getVisitorId() }),
    });
    if (!res.ok || !res.body) throw new Error(`${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const event = /event: (\w+)/.exec(block)?.[1];
        const data = /data: (.*)/.exec(block)?.[1];
        if (!data) continue;
        const parsed = JSON.parse(data);
        if (event === "delta") {
          answer += parsed.text;
          onDelta(parsed.text);
        } else if (event === "done") {
          answer = parsed.answer;
        }
      }
    }
    return answer;
  },
  streamUrl: (a: string, b: string) =>
    `${DIRECT}/api/debate/stream?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&v=${encodeURIComponent(getVisitorId())}`,
};

export const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export const fmtPct = (n: number, digits = 2) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
