"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HistoryEntry } from "@/lib/types";
import { ChatPanel, FactorTable } from "../debate/Results";
import { IconArrow, IconChevron, IconClock, IconScale, IconSearch } from "../Icons";
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
  if (e.winner === "Tie" || gap < 2.5) return { label: "Too close", color: "var(--text-2)" };
  if (gap < 8) return { label: "Slight lead", color: "var(--warn)" };
  return { label: "Clear lead", color: "var(--accent)" };
}

function Row({ e, index }: { e: HistoryEntry; index: number }) {
  const [open, setOpen] = useState(false);
  const l = lean(e);
  const side = e.winner === e.ticker_A ? "a" : e.winner === e.ticker_B ? "b" : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index, 8) * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="card"
      style={{ overflow: "hidden", borderColor: open ? "var(--line-strong)" : undefined }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(170px, 1.3fr) minmax(130px, 1fr) 110px 120px 90px 28px", gap: 14, alignItems: "center", padding: "18px 22px", background: "none", border: 0, textAlign: "left" }}
        className="hist-row"
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 720, letterSpacing: "-0.02em" }}>
          <span className="tag-a">{e.ticker_A}</span><span className="faint" style={{ fontWeight: 500, fontSize: ".85rem" }}>vs</span><span className="tag-b">{e.ticker_B}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <IconScale size={16} style={{ color: side ? `var(--${side})` : "var(--text-3)" }} />
          <b style={{ color: side ? `var(--${side})` : undefined }}>{e.winner}</b>
          <span className="chip" style={{ color: l.color, height: 22, fontSize: ".72rem" }}>{l.label}</span>
        </span>
        <span className="num muted">{e.total_score_A.toFixed(2)} – {e.total_score_B.toFixed(2)}</span>
        <span className="num faint hide-md">{e.confidence_A_pct.toFixed(1)}% / {e.confidence_B_pct.toFixed(1)}%</span>
        <span className="faint hide-md" style={{ fontSize: ".88rem" }}>{ago(e.timestamp)}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: "grid", color: "var(--text-3)" }}><IconChevron size={20} /></motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "4px 22px 26px", display: "grid", gap: 22 }}>
              <div style={{ color: "var(--text-2)", maxWidth: "74ch" }}><Rich text={e.summary} /></div>
              <div className="faint" style={{ fontSize: ".88rem" }}>
                {e.factcheck_unavailable
                  ? "Fact-check was unavailable for this debate."
                  : `Claims: ${e.ticker_A} ${e.claims_A} (${e.verified_A} verified, ${e.false_A} false) · ${e.ticker_B} ${e.claims_B} (${e.verified_B} verified, ${e.false_B} false)`}
                {e.elapsed_seconds ? ` · took ${e.elapsed_seconds}s` : ""}
              </div>
              <FactorTable ta={e.ticker_A} tb={e.ticker_B} rows={e.factors.map((f) => ({ ...f, weight: Math.round(f.weight * 100) }))} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Chat about {e.ticker_A} vs {e.ticker_B}</div>
                <ChatPanel debateId={e.id} initial={e.chat_history} winner={e.winner} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@media (max-width: 900px) { .hist-row { grid-template-columns: 1fr auto !important; row-gap: 8px !important; } .hist-row .hide-md { display: none; } }`}</style>
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
    <div className="wrap" style={{ paddingTop: 120, paddingBottom: 60, minHeight: "80vh" }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <h1 className="hd-1" style={{ margin: 0 }}>Debate history</h1>
        <p className="lede" style={{ marginTop: 12 }}>Every debate you have run, newest first. Open one to see the factor breakdown and chat about it.</p>
      </motion.div>

      <div style={{ position: "relative", maxWidth: 420, margin: "32px 0 28px" }}>
        <IconSearch size={18} style={{ position: "absolute", left: 16, top: 16, color: "var(--text-3)" }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by ticker, e.g. AAPL"
          aria-label="Search history by ticker"
          style={{ width: "100%", height: 50, padding: "0 16px 0 44px", borderRadius: 14, border: "1px solid var(--line-strong)", background: "var(--surface)", color: "var(--text)", font: "inherit", outline: "none" }}
        />
      </div>

      {err ? (
        <div className="card card-pad muted">We could not load the history. Check that the API is running.</div>
      ) : items === null ? (
        <div style={{ display: "grid", gap: 12 }}>{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 66, borderRadius: 20 }} />)}</div>
      ) : items.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card card-pad" style={{ textAlign: "center", padding: "64px 24px" }}>
          <div style={{ display: "inline-grid", placeItems: "center", width: 60, height: 60, borderRadius: 18, background: "var(--accent-soft)", color: "var(--accent)", marginBottom: 18 }}><IconClock size={28} /></div>
          <div className="hd-3">{q ? "No matching debates" : "No debates yet"}</div>
          <p className="muted" style={{ margin: "8px 0 24px" }}>{q ? "Try another ticker." : "Run your first debate and it will show up here."}</p>
          <Link href="/" className="btn btn-primary">Start a debate <IconArrow size={18} /></Link>
        </motion.div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((e, i) => <Row key={e.id} e={e} index={i} />)}
        </div>
      )}
    </div>
  );
}
