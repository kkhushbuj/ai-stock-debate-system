"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CATEGORIES, CATEGORY_NOTE, FACTORS } from "@/lib/factors";
import { IconAlert, IconArrow, IconCheck, IconChevron } from "../Icons";
import { CountUp, GrowBar, Magnetic, Reveal, TiltCard } from "../motion";
import { scrollToTop } from "../SmoothScroll";

/* ----------------------- Transparent example ----------------------- */

export function SampleVerdict() {
  return (
    <section className="section" id="example">
      <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "clamp(32px, 6vw, 80px)", alignItems: "center" }}>
        <Reveal>
          <div className="tag-g" style={{ fontWeight: 650, marginBottom: 14 }}>Transparent by design</div>
          <h2 className="hd-1">See exactly why one stock wins</h2>
          <p className="lede" style={{ marginTop: 20 }}>
            Every claim gets a status you can hover for its source. The final score uses fixed factor weights, so no AI can pick its own rules mid-debate.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "32px 0 0", display: "grid", gap: 16 }}>
            {[
              "Verified, unverified and disputed claims are labelled on every argument.",
              "Wrong numbers are shown next to the real ones from the data.",
              "A factor-by-factor table shows where each stock is stronger.",
            ].map((t, i) => (
              <Reveal as="li" key={t} delay={0.1 + i * 0.1}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ width: 26, height: 26, flex: "none", borderRadius: 8, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent)" }}><IconCheck size={15} /></span>
                  <span className="muted">{t}</span>
                </div>
              </Reveal>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.15}>
          <TiltCard className="card-pad" max={4}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
              <span className="tag-g" style={{ fontWeight: 650, fontSize: ".9rem" }}>Example result</span>
              <span className="chip">From a real run: NVDA vs GOOGL</span>
            </div>
            {[{ t: "NVDA", s: 9.44, side: "a" }, { t: "GOOGL", s: 8.38, side: "b" }].map((r) => (
              <div key={r.t} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontWeight: 700, color: `var(--${r.side})`, fontSize: "1.1rem" }}>{r.t}</span>
                <span style={{ fontSize: "1.9rem", fontWeight: 720, letterSpacing: "-0.03em" }}>
                  <CountUp value={r.s} decimals={2} /> <span className="faint" style={{ fontSize: "1rem", fontWeight: 500 }}>/ 10</span>
                </span>
              </div>
            ))}
            <div style={{ marginTop: 22 }}>
              <div style={{ display: "flex", height: 34, borderRadius: 999, overflow: "hidden", fontSize: ".82rem", fontWeight: 650 }}>
                <motion.div initial={{ width: "50%" }} whileInView={{ width: "53%" }} viewport={{ once: true }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} style={{ background: "var(--a)", color: "#04101f", display: "flex", alignItems: "center", paddingLeft: 14 }}>NVDA 53.0%</motion.div>
                <div style={{ flex: 1, background: "var(--b)", color: "#2a1500", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 14 }}>GOOGL 47.0%</div>
              </div>
              <div className="faint" style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem", marginTop: 8 }}><span>Confidence split</span><span>50% = dead even</span></div>
            </div>
            <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
              {[
                { f: "Market cap", t: "GOOGL has an elite market capitalization of $4.17 trillion.", n: "Source: valuation data. Matches the fetched data." },
                { f: "Beta", t: "NVDA's beta of 2.215 indicates higher volatility than the broader market.", n: "Source: valuation data. Fresh data confirms 2.215." },
              ].map((c) => (
                <div key={c.f} style={{ padding: 14, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <span className="chip chip-ok"><IconCheck size={13} /> Verified</span>
                    <span className="faint" style={{ fontSize: ".78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.f}</span>
                  </div>
                  <div style={{ fontSize: ".95rem" }}>{c.t}</div>
                  <div className="faint" style={{ fontSize: ".8rem", marginTop: 6 }}>{c.n}</div>
                </div>
              ))}
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------- 10 factors ----------------------- */

export function FactorsSection() {
  return (
    <section className="section" id="factors">
      <div className="wrap">
        <Reveal>
          <div style={{ maxWidth: 720, marginBottom: 56 }}>
            <div className="tag-g" style={{ fontWeight: 650, marginBottom: 14 }}>The scoring rules</div>
            <h2 className="hd-1">10 weighted factors, locked in advance</h2>
            <p className="lede" style={{ marginTop: 18 }}>Every factor and its weight is fixed before a debate starts. The weights add up to 100%.</p>
          </div>
        </Reveal>

        <div className="factor-grid">
          {CATEGORIES.map((cat, ci) => {
            const items = FACTORS.filter((f) => f.category === cat);
            const total = items.reduce((s, f) => s + f.weight, 0);
            return (
              <Reveal key={cat} delay={ci * 0.08}>
                <TiltCard className="card-pad" max={3}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div className="hd-3">{cat}</div>
                    <div className="num tag-g" style={{ fontWeight: 700 }}>{total}%</div>
                  </div>
                  <p className="faint" style={{ margin: "6px 0 22px", fontSize: ".9rem" }}>{CATEGORY_NOTE[cat]}</p>
                  <div style={{ display: "grid", gap: 18 }}>
                    {items.map((f, i) => (
                      <div key={f.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".92rem", marginBottom: 8 }}>
                          <span>{f.name}</span>
                          <b className="num">{f.weight}%</b>
                        </div>
                        <GrowBar pct={(f.weight / 15) * 100} color="var(--accent)" delay={0.15 + i * 0.08} />
                      </div>
                    ))}
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------------- FAQ ----------------------- */

const FAQ = [
  { q: "Is this financial advice?", a: "No. StockDuel is a learning project. It shows what two AI analysts argued and what a judge could verify. It is not a recommendation to buy or sell anything." },
  { q: "Where does the data come from?", a: "Prices and company numbers come from Yahoo Finance, news from Tavily search, and the interest rate from the US Federal Reserve data service. Public data can be delayed." },
  { q: "How does the fact-check work?", a: "After both rounds, a separate judge fetches the numbers again by itself. It marks every claim as verified, unverified or disputed, and shows the real value next to any wrong one." },
  { q: "Can the AI be wrong?", a: "Yes. AI models make mistakes, and data can be late or missing. That is why every claim is checked and why the page tells you when the fact-check could not run." },
  { q: "How long does a debate take?", a: "Usually one to two minutes. You can watch each step finish live on the debate page." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section" id="faq">
      <div className="wrap" style={{ maxWidth: 880 }}>
        <Reveal>
          <div className="tag-g" style={{ fontWeight: 650, marginBottom: 14 }}>Questions</div>
          <h2 className="hd-1" style={{ marginBottom: 40 }}>Good to know before you start</h2>
        </Reveal>
        <div style={{ display: "grid", gap: 10 }}>
          {FAQ.map((f, i) => {
            const on = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.05}>
                <div className="card" style={{ overflow: "hidden", borderColor: on ? "var(--line-strong)" : undefined }}>
                  <button
                    aria-expanded={on}
                    onClick={() => setOpen(on ? null : i)}
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "20px 24px", background: "none", border: 0, textAlign: "left", fontWeight: 650, fontSize: "1.05rem" }}
                  >
                    {f.q}
                    <motion.span animate={{ rotate: on ? 180 : 0 }} style={{ display: "grid", color: "var(--text-3)" }}><IconChevron size={20} /></motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: "hidden" }}>
                        <p className="muted" style={{ margin: 0, padding: "0 24px 22px" }}>{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------------- CTA + disclaimer ----------------------- */

export function Cta() {
  return (
    <section className="section" style={{ paddingBottom: 60 }}>
      <div className="wrap">
        <Reveal>
          <div className="card" style={{ padding: "clamp(40px, 7vw, 88px) clamp(24px, 5vw, 64px)", textAlign: "center", overflow: "hidden", position: "relative" }}>
            <div aria-hidden="true" className="grid-bg" style={{ position: "absolute", inset: 0 }} />
            <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "100%", width: 900, height: 500, transform: "translate(-50%, -50%)", background: "radial-gradient(ellipse, var(--accent-soft), transparent 65%)" }} />
            <div style={{ position: "relative" }}>
              <h2 className="hd-1" style={{ maxWidth: 780, margin: "0 auto" }}>Ready to see two AIs argue it out?</h2>
              <p className="lede" style={{ margin: "20px auto 36px" }}>It takes about a minute or two. No sign-up needed.</p>
              <Magnetic>
                <Link href="/#top" className="btn btn-primary" onClick={(e) => { e.preventDefault(); scrollToTop(); }}>
                  Start the debate <IconArrow size={19} />
                </Link>
              </Magnetic>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginTop: 28, padding: "18px 22px", borderRadius: 16, background: "var(--warn-soft)", border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)", color: "var(--text-2)", fontSize: ".92rem" }}>
            <span style={{ color: "var(--warn)", flex: "none", marginTop: 2 }}><IconAlert size={18} /></span>
            <div>
              <b style={{ color: "var(--text)" }}>For education only. Not financial advice.</b> StockDuel uses AI models and delayed public market data, and AI can make mistakes. Always do your own research before investing.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
