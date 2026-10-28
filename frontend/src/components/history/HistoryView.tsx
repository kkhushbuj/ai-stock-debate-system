"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HistoryEntry } from "@/lib/types";
import { ChatPanel, FactorTable } from "../debate/Results";
import { IconArrow, IconChevron, IconScale, IconSearch } from "../Icons";
import { Rich } from "../Rich";

function ago(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso.slice(0, 10);
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 2) return "Yesterday";
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function lean(e: HistoryEntry) {
  const gap = Math.abs(e.confidence_A_pct - 50);
  if (e.winner === "Tie" || gap < 2.5) return { label: "Too close", bg: "var(--lp-paper-2)" };
  if (gap < 8) return { label: "Slight lead", bg: "var(--lp-amber)" };
  return { label: "Clear lead", bg: "var(--lp-green)" };
}

function Row({ e, index }: { e: HistoryEntry; index: number }) {
  const [open, setOpen] = useState(false);
  const l = lean(e);
  const side = e.winner === e.ticker_A ? "a" : e.winner === e.ticker_B ? "b" : null;
  return (
    <motion.div
      className="hi-row"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index, 8) * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <button className="hi-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="hi-pair">
          <span className="tag-a">{e.ticker_A}</span><small>vs</small><span className="tag-b">{e.ticker_B}</span>
        </span>
        <span className="hi-win">
          <IconScale size={18} style={{ color: side ? `var(--${side})` : "var(--text-3)" }} />
          <b style={{ color: side ? `var(--${side})` : undefined }}>{e.winner}</b>
          <span className="chip" style={{ background: l.bg, color: "var(--lp-ink)", fontWeight: 900 }}>{l.label}</span>
        </span>
        <span className="num muted">{e.total_score_A.toFixed(2)} – {e.total_score_B.toFixed(2)}</span>
        <span className="num faint hide-md">{e.confidence_A_pct.toFixed(1)}% / {e.confidence_B_pct.toFixed(1)}%</span>
        <span className="faint hide-md" style={{ fontSize: ".9rem" }}>{ago(e.timestamp)}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: "grid", color: "var(--text-3)" }}><IconChevron size={22} /></motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: "hidden" }}>
            <div className="hi-panel">
              <div style={{ color: "var(--text-2)", maxWidth: "74ch" }}><Rich text={e.summary} /></div>
              <div className="faint" style={{ fontSize: ".9rem" }}>
                {e.factcheck_unavailable
                  ? "Fact-check was unavailable for this debate."
                  : `Claims: ${e.ticker_A} ${e.claims_A} (${e.verified_A} verified, ${e.false_A} false) · ${e.ticker_B} ${e.claims_B} (${e.verified_B} verified, ${e.false_B} false)`}
                {e.elapsed_seconds ? ` · took ${e.elapsed_seconds}s` : ""}
              </div>
              <FactorTable ta={e.ticker_A} tb={e.ticker_B} rows={e.factors.map((f) => ({ ...f, weight: Math.round(f.weight * 100) }))} />
              <div>
                <div style={{ fontWeight: 900, fontSize: "1.25rem", marginBottom: 12, letterSpacing: "-0.03em" }}>Chat about {e.ticker_A} vs {e.ticker_B}</div>
                <ChatPanel debateId={e.id} initial={e.chat_history} winner={e.winner} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function HistoryView() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      api.history(q).then((d) => live && (setItems(d), setErr(false))).catch(() => live && setErr(true));
    }, q ? 250 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  return (
    <div className="dv">
      <section className="hi-top">
        <motion.h1 className="lp-display hi-h" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
          Debate history
        </motion.h1>
        <motion.p className="hi-lede" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
          Every debate you have run, newest first. Open one to see the factor breakdown and chat about it.
        </motion.p>
        <label className="hi-search">
          <IconSearch size={22} style={{ flex: "none" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by ticker, e.g. AAPL" aria-label="Search history by ticker" />
        </label>
      </section>

      <div className="hi-list">
        {err ? (
          <div className="dv-fail">We could not load the history. Check that the API is running.</div>
        ) : items === null ? (
          [0, 1, 2].map((i) => <div key={i} className="skel hi-skel" />)
        ) : items.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="hi-empty" data-kind={q ? "search" : "empty"}>
            <h2 className="lp-display">{q ? "No matching debates." : "No debates yet."}</h2>
            <p>{q ? "Try another ticker." : "Run your first debate and it will show up here."}</p>
            <Link href="/" className="go-btn">Start a debate <IconArrow size={26} /></Link>
          </motion.div>
        ) : (
          items.map((e, i) => <Row key={e.id} e={e} index={i} />)
        )}
      </div>
    </div>
  );
}
