"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconCheck, IconSearch, IconShield, IconSwords, IconX } from "../Icons";
import { Reveal } from "../motion";
import { scrollToTop } from "../SmoothScroll";

/* This section is built to be easy on the page while the visitor scrolls:
 *  - everything is on the page from the start, so nothing is added or resized as a card scrolls into view;
 *  - the small preview animations are CSS only and use `transform`/`opacity`, so they run on the
 *    graphics chip, not on the busy main thread;
 *  - they start with a single attribute switch the first time a card is seen (see usePlayOnView). */

const STEPS = [
  { icon: <IconSearch size={22} />, title: "Pick two stocks", body: "Choose any two companies from the S&P 500, or type any ticker symbol you like." },
  { icon: <IconSwords size={22} />, title: "The AIs debate", body: "Each analyst gets live data, argues for its stock in round one, then attacks the other side's weak points in round two." },
  { icon: <IconShield size={22} />, title: "Claims get fact-checked", body: "A separate judge re-fetches the real numbers, marks every claim, then scores 10 locked factors. It never reads the debate." },
];

/** Switches the element's CSS animations on while it is on screen and resets them once it is fully off screen,
 *  so they play every time the visitor scrolls back to it. Only an attribute changes, which is very cheap.
 *  The scroll detector (IntersectionObserver) reacts instantly; a light check twice a second is the safety net
 *  for browsers that report late, so a card can never stay hidden. */
function usePlayOnView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.top < vh * 0.92 && r.bottom > 0) el.setAttribute("data-play", "");
      else if (r.bottom < -40 || r.top > vh + 40) el.removeAttribute("data-play");
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) el.setAttribute("data-play", "");
          else el.removeAttribute("data-play");
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    check();
    const timer = setInterval(check, 500);
    return () => {
      clearInterval(timer);
      io.disconnect();
    };
  }, []);
  return ref;
}

const d = (s: number) => ({ ["--d" as string]: `${s}s` });

/* ---------- the three little previews (static markup, CSS-animated) ---------- */

function MiniLine({ points, color }: { points: number[]; color: string }) {
  const w = 96;
  const h = 34;
  const lo = Math.min(...points);
  const span = Math.max(...points) - lo || 1;
  const pts = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - 3 - ((p - lo) / span) * (h - 6)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <polyline className="sc-draw" pathLength={1} points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StockRow({ side, ticker, name, line, delay }: { side: "a" | "b"; ticker: string; name: string; line: number[]; delay: number }) {
  return (
    <div className={`sc-in ${side === "a" ? "sc-left" : "sc-right"}`} style={{ ...d(delay), display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, background: "var(--surface-2)", border: `1px solid color-mix(in srgb, var(--${side}) 40%, var(--line))` }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", fontWeight: 750, background: `var(--${side}-soft)`, color: `var(--${side})` }}>{ticker.slice(0, 2)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{ticker}</div>
        <div className="faint" style={{ fontSize: ".85rem" }}>{name}</div>
      </div>
      <span style={d(delay + 0.3)}><MiniLine points={line} color={`var(--${side})`} /></span>
    </div>
  );
}

function SceneOne() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <StockRow side="a" ticker="NVDA" name="NVIDIA" line={[4, 5, 4.6, 6, 5.5, 7, 6.4, 8, 7.2, 9]} delay={0.05} />
      <div style={{ textAlign: "center", fontWeight: 800, color: "var(--text-3)", fontSize: ".8rem", letterSpacing: ".2em" }}>VS</div>
      <StockRow side="b" ticker="GOOGL" name="Alphabet" line={[5, 4.2, 5.4, 5, 6.2, 5.8, 7, 6.6, 7.4, 8.2]} delay={0.2} />
      {/* A real button: takes the visitor up to the stock picker at the top of the page. */}
      <button type="button" className="btn btn-primary sc-in sc-pop" style={d(0.55)} onClick={scrollToTop}>
        Try it yourself
      </button>
    </div>
  );
}

function Bubble({ side, who, round, widths, delay }: { side: "a" | "b"; who: string; round: string; widths: number[]; delay: number }) {
  return (
    <div className="sc-in" style={{ ...d(delay), padding: 16, borderRadius: 16, background: "var(--surface-2)", border: "1px solid var(--line)", borderLeft: `3px solid var(--${side})` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: ".85rem" }}>
        <b style={{ color: `var(--${side})` }}>{who}</b>
        <span className="faint">{round}</span>
      </div>
      {widths.map((w, i) => (
        <div key={i} style={{ width: `${w}%`, marginTop: 9 }}>
          <div className="sc-bar" style={{ ...d(delay + 0.15 + i * 0.12), height: 9, borderRadius: 6, background: "var(--surface-3)" }} />
        </div>
      ))}
    </div>
  );
}

function SceneTwo() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Bubble side="a" who="Debater A" round="Round 1 · Opening case" widths={[96, 88, 92, 54]} delay={0.05} />
      <Bubble side="b" who="Debater B" round="Round 2 · Rebuttal" widths={[90, 94, 70]} delay={0.3} />
    </div>
  );
}

function Claim({ ok, label, text, extra, delay }: { ok: boolean; label: string; text: string; extra: ReactNode; delay: number }) {
  return (
    <div className="sc-in" style={{ ...d(delay), padding: 14, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
      <span className={`chip sc-in sc-pop ${ok ? "chip-ok" : "chip-bad"}`} style={d(delay + 0.2)}>
        {ok ? <IconCheck size={13} /> : <IconX size={13} />}
        {label}
      </span>
      <div style={{ marginTop: 9, fontSize: ".92rem" }}>{text}</div>
      {extra}
    </div>
  );
}

function SceneThree() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Claim ok label="Verified" text="NVDA's beta is 2.215." delay={0.05} extra={<div className="faint" style={{ fontSize: ".8rem", marginTop: 6 }}>Source: valuation data. Matches the fresh numbers.</div>} />
      <Claim ok={false} label="Disputed" text="GOOGL P/E is 12." delay={0.2} extra={<div className="num" style={{ fontSize: ".82rem", marginTop: 6 }}><s className="faint">claimed 12</s> → <b style={{ color: "var(--accent)" }}>actual 27.4</b></div>} />
      <div className="sc-in" style={d(0.4)}>
        <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", background: "var(--b)" }}>
          <div className="sc-bar" style={{ ...d(0.5), width: "56%", background: "var(--a)" }} />
        </div>
        <div className="faint" style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem", marginTop: 7 }}>
          <span>Confidence split</span>
          <span>Scored from data only</span>
        </div>
      </div>
    </div>
  );
}

const SCENES = [<SceneOne key="1" />, <SceneTwo key="2" />, <SceneThree key="3" />];

function StepCard({ index }: { index: number }) {
  const s = STEPS[index];
  const ref = usePlayOnView<HTMLDivElement>();
  return (
    <div ref={ref} className="how-item" style={d(index * 0.14)}>
      <div className="card card-pad how-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <span style={{ width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-ring)" }}>{s.icon}</span>
        <span className="num faint" style={{ fontWeight: 750, fontSize: "1.1rem" }}>0{index + 1}</span>
      </div>
      <h3 className="hd-3" style={{ margin: 0 }}>{s.title}</h3>
      <p className="muted" style={{ margin: "8px 0 22px", fontSize: ".98rem", lineHeight: 1.6 }}>{s.body}</p>
      <div style={{ marginTop: "auto", padding: 16, borderRadius: 16, background: "var(--bg-2)", border: "1px solid var(--line)", minHeight: 262 }}>
        {SCENES[index]}
      </div>
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="section">
      <div className="wrap">
        <Reveal>
          <div style={{ maxWidth: 720, marginBottom: 56 }}>
            <div className="tag-g" style={{ fontWeight: 650, marginBottom: 12 }}>How it works</div>
            <h2 className="hd-1">From two tickers to a verdict you can check</h2>
          </div>
        </Reveal>

        <div className="how-grid">
          {STEPS.map((_, i) => (
            <StepCard key={i} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
