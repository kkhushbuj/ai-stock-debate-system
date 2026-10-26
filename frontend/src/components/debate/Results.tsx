"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ChatMessage, DebateResult } from "@/lib/types";
import { AreaChart } from "../Charts";
import { IconAlert, IconBot, IconEye, IconScale, IconSend, IconTrendUp, IconUser } from "../Icons";
import { CountUp, GrowBar, Reveal } from "../motion";
import { Rich, plain } from "../Rich";

/* ---------------- Verdict ---------------- */

function Meter({ a, b, ta, tb }: { a: number; b: number; ta: string; tb: string }) {
  return (
    <div role="img" aria-label={`Confidence split: ${ta} ${a}%, ${tb} ${b}%`}>
      <div style={{ position: "relative", display: "flex", height: 40, borderRadius: 999, overflow: "hidden", background: "var(--surface-3)", fontSize: ".88rem", fontWeight: 700 }}>
        <motion.div initial={{ width: "50%" }} animate={{ width: `${a}%` }} transition={{ duration: 1.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} style={{ background: "var(--a)", color: "#04101f", display: "flex", alignItems: "center", paddingLeft: 16, whiteSpace: "nowrap" }}>
          {ta} {a.toFixed(1)}%
        </motion.div>
        <div style={{ flex: 1, background: "var(--b)", color: "#2a1500", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 16, whiteSpace: "nowrap" }}>
          {tb} {b.toFixed(1)}%
        </div>
        <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "var(--bg)", opacity: 0.55 }} />
      </div>
      <div className="faint" style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem", marginTop: 8 }}>
        <span>Confidence split</span><span>50% = dead even</span>
      </div>
    </div>
  );
}

function PointBox({ title, icon, tone, children }: { title: string; icon: React.ReactNode; tone: "a" | "b" | "risk" | "watch"; children: React.ReactNode }) {
  const color = tone === "a" ? "var(--a)" : tone === "b" ? "var(--b)" : tone === "risk" ? "var(--bad)" : "var(--warn)";
  return (
    <div style={{ padding: 20, borderRadius: 16, background: "var(--surface-2)", border: "1px solid var(--line)", borderTop: `2px solid ${color}` }}>
      <h4 style={{ display: "flex", gap: 9, alignItems: "center", margin: "0 0 14px", fontSize: ".98rem", color, fontWeight: 700 }}>{icon}{title}</h4>
      {children}
    </div>
  );
}

export function VerdictCard({ r }: { r: DebateResult }) {
  const v = r.verdict;
  const strengthColor = v.lean.strength === "clear" ? "var(--accent)" : v.lean.strength === "slight" ? "var(--warn)" : "var(--text-2)";
  const winnerSide = v.winner === r.ticker_A ? "a" : v.winner === r.ticker_B ? "b" : null;
  const Edge = ({ items, side }: { items: DebateResult["points"]["a_stronger"]; side: "a" | "b" }) =>
    items.length ? (
      <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: ".92rem", color: "var(--text-2)" }}>
        {items.map((e) => (
          <li key={e.name}><b style={{ color: "var(--text)" }}>{e.name}</b> <span className="num" style={{ color: `var(--${side})` }}>{e.own.toFixed(1)} vs {e.other.toFixed(1)}</span> · {e.weight}% weight</li>
        ))}
      </ol>
    ) : <div className="faint" style={{ fontSize: ".92rem" }}>No clear edge on any factor.</div>;

  return (
    <motion.section initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="card card-pad" aria-label="Verdict" style={{ position: "relative", overflow: "hidden", padding: "clamp(22px, 4vw, 40px)" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: "-30% -10% auto -10%", height: "80%", background: `radial-gradient(ellipse at 50% 0%, ${winnerSide ? `var(--${winnerSide}-soft)` : "var(--accent-soft)"}, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--accent)", fontWeight: 650, marginBottom: 12 }}><IconScale size={18} /> Verdict</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <h2 className="hd-1" style={{ margin: 0 }}>{v.lean.headline}</h2>
              <span className="chip" style={{ color: strengthColor, borderColor: strengthColor, height: 30, fontSize: ".85rem" }}>{v.lean.label}</span>
            </div>
            <div className="faint num" style={{ marginTop: 12, fontSize: ".95rem" }}>
              Weighted score {v.total_A.toFixed(2)} vs {v.total_B.toFixed(2)} out of 10 {r.elapsed ? `· finished in ${r.elapsed}s` : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 34 }}>
            {([[r.ticker_A, v.total_A, "a"], [r.ticker_B, v.total_B, "b"]] as const).map(([t, s, side]) => (
              <div key={t}>
                <div style={{ color: `var(--${side})`, fontWeight: 700, marginBottom: 2 }}>{t}</div>
                <div style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)", fontWeight: 740, letterSpacing: "-0.05em", lineHeight: 1 }}>
                  <CountUp value={s} decimals={2} duration={1.6} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <Meter a={v.confidence_A} b={v.confidence_B} ta={r.ticker_A} tb={r.ticker_B} />
        </div>

        <div style={{ marginTop: 28, color: "var(--text-2)", fontSize: "1.02rem", lineHeight: 1.75, maxWidth: "72ch" }}>
          <Rich text={v.summary} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, marginTop: 32 }}>
          <PointBox title={`Where ${r.ticker_A} is stronger`} icon={<IconTrendUp size={17} />} tone="a"><Edge items={r.points.a_stronger} side="a" /></PointBox>
          <PointBox title={`Where ${r.ticker_B} is stronger`} icon={<IconTrendUp size={17} />} tone="b"><Edge items={r.points.b_stronger} side="b" /></PointBox>
          <PointBox title="Key risks" icon={<IconAlert size={17} />} tone="risk">
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: ".92rem", color: "var(--text-2)" }}>{r.points.risks.map((x) => <li key={x}>{x}</li>)}</ul>
          </PointBox>
          <PointBox title="What to watch" icon={<IconEye size={17} />} tone="watch">
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: ".92rem", color: "var(--text-2)" }}>{r.points.watch.map((x) => <li key={x}>{x}</li>)}</ul>
          </PointBox>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 28, padding: "14px 18px", borderRadius: 14, background: "var(--warn-soft)", border: "1px solid color-mix(in srgb, var(--warn) 28%, transparent)", color: "var(--text-2)", fontSize: ".88rem" }}>
          <span style={{ color: "var(--warn)", marginTop: 1 }}><IconAlert size={16} /></span>
          For education only. Not financial advice. The result reflects what the AI analysts argued and what the judge could verify, not a recommendation to buy or sell.
        </div>
      </div>
    </motion.section>
  );
}

export function shareText(r: DebateResult): string {
  const v = r.verdict;
  const fmt = (xs: DebateResult["points"]["a_stronger"]) => xs.map((e) => `${e.name} (${e.own.toFixed(1)} vs ${e.other.toFixed(1)})`).join(", ") || "none";
  return [
    `StockDuel: ${r.ticker_A} vs ${r.ticker_B}`,
    `Verdict: ${v.lean.headline} (${v.lean.label}). Confidence ${v.confidence_A.toFixed(1)}% ${r.ticker_A} / ${v.confidence_B.toFixed(1)}% ${r.ticker_B}. Weighted score ${v.total_A.toFixed(2)} vs ${v.total_B.toFixed(2)}.`,
    `Stronger for ${r.ticker_A}: ${fmt(r.points.a_stronger)}`,
    `Stronger for ${r.ticker_B}: ${fmt(r.points.b_stronger)}`,
    `Summary: ${plain(v.summary)}`,
    "For education only. Not financial advice.",
  ].join("\n");
}

/* ---------------- Factor table ---------------- */

type TableRow = { id: string; name: string; weight: number; score_A: number; score_B: number; category?: string };

export function FactorTable({ ta, tb, rows }: { ta: string; tb: string; rows: TableRow[] }) {
  return (
    <div className="card scroll-x" role="region" aria-label="Factor by factor scores" tabIndex={0}>
      <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontSize: ".95rem" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-3)", fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".06em" }}>
            <th style={{ padding: "18px 22px", fontWeight: 650 }}>Factor</th>
            <th style={{ padding: "18px 10px", fontWeight: 650 }}>Weight</th>
            <th style={{ padding: "18px 10px", fontWeight: 650, color: "var(--a)" }}>{ta}</th>
            <th style={{ padding: "18px 10px", fontWeight: 650, color: "var(--b)" }}>{tb}</th>
            <th style={{ padding: "18px 22px", fontWeight: 650 }}>Edge</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f, i) => {
            const d = f.score_A - f.score_B;
            const w = f.weight <= 1 ? Math.round(f.weight * 100) : f.weight;
            return (
              <motion.tr key={f.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i, duration: 0.5 }} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "16px 22px" }}>
                  <div style={{ fontWeight: 600 }}>{f.name}</div>
                  {f.category && <div className="faint" style={{ fontSize: ".78rem" }}>{f.category}</div>}
                </td>
                <td className="num muted" style={{ padding: "16px 10px" }}>{w}%</td>
                {([[f.score_A, "var(--a)"], [f.score_B, "var(--b)"]] as const).map(([s, color], k) => (
                  <td key={k} style={{ padding: "16px 10px", minWidth: 150 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1 }}><GrowBar pct={s * 10} color={color} delay={0.05 * i} immediate /></div>
                      <b className="num" style={{ width: 30, textAlign: "right" }}>{s.toFixed(1)}</b>
                    </div>
                  </td>
                ))}
                <td style={{ padding: "16px 22px", whiteSpace: "nowrap" }}>
                  {Math.abs(d) < 0.05 ? (
                    <span className="chip">even</span>
                  ) : (
                    <span className="chip num" style={{ color: d > 0 ? "var(--a)" : "var(--b)", background: d > 0 ? "var(--a-soft)" : "var(--b-soft)", borderColor: "transparent" }}>
                      {d > 0 ? ta : tb} +{Math.abs(d).toFixed(1)}
                    </span>
                  )}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Price charts ---------------- */

const PERIODS = ["1D", "1W", "1M", "1Y"];

export function PriceCharts({ ta, tb }: { ta: string; tb: string }) {
  const [period, setPeriod] = useState("1M");
  const [data, setData] = useState<Record<string, { dates: string[]; close: number[] } | null>>({});
  useEffect(() => {
    let live = true;
    setData({});
    [ta, tb].forEach((t) =>
      api.price(t, period).then((d) => live && setData((p) => ({ ...p, [t]: d }))).catch(() => live && setData((p) => ({ ...p, [t]: { dates: [], close: [] } })))
    );
    return () => { live = false; };
  }, [ta, tb, period]);

  return (
    <div>
      <div role="tablist" aria-label="Price range" style={{ display: "inline-flex", padding: 4, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)", marginBottom: 20, position: "relative" }}>
        {PERIODS.map((p) => (
          <button key={p} role="tab" aria-selected={p === period} onClick={() => setPeriod(p)} style={{ position: "relative", padding: "8px 18px", border: 0, background: "none", fontWeight: 650, fontSize: ".9rem", color: p === period ? "var(--text)" : "var(--text-3)", zIndex: 1 }}>
            {p === period && <motion.span layoutId="period-pill" transition={{ type: "spring", stiffness: 380, damping: 32 }} style={{ position: "absolute", inset: 0, background: "var(--surface-3)", borderRadius: 9, zIndex: -1 }} />}
            {p}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 18 }}>
        {([[ta, "a"], [tb, "b"]] as const).map(([t, side]) => (
          <div key={t} className="card card-pad" style={{ borderTop: `3px solid var(--${side})` }}>
            <div style={{ fontWeight: 700, color: `var(--${side})`, marginBottom: 10 }}>{t}</div>
            {data[t] ? <AreaChart dates={data[t]!.dates} close={data[t]!.close} color={`var(--${side})`} /> : <div className="skel" style={{ height: 300 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Tabs ---------------- */

export function Tabs({ tabs, children }: { tabs: string[]; children: React.ReactNode[] }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div role="tablist" className="scroll-x" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", marginBottom: 28 }}>
        {tabs.map((t, k) => (
          <button key={t} role="tab" aria-selected={k === i} onClick={() => setI(k)} style={{ position: "relative", padding: "14px 20px", background: "none", border: 0, fontWeight: 650, whiteSpace: "nowrap", color: k === i ? "var(--text)" : "var(--text-3)", transition: "color .2s" }}>
            {t}
            {k === i && <motion.span layoutId="tab-underline" transition={{ type: "spring", stiffness: 400, damping: 34 }} style={{ position: "absolute", left: 12, right: 12, bottom: -1, height: 2, background: "var(--accent)", borderRadius: 2 }} />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} role="tabpanel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
          {children[i]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Chat ---------------- */

/** One chat message. Memoised so that while an answer streams in, only the newest bubble is redrawn. */
const Bubble = memo(function Bubble({ role, content }: ChatMessage) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} style={{ display: "flex", gap: 12, flexDirection: role === "user" ? "row-reverse" : "row" }}>
      <span style={{ width: 32, height: 32, flex: "none", borderRadius: 10, display: "grid", placeItems: "center", background: role === "user" ? "var(--surface-3)" : "var(--accent-soft)", color: role === "user" ? "var(--text-2)" : "var(--accent)" }}>
        {role === "user" ? <IconUser size={16} /> : <IconBot size={16} />}
      </span>
      <div style={{ maxWidth: "min(620px, 82%)", padding: "12px 16px", borderRadius: 16, fontSize: ".96rem", background: role === "user" ? "var(--accent)" : "var(--surface-2)", color: role === "user" ? "var(--accent-ink)" : "var(--text)", border: role === "user" ? "none" : "1px solid var(--line)" }}>
        <Rich text={content} />
      </div>
    </motion.div>
  );
});

export function ChatPanel({ debateId, initial = [], winner, suggestions }: { debateId: string; initial?: ChatMessage[]; winner?: string; suggestions?: string[] }) {
  const [msgs, setMsgs] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const follow = useRef(true);

  // When the reader last scrolled (wheel, touch, keys or dragging the scrollbar). While they are
  // scrolling, new text is held back, so the page has no other work to do and the scroll stays smooth.
  // Scrolls that this component starts itself (following the answer) are not counted.
  const lastScroll = useRef(0);
  const ownScrollUntil = useRef(0);
  useEffect(() => {
    const mark = () => { lastScroll.current = performance.now(); };
    const markScroll = () => { if (performance.now() > ownScrollUntil.current) mark(); };
    const opts = { passive: true } as const;
    window.addEventListener("wheel", mark, opts);
    window.addEventListener("touchmove", mark, opts);
    window.addEventListener("keydown", mark);
    window.addEventListener("scroll", markScroll, opts);
    return () => {
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
      window.removeEventListener("keydown", mark);
      window.removeEventListener("scroll", markScroll);
    };
  }, []);

  // Bring the newest line into view, but only if it is below the fold.
  const reveal = () => {
    const end = endRef.current;
    if (!end) return;
    if (end.getBoundingClientRect().bottom > window.innerHeight - 120) {
      ownScrollUntil.current = performance.now() + 1100;
      const lenis = window.__lenis;
      if (lenis) lenis.scrollTo(end, { offset: -(window.innerHeight - 160), duration: 0.8 });
      else end.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  // While an answer streams, the page follows it gently (a calm nudge every 0.7 seconds, never on every
  // letter). The moment the reader scrolls, clicks or presses a key, following stops for this answer,
  // so the page never fights the reader's own scrolling.
  useEffect(() => {
    if (!busy) return;
    follow.current = true;
    const stop = () => { follow.current = false; };
    const opts = { passive: true } as const;
    window.addEventListener("wheel", stop, opts);
    window.addEventListener("touchmove", stop, opts);
    window.addEventListener("keydown", stop);
    window.addEventListener("pointerdown", stop, opts);
    const timer = setInterval(() => { if (follow.current) reveal(); }, 700);
    return () => {
      clearInterval(timer);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", stop);
      window.removeEventListener("pointerdown", stop);
      if (follow.current) reveal(); // one last glide so the finished answer is fully in view
    };
  }, [busy]);

  // Answers arrive from the server in bursts. The pacer shows them at a calm, steady reading speed
  // (a little faster only when a long backlog builds up), so the text flows instead of popping in.
  const pace = useRef<{ buf: string; shown: number; timer: ReturnType<typeof setInterval> | null }>({ buf: "", shown: 0, timer: null });
  useEffect(() => () => { if (pace.current.timer) clearInterval(pace.current.timer); }, []);

  const startPacer = () => {
    const st = pace.current;
    if (st.timer) clearInterval(st.timer);
    st.buf = "";
    st.shown = 0;
    st.timer = setInterval(() => {
      const backlog = st.buf.length - st.shown;
      if (backlog <= 0) return;
      // The reader is scrolling right now: hold the new text back and show it a moment after they stop.
      if (performance.now() - lastScroll.current < 220) return;
      // ~60 characters a second for most of the answer, easing to ~30 at the very end; a little faster
      // to catch up after a pause.
      const step = backlog > 400 ? 8 : backlog > 150 ? 5 : backlog > 40 ? 3 : 2;
      st.shown = Math.min(st.buf.length, st.shown + step);
      const shownText = st.buf.slice(0, st.shown);
      setMsgs((m) => {
        const copy = m.slice();
        copy[copy.length - 1] = { role: "assistant", content: shownText };
        return copy;
      });
    }, 50);
  };

  const finishPacer = () =>
    new Promise<void>((resolve) => {
      const st = pace.current;
      const check = setInterval(() => {
        if (st.shown >= st.buf.length) {
          clearInterval(check);
          if (st.timer) clearInterval(st.timer);
          st.timer = null;
          resolve();
        }
      }, 40);
    });

  const send = async (q: string) => {
    q = q.trim();
    if (!q || busy) return;
    const history = msgs;
    setMsgs([...history, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setText("");
    setBusy(true);
    startPacer();
    try {
      await api.chatStream(debateId, q, history, (piece) => {
        pace.current.buf += piece;
      });
    } catch {
      if (!pace.current.buf) pace.current.buf = "Sorry, I could not answer that just now. Please try again in a moment.";
    }
    if (!pace.current.buf) pace.current.buf = "Sorry, I could not answer that just now. Please try again in a moment.";
    await finishPacer();
    setBusy(false);
  };

  const sugg = suggestions ?? [winner && winner !== "Tie" ? `Why did ${winner} win?` : "Why was it so close?", "Which claims were disputed?", "Why should I use this project?", "What are its limits?"];

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "22px 24px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent)" }}><IconBot size={20} /></span>
        <div>
          <div style={{ fontWeight: 700 }}>Ask the judge</div>
          <div className="faint" style={{ fontSize: ".88rem" }}>Answers only from this debate. Nothing is made up.</div>
        </div>
      </div>

      <div role="log" aria-live={busy ? "off" : "polite"} style={{ padding: 24, display: "grid", gap: 16, minHeight: 120 }}>
        {msgs.length === 0 && !busy && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {sugg.map((s) => (
              <button key={s} onClick={() => send(s)} className="chip" style={{ height: 36, padding: "0 14px", cursor: "pointer", fontSize: ".88rem" }}>{s}</button>
            ))}
          </div>
        )}
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (m.role === "assistant" && !m.content) ? null : (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}
          {busy && msgs[msgs.length - 1]?.role === "assistant" && !msgs[msgs.length - 1].content && (
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 12 }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent)" }}><IconBot size={16} /></span>
              <div className="dots" style={{ padding: "16px 4px" }}><i /><i /><i /></div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(text); }} style={{ display: "flex", gap: 10, padding: 16, borderTop: "1px solid var(--line)" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={winner && winner !== "Tie" ? `e.g. Why did ${winner} win on Insider Selling?` : "Ask about this debate"}
          aria-label="Ask a question about this debate"
          style={{ flex: 1, minWidth: 0, height: 48, padding: "0 16px", borderRadius: 12, border: "1px solid var(--line-strong)", background: "var(--surface-2)", color: "var(--text)", font: "inherit", outline: "none" }}
        />
        <button className="btn btn-primary btn-sm" disabled={busy || !text.trim()} style={{ height: 48, width: 52, padding: 0 }} aria-label="Send question"><IconSend size={19} /></button>
      </form>
    </div>
  );
}
