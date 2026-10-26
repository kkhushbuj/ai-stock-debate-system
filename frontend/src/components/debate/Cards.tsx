"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useState } from "react";
import { api, fmtMoney, fmtPct } from "@/lib/api";
import type { Argument, Claim, Quote } from "@/lib/types";
import { Sparkline } from "../Charts";
import { IconAlert, IconCheck, IconChevron, IconClock, IconHelp, IconTrendDown, IconTrendUp, IconX } from "../Icons";
import { Rich } from "../Rich";

export function Avatar({ text, side, size = 48 }: { text: string; side: "a" | "b"; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: size * 0.3, display: "grid", placeItems: "center", flex: "none", fontWeight: 760,
        fontSize: size * 0.34, letterSpacing: "-0.02em", background: `var(--${side}-soft)`, color: `var(--${side})`,
        border: `1px solid color-mix(in srgb, var(--${side}) 40%, transparent)`,
      }}
    >
      {text.slice(0, 2)}
    </span>
  );
}

/* ---------------- Stock header card ---------------- */

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
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: side === "a" ? 0 : 0.1 }}
      className="card card-pad"
      style={{ borderTop: `3px solid var(--${side})`, overflow: "hidden" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar text={ticker} side={side} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 750, fontSize: "1.3rem", letterSpacing: "-0.03em" }}>{ticker}</div>
          <div className="faint" style={{ fontSize: ".9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{quote?.name ?? name}</div>
        </div>
        <span className="chip" style={{ color: `var(--${side})` }}>Stock {side.toUpperCase()}</span>
      </div>
      {quote ? (
        <>
          <div className="num" style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <span style={{ fontSize: "2.2rem", fontWeight: 720, letterSpacing: "-0.04em" }}>{fmtMoney(quote.price)}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: up ? "var(--accent)" : "var(--bad)", fontWeight: 650 }}>
              {up ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />} {fmtPct(quote.change_pct)} today
            </span>
          </div>
          <div style={{ margin: "10px 0 6px" }}><Sparkline data={quote.closes} color={`var(--${side})`} height={56} /></div>
          <div className="faint num" style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem" }}>
            <span>30-day low {fmtMoney(Math.min(...quote.closes))}</span>
            <span>high {fmtMoney(Math.max(...quote.closes))}</span>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 20 }}>
          {q === "none" ? (
            <div className="faint" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".9rem" }}><IconAlert size={16} /> No price data found.</div>
          ) : (
            <>
              <div className="skel" style={{ height: 34, width: "55%" }} />
              <div className="skel" style={{ height: 56, marginTop: 14 }} />
            </>
          )}
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
    <div style={{ padding: "14px 0", borderTop: "1px solid var(--line)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        <span className={`chip ${meta.cls}`} title={tip} tabIndex={0}>
          <meta.Icon size={13} /> {meta.label}
        </span>
        <span className="faint" style={{ fontSize: ".74rem", fontWeight: 650, textTransform: "uppercase", letterSpacing: ".06em" }}>{c.factor_name}</span>
      </div>
      <div style={{ fontSize: ".95rem" }}>{c.statement}</div>
      <div className="faint num" style={{ fontSize: ".82rem", marginTop: 6 }}>
        {disputed ? (
          <>
            claimed <s>{c.cited_value}</s> → actual <b style={{ color: "var(--accent)" }}>{c.actual_value}</b>
          </>
        ) : (
          <>cited {c.cited_value} · source {c.source}</>
        )}
      </div>
      {c.explanation && c.verdict !== "pending" && c.verdict !== "unavailable" && (
        <div className="faint" style={{ fontSize: ".82rem", marginTop: 4 }}>{c.explanation}</div>
      )}
    </div>
  );
}

function ClaimsBlock({ claims }: { claims: Claim[] }) {
  const [open, setOpen] = useState(false);
  if (!claims.length) return null;
  const counts = claims.reduce<Record<string, number>>((m, c) => ((m[c.verdict] = (m[c.verdict] || 0) + 1), m), {});
  return (
    <div style={{ marginTop: 18, borderTop: "1px solid var(--line)" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 0 4px", background: "none", border: 0, textAlign: "left" }}
      >
        <span style={{ fontWeight: 650 }}>Supporting points ({claims.length})</span>
        <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {counts.verified ? <span className="chip chip-ok">{counts.verified} verified</span> : null}
          {counts.false ? <span className="chip chip-bad">{counts.false} disputed</span> : null}
          {counts.unverified ? <span className="chip chip-warn">{counts.unverified} unverified</span> : null}
          <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: "grid", color: "var(--text-3)" }}><IconChevron size={18} /></motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: "hidden" }}>
            {claims.map((c, i) => <ClaimRow key={i} c={c} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Argument + skeleton ---------------- */

function ArgumentCardBase({
  side, ticker, debater, roundN, subtitle, arg, typing = false,
}: {
  side: "a" | "b"; ticker: string; debater: string; roundN: number; subtitle: string; arg: Argument; typing?: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="card card-pad"
      style={{ borderLeft: `3px solid var(--${side})`, height: "100%" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <Avatar text={ticker} side={side} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{debater} <span style={{ color: `var(--${side})` }}>{ticker}</span></div>
          <div className="faint" style={{ fontSize: ".85rem" }}>{subtitle}</div>
        </div>
        <span className="chip">Round {roundN}</span>
      </div>
      <div style={{ color: "var(--text-2)", fontSize: ".98rem", lineHeight: 1.7 }}>
        <Rich text={arg.argument} />
      </div>
      {arg.rebuttals.length > 0 && (
        <div style={{ marginTop: 18, padding: 16, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
          <div className="faint" style={{ fontSize: ".74rem", fontWeight: 650, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Directly rebuts</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-2)", fontSize: ".92rem" }}>
            {arg.rebuttals.map((r, i) => <li key={i} style={{ margin: "5px 0" }}>{r}</li>)}
          </ul>
        </div>
      )}
      <ClaimsBlock claims={arg.claims} />
    </motion.article>
  );
}

function SkeletonCardBase({ side, ticker, debater, roundN, doing }: { side: "a" | "b"; ticker: string; debater: string; roundN: number; doing: string }) {
  return (
    <div className="card card-pad" aria-busy="true" style={{ borderLeft: `3px solid var(--${side})`, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Avatar text={ticker} side={side} size={42} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{debater} <span style={{ color: `var(--${side})` }}>{ticker}</span></div>
          <div className="faint" style={{ fontSize: ".85rem" }}>{doing}</div>
        </div>
        <span className="chip">Round {roundN}</span>
      </div>
      <div className="dots" role="img" aria-label="Writing" style={{ marginBottom: 16 }}><i /><i /><i /></div>
      <div style={{ display: "grid", gap: 10 }}>
        {[100, 94, 98, 62].map((w, i) => <div key={i} className="skel" style={{ height: 12, width: `${w}%` }} />)}
      </div>
    </div>
  );
}

export const StockCard = memo(StockCardBase);
export const ArgumentCard = memo(ArgumentCardBase);
export const SkeletonCard = memo(SkeletonCardBase);
