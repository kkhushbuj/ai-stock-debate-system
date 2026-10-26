"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { api, fmtPct } from "@/lib/api";
import type { Quote, TickerOption } from "@/lib/types";
import { IconArrow, IconSearch, IconX } from "./Icons";
import { sameDebate, useDebateSession } from "@/lib/debateStore";
import { markDebateStart } from "@/lib/nav";
import { ConfirmDialog } from "./ConfirmDialog";
import { Magnetic } from "./motion";

let tickerCache: TickerOption[] | null = null;

function useTickers() {
  const [list, setList] = useState<TickerOption[]>(tickerCache ?? []);
  useEffect(() => {
    if (tickerCache) return;
    api.tickers().then((t) => {
      tickerCache = t;
      setList(t);
    }).catch(() => {});
  }, []);
  return list;
}

export const QUICK = ["AAPL", "TSLA", "NVDA", "MSFT", "GOOGL", "AMZN"];

/** Shown in the dropdown before the visitor types anything. */
const POPULAR = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "V", "WMT", "NFLX", "DIS"];

function Avatar({ text, side, size = 38 }: { text: string; side: "a" | "b"; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.29), display: "grid", placeItems: "center", flex: "none",
        fontWeight: 750, fontSize: ".82rem", letterSpacing: "-0.02em",
        background: `var(--${side}-soft)`, color: `var(--${side})`, border: `1px solid color-mix(in srgb, var(--${side}) 40%, transparent)`,
      }}
    >
      {text.slice(0, 2)}
    </span>
  );
}

function Combobox({
  side,
  label,
  value,
  onChange,
  options,
  other,
}: {
  side: "a" | "b";
  label: string;
  value: string;
  onChange: (ticker: string) => void;
  options: TickerOption[];
  other: string;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return POPULAR.map((t) => options.find((o) => o.ticker === t)).filter((o): o is TickerOption => !!o);
    const starts: TickerOption[] = [];
    const contains: TickerOption[] = [];
    for (const o of options) {
      const t = o.ticker.toLowerCase();
      const n = o.name.toLowerCase();
      if (t === q || t.startsWith(q) || n.startsWith(q)) starts.push(o);
      else if (n.includes(q)) contains.push(o);
    }
    return [...starts, ...contains].slice(0, 10);
  }, [text, options]);

  const custom = text.trim().toUpperCase();
  const canCustom = /^[A-Z0-9.\-^=]{1,15}$/.test(custom) && !options.some((o) => o.ticker === custom);
  const rows: { ticker: string; name: string; custom?: boolean }[] = [
    ...matches,
    ...(canCustom ? [{ ticker: custom, name: "Use this ticker", custom: true }] : []),
  ];

  useEffect(() => setActive(0), [text]);

  useEffect(() => {
    let live = true;
    setQuote(null);
    if (!value) return;
    api.quote(value).then((q) => live && setQuote(q)).catch(() => {});
    return () => { live = false; };
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (t: string) => {
    onChange(t);
    setText("");
    setOpen(false);
  };

  const name = options.find((o) => o.ticker === value)?.name ?? (value ? "Custom ticker" : "");

  return (
    <div ref={boxRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: ".8rem", fontWeight: 650, color: `var(--${side})`, marginBottom: 8, letterSpacing: ".02em" }}>
        {label}
      </label>

      {value ? (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: "flex", alignItems: "center", gap: 12, height: 64, padding: "0 14px", borderRadius: 16,
            background: "var(--surface-2)", border: `1px solid color-mix(in srgb, var(--${side}) 45%, var(--line))`,
          }}
        >
          <Avatar text={value} side={side} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</div>
            <div className="faint" style={{ fontSize: ".82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          </div>
          {quote && (
            <div className="num" style={{ textAlign: "right", fontSize: ".85rem" }}>
              <div style={{ fontWeight: 650 }}>${quote.price.toFixed(2)}</div>
              <div style={{ color: quote.change_pct >= 0 ? "var(--accent)" : "var(--bad)" }}>{fmtPct(quote.change_pct)}</div>
            </div>
          )}
          <button aria-label={`Clear ${value}`} onClick={() => { onChange(""); setTimeout(() => inputRef.current?.focus(), 30); }} style={{ background: "none", border: 0, color: "var(--text-3)", padding: 6, borderRadius: 8, display: "grid" }}>
            <IconX size={16} />
          </button>
        </motion.div>
      ) : (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10, height: 64, padding: "0 16px", borderRadius: 16,
            background: "var(--surface-2)", border: `1px solid ${open ? `var(--${side})` : "var(--line)"}`,
            boxShadow: open ? `0 0 0 4px var(--${side}-soft)` : "none", transition: "border-color .2s, box-shadow .2s",
          }}
        >
          <IconSearch size={18} style={{ color: "var(--text-3)", flex: "none" }} />
          <input
            id={id}
            ref={inputRef}
            value={text}
            placeholder="Search a company or ticker"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            onFocus={() => setOpen(true)}
            onChange={(e) => { setText(e.target.value); setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, rows.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter") { if (open && rows[active]) { e.preventDefault(); pick(rows[active].ticker); } }
              else if (e.key === "Escape") setOpen(false);
            }}
            style={{ flex: 1, minWidth: 0, background: "none", border: 0, outline: "none", color: "var(--text)", font: "inherit", fontSize: "1rem" }}
          />
        </div>
      )}

      <AnimatePresence>
        {open && !value && rows.length > 0 && (
          <motion.ul
            data-lenis-prevent
            id={`${id}-list`}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "absolute", zIndex: 30, left: 0, right: 0, top: "calc(100% + 8px)", margin: 0, padding: 6, listStyle: "none",
              background: "var(--surface)", border: "1px solid var(--line-strong)", borderRadius: 16,
              boxShadow: "0 24px 60px -12px rgba(0,0,0,.6)", maxHeight: "min(70vh, 560px)", overflowY: "auto",
            }}
          >
            {!text && <li className="faint" style={{ padding: "6px 10px", fontSize: ".75rem", fontWeight: 600 }}>Popular</li>}
            {rows.map((r, i) => {
              const disabled = r.ticker === other;
              return (
                <li
                  key={r.ticker + (r.custom ? "-c" : "")}
                  role="option"
                  aria-selected={i === active}
                  aria-disabled={disabled}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); if (!disabled) pick(r.ticker); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "6px 10px", borderRadius: 11, cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.4 : 1, background: i === active ? "var(--surface-3)" : "transparent",
                  }}
                >
                  <Avatar text={r.ticker} side={side} size={32} />
                  <span style={{ fontWeight: 700, minWidth: 54 }}>{r.ticker}</span>
                  <span className="muted" style={{ fontSize: ".9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {disabled ? "Already chosen" : r.name}
                  </span>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DuelPicker({ initialA = "", initialB = "", cta = "Start the debate", compact = false }: { initialA?: string; initialB?: string; cta?: string; compact?: boolean }) {
  const router = useRouter();
  const options = useTickers();
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [error, setError] = useState("");

  const quick = (t: string) => {
    setError("");
    if (!a && t !== b) setA(t);
    else if (!b && t !== a) setB(t);
    else if (t !== a) setB(t);
  };

  const session = useDebateSession();
  const [confirming, setConfirming] = useState(false);

  const begin = () => {
    setConfirming(false);
    markDebateStart();
    router.push(`/debate?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
  };

  const go = () => {
    if (!a || !b) return setError(!a && !b ? "Choose a stock in each box." : !a ? "Choose Stock A." : "Choose Stock B.");
    if (a === b) return setError("Choose two different stocks.");
    // Another debate is still running: ask before ending it. (The same pair just goes back to it.)
    if (session && session.status === "running" && !sameDebate(session, a, b)) {
      setConfirming(true);
      return;
    }
    begin();
  };

  return (
    <div className="card" style={{ padding: compact ? 18 : "clamp(18px, 3vw, 30px)", maxWidth: 860, margin: "0 auto", textAlign: "left" }}>
      <div className="duel-row" style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
        <Combobox side="a" label="Stock A" value={a} onChange={(t) => { setA(t); setError(""); }} options={options} other={b} />
        <div className="vs" aria-hidden="true">
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            style={{ width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 800, fontSize: ".78rem", background: "var(--surface-3)", border: "1px solid var(--line-strong)", color: "var(--text-2)" }}
          >
            VS
          </motion.div>
        </div>
        <Combobox side="b" label="Stock B" value={b} onChange={(t) => { setB(t); setError(""); }} options={options} other={a} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 18 }}>
        <span className="faint" style={{ fontSize: ".85rem", marginRight: 4 }}>Quick picks</span>
        {QUICK.map((t) => (
          <motion.button
            key={t}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => quick(t)}
            className="chip"
            style={{ cursor: "pointer", height: 32, padding: "0 13px", fontSize: ".85rem", color: t === a ? "var(--a)" : t === b ? "var(--b)" : undefined }}
          >
            {t}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ marginTop: 14, color: "var(--bad)", fontSize: ".92rem", fontWeight: 550 }}>{error}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: 20 }}>
        <Magnetic strength={0.12} block>
          <button className="btn btn-primary" onClick={go} style={{ width: "100%", minWidth: 260 }}>
            {cta} <IconArrow size={19} />
          </button>
        </Magnetic>
      </div>
      <ConfirmDialog
        open={confirming}
        title="End the current debate?"
        confirmLabel="End it and start the new one"
        cancelLabel="Keep the current debate"
        onConfirm={begin}
        onCancel={() => setConfirming(false)}
      >
        {session ? (
          <>
            <b style={{ color: "var(--text)" }}>{session.a} vs {session.b}</b> is still running. If you start{" "}
            <b style={{ color: "var(--text)" }}>{a} vs {b}</b>, the current debate will stop and its result won't be shown here.
          </>
        ) : null}
      </ConfirmDialog>
      <style>{`
        @media (max-width: 680px) { .duel-row { flex-direction: column; align-items: stretch !important; } .duel-row .vs { align-self: center; margin: -2px 0; } }
        .duel-row .vs { padding-bottom: 10px; }
      `}</style>
    </div>
  );
}
