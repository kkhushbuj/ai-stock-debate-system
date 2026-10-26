"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { DuelPicker } from "../DuelPicker";
import { CountUp, SplitText } from "../motion";

/** Two price-like lines race across the hero: blue vs amber. */
function DuelLines() {
  const reduce = useReducedMotion();
  const a = "M0,330 C120,300 180,360 280,300 S440,220 540,260 S720,150 820,190 S1000,90 1200,60";
  const b = "M0,380 C140,350 200,300 300,330 S460,360 560,290 S760,300 860,230 S1020,200 1200,150";
  const draw = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { duration: 2.4, delay, ease: [0.16, 1, 0.3, 1] as const },
        };
  return (
    <svg viewBox="0 0 1200 460" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: "auto 0 0 0", width: "100%", height: "62%", opacity: 0.9 }}>
      <defs>
        <linearGradient id="fadeA" x1="0" x2="1"><stop offset="0" stopColor="var(--a)" stopOpacity="0" /><stop offset=".35" stopColor="var(--a)" stopOpacity=".9" /><stop offset="1" stopColor="var(--a)" /></linearGradient>
        <linearGradient id="fadeB" x1="0" x2="1"><stop offset="0" stopColor="var(--b)" stopOpacity="0" /><stop offset=".35" stopColor="var(--b)" stopOpacity=".9" /><stop offset="1" stopColor="var(--b)" /></linearGradient>
      </defs>
      <motion.path d={b} fill="none" stroke="url(#fadeB)" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" {...draw(0.5)} />
      <motion.path d={a} fill="none" stroke="url(#fadeA)" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" {...draw(0.3)} />
    </svg>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);

  return (
    // No overflow:hidden on the section itself, so the stock dropdown can extend past the hero and sit
    // above the price ticker. The decorative layers are clipped inside their own box instead.
    <section ref={ref} style={{ position: "relative", zIndex: 5, minHeight: "100svh", display: "flex", alignItems: "center", paddingTop: 120, paddingBottom: 80 }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div className="grid-bg" aria-hidden="true" style={{ position: "absolute", inset: 0 }} />
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "50%", top: "-10%", width: "min(1100px, 120vw)", height: 700, transform: "translateX(-50%)", background: "radial-gradient(ellipse at center, var(--accent-soft), transparent 65%)", pointerEvents: "none" }}
      />
      <motion.div style={{ y: reduce ? 0 : y, position: "absolute", inset: 0, willChange: "transform" }}>
        <DuelLines />
      </motion.div>
      </div>

      <div className="wrap" style={{ position: "relative", textAlign: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 28, color: "var(--text-2)", fontSize: ".92rem", fontWeight: 550 }}
        >
          <span className="live-dot" /> Live market data, three AIs, one verdict
        </motion.div>

        <h1 className="h-display" style={{ margin: "0 auto", maxWidth: 1000 }}>
          <SplitText text="Two AIs argue." delay={0.2} />
          <br />
          <span style={{ color: "var(--accent)" }}>
            <SplitText text="One judge checks the facts." delay={0.55} />
          </span>
        </h1>

        <motion.p
          className="lede"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ margin: "28px auto 44px" }}
        >
          Pick any two stocks. Two analysts debate them with live data, then a third AI re-checks every claim and scores both stocks on 10 fixed factors.
        </motion.p>

        <motion.div style={{ position: "relative", zIndex: 20 }} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 1.25, ease: [0.16, 1, 0.3, 1] }}>
          <DuelPicker />
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.7 }}
          style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "28px clamp(28px, 6vw, 72px)", margin: "64px 0 0" }}
        >
          {[
            { v: 2, l: "AI debaters" },
            { v: 1, l: "Fact-checking judge" },
            { v: 10, l: "Locked factors" },
            { v: 2, l: "Rounds of debate" },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <dt style={{ fontSize: "2.4rem", fontWeight: 720, letterSpacing: "-0.04em", lineHeight: 1 }}>
                <CountUp value={s.v} />
              </dt>
              <dd className="faint" style={{ margin: "8px 0 0", fontSize: ".9rem" }}>{s.l}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
