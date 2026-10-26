"use client";

import { useEffect, useState } from "react";
import { api, fmtMoney, fmtPct } from "@/lib/api";
import type { Quote } from "@/lib/types";
import { IconTrendDown, IconTrendUp } from "../Icons";

export function TickerTape() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);

  useEffect(() => {
    let live = true;
    api.quotes().then((q) => live && setQuotes(q)).catch(() => live && setQuotes([]));
    return () => { live = false; };
  }, []);

  const items = quotes && quotes.length ? quotes : null;

  return (
    <div style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--bg-2)", overflow: "hidden" }} aria-label="Latest market prices">
      <div style={{ height: 58, display: "flex", alignItems: "center" }}>
        {items ? (
          <div className="marquee">
            {[0, 1].map((dup) => (
              <div key={dup} style={{ display: "flex", flex: "none" }} aria-hidden={dup === 1}>
                {items.map((q) => {
                  const up = q.change_pct >= 0;
                  return (
                    <div key={q.ticker} className="num" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 30px", borderRight: "1px solid var(--line)", whiteSpace: "nowrap", fontSize: ".95rem" }}>
                      <b style={{ letterSpacing: "-0.01em" }}>{q.ticker}</b>
                      <span className="muted">{fmtMoney(q.price)}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: up ? "var(--accent)" : "var(--bad)", fontWeight: 600 }}>
                        {up ? <IconTrendUp size={14} /> : <IconTrendDown size={14} />}
                        {fmtPct(q.change_pct)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="wrap faint" style={{ fontSize: ".9rem" }}>
            {quotes === null ? "Loading latest prices..." : "Latest prices are unavailable right now."}
          </div>
        )}
      </div>
      <div className="faint" style={{ fontSize: ".75rem", textAlign: "center", paddingBottom: 10 }}>
        Latest available close from Yahoo Finance. Prices can be delayed.
      </div>
    </div>
  );
}
