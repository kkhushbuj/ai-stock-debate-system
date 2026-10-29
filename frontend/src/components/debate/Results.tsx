"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ChatMessage, DebateResult } from "@/lib/types";
import { AreaChart } from "../Charts";
import { IconAlert, IconBot, IconEye, IconScale, IconSend, IconTrendUp, IconUser } from "../Icons";
import { CountUp, GrowBar } from "../motion";
import { Rich, plain } from "../Rich";

/* ---------------- Verdict ---------------- */

/** One flat bar, two colours. The blue part slides from the middle to its real share. */
function Meter({ a, b, ta, tb }: { a: number; b: number; ta: string; tb: string }) {
  return (
    <div className="vd-conf lp-ink" role="img" aria-label={`Confidence split: ${ta} ${a}%, ${tb} ${b}%`}>
      <div className="vd-bar">
        <motion.div className="vd-bar-a" initial={{ width: "50%" }} animate={{ width: `${a}%` }} transition={{ duration: 1.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} style={{ whiteSpace: "nowrap" }}>
          {ta} {a.toFixed(1)}%
        </motion.div>
        <div className="vd-bar-b" style={{ whiteSpace: "nowrap" }}>{tb} {b.toFixed(1)}%</div>
      </div>
      <p>Confidence split. 50% would be dead even.</p>
    </div>
  );
}

function PointBox({ title, icon, tone, children }: { title: string; icon: React.ReactNode; tone: "a" | "b" | "risk" | "watch"; children: React.ReactNode }) {
  const color = tone === "a" ? "var(--a)" : tone === "b" ? "var(--b)" : tone === "risk" ? "var(--bad)" : "var(--warn)";
  return (
    <div className="dv-pt" style={{ ["--pt" as string]: color }}>
      <h4>{icon}{title}</h4>
      {children}
    </div>
  );
}

export function VerdictCard({ r }: { r: DebateResult }) {
  const v = r.verdict;
  const strengthBg = v.lean.strength === "clear" ? "var(--lp-green)" : v.lean.strength === "slight" ? "var(--lp-amber)" : "var(--lp-paper-2)";
  const Edge = ({ items, side }: { items: DebateResult["points"]["a_stronger"]; side: "a" | "b" }) =>
    items.length ? (
      <ol>
        {items.map((e) => (
          <li key={e.name}><b>{e.name}</b> <span className="num" style={{ color: `var(--${side})` }}>{e.own.toFixed(1)} vs {e.other.toFixed(1)}</span> · {e.weight}% weight</li>
        ))}
      </ol>
    ) : <div className="faint" style={{ fontSize: ".95rem" }}>No clear edge on any factor.</div>;

  const sides = [
    { t: r.ticker_A, s: v.total_A, c: v.confidence_A, side: "a" as const },
    { t: r.ticker_B, s: v.total_B, c: v.confidence_B, side: "b" as const },
  ];

  return (
    <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="dv-verdict" aria-label="Verdict">
      <div className="dv-vhead">
        <div className="dv-vmeta"><IconScale size={20} /> <b>Verdict</b></div>
        <h2 className="lp-display dv-vtitle">{v.lean.headline}</h2>
        <div className="dv-vmeta">
          <span className="chip" style={{ background: strengthBg }}>{v.lean.label}</span>
          <span className="num">Weighted score {v.total_A.toFixed(2)} vs {v.total_B.toFixed(2)} out of 10 {r.elapsed ? `· finished in ${r.elapsed}s` : ""}</span>
        </div>
      </div>

      <div className="dv-vsplit">
        {sides.map((x) => (
          <div key={x.t} className={`dv-vside dv-${x.side}`}>
            <div className="dv-vtick">{x.t}{v.winner === x.t && <span className="dv-lead">Leads</span>}</div>
            <div className="dv-vnum"><CountUp value={x.s} decimals={2} duration={1.6} /></div>
            <div className="dv-vconf num">{x.c.toFixed(1)}% confidence</div>
          </div>
        ))}
      </div>

      <Meter a={v.confidence_A} b={v.confidence_B} ta={r.ticker_A} tb={r.ticker_B} />

      <div className="dv-vbody">
        <div className="dv-sum"><Rich text={v.summary} /></div>

        <div className="dv-points">
          <PointBox title={`Where ${r.ticker_A} is stronger`} icon={<IconTrendUp size={18} />} tone="a"><Edge items={r.points.a_stronger} side="a" /></PointBox>
          <PointBox title={`Where ${r.ticker_B} is stronger`} icon={<IconTrendUp size={18} />} tone="b"><Edge items={r.points.b_stronger} side="b" /></PointBox>
          <PointBox title="Key risks" icon={<IconAlert size={18} />} tone="risk">
            <ul>{r.points.risks.map((x) => <li key={x}>{x}</li>)}</ul>
          </PointBox>
          <PointBox title="What to watch" icon={<IconEye size={18} />} tone="watch">
            <ul>{r.points.watch.map((x) => <li key={x}>{x}</li>)}</ul>
          </PointBox>
        </div>

        <p className="dv-disc">
          <b>For education only. Not financial advice.</b> The result reflects what the AI analysts argued and what the judge could verify, not a recommendation to buy or sell.
        </p>
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
    <div className="dv-ft" role="region" aria-label="Factor by factor scores" tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th>Factor</th>
            <th>Weight</th>
            <th className="ta">{ta}</th>
            <th className="tb">{tb}</th>
            <th>Edge</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f, i) => {
            const d = f.score_A - f.score_B;
            const w = f.weight <= 1 ? Math.round(f.weight * 100) : f.weight;
            return (
              <motion.tr key={f.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i, duration: 0.5 }}>
                <td>
                  <div style={{ fontWeight: 700 }}>{f.name}</div>
                  {f.category && <div className="faint" style={{ fontSize: ".85rem" }}>{f.category}</div>}
                </td>
                <td className="num muted">{w}%</td>
                {([[f.score_A, "var(--a)"], [f.score_B, "var(--b)"]] as const).map(([s, color], k) => (
                  <td key={k} style={{ minWidth: 150 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1 }}><GrowBar pct={s * 10} color={color} delay={0.05 * i} immediate height={12} /></div>
                      <b className="num" style={{ width: 30, textAlign: "right" }}>{s.toFixed(1)}</b>
                    </div>
                  </td>
                ))}
                <td style={{ whiteSpace: "nowrap" }}>
                  {Math.abs(d) < 0.05 ? (
                    <span className="chip">even</span>
                  ) : (
                    <span className="chip num" style={{ background: d > 0 ? "var(--lp-blue)" : "var(--lp-amber)", color: d > 0 ? "#fff" : "var(--lp-ink)" }}>
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

type Series = { dates: string[]; close: number[] };

/** Prices already fetched, so choosing a range a second time is instant. */
const priceCache = new Map<string, Series>();
const priceInflight = new Map<string, Promise<Series>>();

function loadPrice(ticker: string, period: string): Promise<Series> {
  const key = `${ticker}|${period}`;
  const hit = priceCache.get(key);
  if (hit) return Promise.resolve(hit);
  let pending = priceInflight.get(key);
  if (!pending) {
    pending = api
      .price(ticker, period)
      .then((d) => {
        priceCache.set(key, d);
        return d;
      })
      .catch(() => ({ dates: [], close: [] }) as Series) // a failed fetch is not saved, so the next click tries again
      .finally(() => priceInflight.delete(key));
    priceInflight.set(key, pending);
  }
  return pending;
}

/** Fetches every range for both stocks in the background, so the charts are ready before anyone opens them. */
export function prefetchPrices(ta: string, tb: string) {
  for (const p of ["1M", "1W", "1D", "1Y"]) {
    loadPrice(ta, p);
    loadPrice(tb, p);
  }
}

export function PriceCharts({ ta, tb }: { ta: string; tb: string }) {
  const [period, setPeriod] = useState("1M");
  // What is on screen. It only changes when the new range has arrived, so the old chart stays
  // in place (a little faded) instead of vanishing while the new one loads.
  const [shown, setShown] = useState<{ period: string; data: Record<string, Series | undefined> }>({ period: "1M", data: {} });
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let live = true;
    if (![ta, tb].every((t) => priceCache.has(`${t}|${period}`))) setWaiting(true);
    Promise.all([loadPrice(ta, period), loadPrice(tb, period)]).then(([a, b]) => {
      if (!live) return;
      setShown({ period, data: { [ta]: a, [tb]: b } });
      setWaiting(false);
    });
    return () => { live = false; };
  }, [ta, tb, period]);

  return (
    <div>
      <div role="tablist" aria-label="Price range" className="dv-tabs">
        {PERIODS.map((p) => (
          <button key={p} role="tab" aria-selected={p === period} className="dv-tab" onClick={() => setPeriod(p)}>{p}</button>
        ))}
      </div>
      <div className="dv-chartgrid" style={{ opacity: waiting ? 0.5 : 1, transition: "opacity .25s ease" }} aria-busy={waiting}>
        {([[ta, "a"], [tb, "b"]] as const).map(([t, side]) => {
          const series = shown.data[t];
          return (
            <div key={t} className="dv-chart">
              <div className={`dv-charthead dv-${side}`}>{t}</div>
              <div className="dv-chartbody">
                {series ? (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={shown.period} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                      <AreaChart dates={series.dates} close={series.close} color={`var(--${side})`} />
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="skel" style={{ height: 340 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Tabs ---------------- */

export function Tabs({ tabs, children }: { tabs: string[]; children: React.ReactNode[] }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div role="tablist" className="dv-tabs">
        {tabs.map((t, k) => (
          <button key={t} role="tab" aria-selected={k === i} className="dv-tab" onClick={() => setI(k)}>{t}</button>
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
const Bubble = memo(function Bubble({ role, content, streaming = false }: ChatMessage & { streaming?: boolean }) {
  return (
    <motion.div className="dv-bub" data-role={role} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
      <span className="dv-bubav">{role === "user" ? <IconUser size={17} /> : <IconBot size={17} />}</span>
      <div className="dv-bubtxt">
        <Rich text={content} fade={streaming} />
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

  // Is the chat on screen (or just below / above it)? When the reader has scrolled away to look at the
  // rest of the page, nobody is watching the typing, so the text just catches up in the background.
  // The text never pauses while the reader scrolls: it keeps its steady pace as long as the chat is in view.
  const visible = useRef(true);
  useEffect(() => {
    const el = endRef.current?.parentElement;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; }, { rootMargin: "250px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Bring the newest line into view, but only if it is below the fold.
  const reveal = () => {
    const end = endRef.current;
    if (!end) return;
    if (end.getBoundingClientRect().bottom > window.innerHeight - 120) {
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

  // Answers arrive from the server in bursts. The pacer turns them into one steady flow of words:
  //  - the speed follows the backlog smoothly (never below a calm reading speed, and the bigger the backlog
  //    the faster it eases through it), so there are no sudden jumps when a burst lands;
  //  - only whole words are shown while the answer is still arriving, so lines never re-wrap mid-word;
  //  - the speed follows real time, so a busy or slow tab does not stall the text.
  const pace = useRef<{ buf: string; shown: number; last: number; drew: number; drawn: string; timer: ReturnType<typeof setInterval> | null }>({ buf: "", shown: 0, last: 0, drew: 0, drawn: "", timer: null });
  useEffect(() => () => { if (pace.current.timer) clearInterval(pace.current.timer); }, []);

  const startPacer = () => {
    const st = pace.current;
    if (st.timer) clearInterval(st.timer);
    st.buf = "";
    st.shown = 0;
    st.last = performance.now();
    st.drew = 0;
    st.drawn = "";
    st.timer = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(250, now - st.last) / 1000; // seconds since the last tick (capped after a long pause)
      st.last = now;
      const backlog = st.buf.length - st.shown;
      if (backlog <= 0) return;
      const watching = !document.hidden && visible.current;
      if (!watching) {
        // Nobody is watching the typing (another tab, or the reader scrolled away): take in everything that has
        // arrived and redraw only now and then, so it is all there on return and costs the page almost nothing.
        st.shown = st.buf.length;
        if (now - st.drew < 400) return;
      } else {
        // A medium reading pace: about 70 characters a second while there is plenty of text waiting, easing down to
        // 35 as the backlog shrinks, so the end of an answer slows gently instead of stopping short.
        const rate = Math.min(70, Math.max(35, backlog * 0.5));
        st.shown = Math.min(st.buf.length, st.shown + rate * dt);
      }
      let shownText = st.buf.slice(0, Math.floor(st.shown));
      if (st.shown < st.buf.length) {
        const cut = shownText.search(/\s\S*$/); // hold back a word that is not finished yet
        if (cut > 0) shownText = shownText.slice(0, cut);
      }
      if (shownText === st.drawn) return; // nothing new to draw: skip the work
      st.drawn = shownText;
      st.drew = now;
      setMsgs((m) => {
        const copy = m.slice();
        copy[copy.length - 1] = { role: "assistant", content: shownText };
        return copy;
      });
    }, 30);
  };

  const finishPacer = () =>
    new Promise<void>((resolve) => {
      const st = pace.current;
      const check = setInterval(() => {
        if (st.shown >= st.buf.length) {
          clearInterval(check);
          if (st.timer) clearInterval(st.timer);
          st.timer = null;
          // The last redraw may have been skipped while nobody was watching: draw the complete answer.
          const full = st.buf;
          setMsgs((m) => (m.length && m[m.length - 1].content !== full ? [...m.slice(0, -1), { role: "assistant", content: full }] : m));
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
    <div className="dv-chat">
      <div className="dv-chathead">
        <span className="dv-chatico"><IconBot size={22} /></span>
        <div>
          <b>Ask the judge</b>
          <span className="s">Answers only from this debate. Nothing is made up.</span>
        </div>
      </div>

      <div role="log" aria-live={busy ? "off" : "polite"} className="dv-chatlog">
        {msgs.length === 0 && !busy && (
          <div className="dv-sugg">
            {sugg.map((s) => (
              <button key={s} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (m.role === "assistant" && !m.content) ? null : (
            <Bubble key={i} role={m.role} content={m.content} streaming={busy && m.role === "assistant" && i === msgs.length - 1} />
          ))}
          {busy && msgs[msgs.length - 1]?.role === "assistant" && !msgs[msgs.length - 1].content && (
            <motion.div key="typing" className="dv-bub" data-role="assistant" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="dv-bubav"><IconBot size={17} /></span>
              <div className="dots" style={{ padding: "16px 4px" }}><i /><i /><i /></div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <form className="dv-form" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input
          className="dv-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={winner && winner !== "Tie" ? `e.g. Why did ${winner} win on Insider Selling?` : "Ask about this debate"}
          aria-label="Ask a question about this debate"
        />
        <button className="dv-send" disabled={busy || !text.trim()} aria-label="Send question"><IconSend size={20} /></button>
      </form>
    </div>
  );
}
