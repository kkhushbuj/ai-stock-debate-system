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
    <div className="tk" aria-label="Latest market prices">
      <div className="tk-row">
        {items ? (
          <div className="marquee">
            {[0, 1].map((dup) => (
              <div key={dup} style={{ display: "flex", flex: "none" }} aria-hidden={dup === 1}>
                {items.map((q) => {
                  const up = q.change_pct >= 0;
                  return (
                    <div key={q.ticker} className="tk-item num">
                      <b>{q.ticker}</b>
                      <span>{fmtMoney(q.price)}</span>
                      <span className={`tk-chg ${up ? "tk-up" : "tk-down"}`}>
                        {up ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />}
                        {fmtPct(q.change_pct)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="lp-wrap">{quotes === null ? "Loading latest prices..." : "Latest prices are unavailable right now."}</div>
        )}
      </div>
      <p className="tk-note">Latest available close from Yahoo Finance. Prices can be delayed.</p>
    </div>
  );
}
