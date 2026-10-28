"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useState } from "react";
import { api, fmtMoney, fmtPct } from "@/lib/api";
import type { Argument, Claim, Quote } from "@/lib/types";
import { Sparkline } from "../Charts";
import { IconAlert, IconCheck, IconChevron, IconClock, IconHelp, IconTrendDown, IconTrendUp, IconX } from "../Icons";
import { Rich } from "../Rich";

/* ---------------- Stock field (one half of the versus bar) ---------------- */

function StockCardBase({ side, ticker, name }: { side: "a" | "b"; ticker: string; name: string }) {
  const [q, setQ] = useState<Quote | null | "none">(null);
  useEffect(() => {
    let live = true;
    api.quote(ticker).then((r) => live && setQ(r)).catch(() => live && setQ("none"));
    return () => { live = false; };
  }, [ticker]);
  const quote = q && q !== "none" ? q : null;
  const up = (quote?.change_pct ?? 0) >= 0;

  return (
    <motion.div
      className={`dv-field dv-${side}`}
      initial={{ clipPath: side === "a" ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
    >
      <div className="dv-fside">Stock {side.toUpperCase()}</div>
      <div>
        <div className="dv-ftick" style={{ fontSize: `min(9rem, ${Math.floor(110 / Math.max(4, ticker.length))}cqw)` }}>{ticker}</div>
        <div className="dv-fname">{quote?.name ?? name}</div>
      </div>
      {quote ? (
        <div>
          <div className="dv-fprice num">
            {fmtMoney(quote.price)}
            <span className="dv-fchg">{up ? <IconTrendUp size={18} /> : <IconTrendDown size={18} />} {fmtPct(quote.change_pct)} today</span>
          </div>
          <div style={{ margin: "10px 0 4px" }}><Sparkline data={quote.closes} color="currentColor" height={56} /></div>
          <div className="dv-flh num">
            <span>30-day low {fmtMoney(Math.min(...quote.closes))}</span>
            <span>high {fmtMoney(Math.max(...quote.closes))}</span>
          </div>
        </div>
      ) : q === "none" ? (
        <div className="dv-fchg"><IconAlert size={18} /> No price data found.</div>
      ) : (
        <div>
          <div className="skel" style={{ height: 38, width: "55%", background: "var(--tone)" }} />
          <div className="skel" style={{ height: 56, marginTop: 14, background: "var(--tone)" }} />
        </div>
      )}
    </motion.div>
  );
}

/* ---------------- Claims ---------------- */

const CHIP: Record<string, { cls: string; label: string; Icon: typeof IconCheck }> = {
  verified: { cls: "chip-ok", label: "Verified", Icon: IconCheck },
  unverified: { cls: "chip-warn", label: "Unverified", Icon: IconHelp },
  false: { cls: "chip-bad", label: "Disputed", Icon: IconX },
  pending: { cls: "", label: "Pending", Icon: IconClock },
  unavailable: { cls: "", label: "Unavailable", Icon: IconAlert },
};

function ClaimRow({ c }: { c: Claim }) {
  const meta = CHIP[c.verdict] ?? CHIP.pending;
  const disputed = c.verdict === "false" && c.actual_value;
  const tip = [`Source: ${c.source}`, c.explanation, disputed ? `Actual value: ${c.actual_value}` : ""].filter(Boolean).join(" · ");
  return (
    <div className="dv-claim">
      <div className="dv-claimtop">
        <span className={`chip ${meta.cls}`} title={tip} tabIndex={0}>
          <meta.Icon size={13} /> {meta.label}
        </span>
        <span className="dv-claimfactor">{c.factor_name}</span>
      </div>
      <div>{c.statement}</div>
      <small className="num">
        {disputed ? (
          <>
            claimed <s>{c.cited_value}</s> → actual <b style={{ color: "var(--accent)" }}>{c.actual_value}</b>
          </>
        ) : (
          <>cited {c.cited_value} · source {c.source}</>
        )}
      </small>
      {c.explanation && c.verdict !== "pending" && c.verdict !== "unavailable" && <small>{c.explanation}</small>}
    </div>
  );
}

function ClaimsBlock({ claims }: { claims: Claim[] }) {
  const [open, setOpen] = useState(false);
  if (!claims.length) return null;
  const counts = claims.reduce<Record<string, number>>((m, c) => ((m[c.verdict] = (m[c.verdict] || 0) + 1), m), {});
  return (
    <div>
      <button className="dv-claimtoggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>Supporting points ({claims.length})</span>
        <span className="dv-claimchips">
          {counts.verified ? <span className="chip chip-ok">{counts.verified} verified</span> : null}
          {counts.false ? <span className="chip chip-bad">{counts.false} disputed</span> : null}
          {counts.unverified ? <span className="chip chip-warn">{counts.unverified} unverified</span> : null}
          <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: "grid" }}><IconChevron size={20} /></motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: "hidden" }}>
            <div className="dv-claims">{claims.map((c, i) => <ClaimRow key={i} c={c} />)}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Argument + skeleton ---------------- */

function ArgumentCardBase({
  side, ticker, debater, roundN, subtitle, arg,
}: {
  side: "a" | "b"; ticker: string; debater: string; roundN: number; subtitle: string; arg: Argument; typing?: boolean;
}) {
  return (
    <motion.article initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="dv-arg">
      <div className={`dv-arghead dv-${side}`}>
        <b>{ticker}</b>
        <div className="dv-argmeta"><div>{debater}</div><div>{subtitle}</div></div>
        <span className="chip dv-rchip">Round {roundN}</span>
      </div>
      <div className="dv-argbody">
        <Rich text={arg.argument} />
        {arg.rebuttals.length > 0 && (
          <div className="dv-reb">
            <h5>Directly rebuts</h5>
            <ul>{arg.rebuttals.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        )}
        <ClaimsBlock claims={arg.claims} />
      </div>
    </motion.article>
  );
}

function SkeletonCardBase({ side, ticker, debater, roundN, doing }: { side: "a" | "b"; ticker: string; debater: string; roundN: number; doing: string }) {
  return (
    <div className="dv-arg" aria-busy="true">
      <div className={`dv-arghead dv-${side}`}>
        <b>{ticker}</b>
        <div className="dv-argmeta"><div>{debater}</div><div>{doing}</div></div>
        <span className="chip dv-rchip">Round {roundN}</span>
      </div>
      <div className="dv-argbody">
        <div className="dots" role="img" aria-label="Writing"><i /><i /><i /></div>
        <div style={{ display: "grid", gap: 10 }}>
          {[100, 94, 98, 62].map((w, i) => <div key={i} className="skel" style={{ height: 12, width: `${w}%` }} />)}
        </div>
      </div>
    </div>
  );
}

export const StockCard = memo(StockCardBase);
export const ArgumentCard = memo(ArgumentCardBase);
export const SkeletonCard = memo(SkeletonCardBase);
