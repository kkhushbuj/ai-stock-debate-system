"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Live, getSession, markSeen, retryDebate, sameDebate, startDebate, useDebateSession } from "@/lib/debateStore";
import { consumeDebateStart, releaseDoors } from "@/lib/nav";
import { IconAlert, IconArrow, IconCheck, IconCopy } from "../Icons";
import { Magnetic } from "../motion";
import { ArgumentCard, SkeletonCard, StockCard } from "./Cards";
import { ChatPanel, FactorTable, PriceCharts, Tabs, VerdictCard, prefetchPrices, shareText } from "./Results";
import { Stepper } from "./Stepper";

/** Two doors, blue and amber, part once when a debate starts: the same opening as the home page. */
function Intro() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    // These doors are shut and cover the screen exactly like the ones from the home page, so the home page's doors can go.
    releaseDoors();
    const t = setTimeout(() => setGone(true), 1400);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="dv-intro" aria-hidden="true">
      <motion.div className="dv-a" initial={{ x: 0 }} animate={{ x: "-100%" }} transition={{ duration: 0.9, delay: 0.25, ease: [0.76, 0, 0.24, 1] }} />
      <motion.div className="dv-b" initial={{ x: 0 }} animate={{ x: "100%" }} transition={{ duration: 0.9, delay: 0.25, ease: [0.76, 0, 0.24, 1] }} />
    </div>
  );
}

/** Two columns side by side. `fields` makes them the full-width blue and amber bar with a VS diamond. */
function Versus({ left, right, fields = false }: { left: React.ReactNode; right: React.ReactNode; fields?: boolean }) {
  if (fields) {
    return (
      <div className="dv-vs">
        <div>{left}</div>
        <div>{right}</div>
        <div className="ar-vs" aria-hidden="true"><div className="ar-vs-b"><span>VS</span></div></div>
      </div>
    );
  }
  return (
    <div className="dv-rounds">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState<"idle" | "ok" | "fail">("idle");
  return (
    <button
      className="btn btn-ghost"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone("ok"); } catch { setDone("fail"); }
        setTimeout(() => setDone("idle"), 2200);
      }}
    >
      {done === "ok" ? <IconCheck size={18} /> : <IconCopy size={18} />}
      {done === "ok" ? "Copied" : done === "fail" ? "Copy failed" : "Copy result"}
    </button>
  );
}

export function DebateView() {
  const params = useSearchParams();
  const router = useRouter();
  const reduce = useReducedMotion();
  const a = (params.get("a") || "").trim();
  const b = (params.get("b") || "").trim();
  const session = useDebateSession();

  // Who may see this page:
  //  - a visitor who just pressed "Start the debate" on the home page (starts a new debate),
  //  - a visitor coming back to a debate that is still running or finished in this tab (re-attaches to it).
  // A refresh, the back button after closing the tab, or a pasted link has neither, so it goes home.
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (!a || !b) { releaseDoors(); setAllowed(true); return; }
    if (consumeDebateStart()) {
      startDebate(a, b);
      setFresh(true);
      setAllowed(true);
    } else if (sameDebate(getSession(), a, b)) {
      releaseDoors();
      markSeen();
      setAllowed(true);
    } else {
      releaseDoors();
      setAllowed(false);
      router.replace("/");
    }
  }, [a, b, router]);
  // A result that finishes while the visitor is on this page counts as seen.
  useEffect(() => { if (session?.status === "done") markSeen(); }, [session?.status]);

  const mine = allowed === true && sameDebate(session, a, b) ? session : null;
  const live: Live = mine?.live ?? { step: 0, note: "Starting up..." };
  const startedAt = mine?.startedAt ?? Date.now();
  const done = !!live.result;
  const failed = !!live.error;

  // As soon as the result is in, fetch all the price ranges quietly, so the Price charts tab opens ready.
  const resultId = live.result?.id;
  useEffect(() => {
    const x = live.result;
    if (x) prefetchPrices(x.ticker_A, x.ticker_B);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId]);

  // Real tickers come back from the server; until then use what is in the URL.
  const tA = live.result?.ticker_A ?? a.toUpperCase();
  const tB = live.result?.ticker_B ?? b.toUpperCase();
  const nameA = live.result?.name_A ?? tA;
  const nameB = live.result?.name_B ?? tB;

  if (allowed !== true) {
    return <div className="dv" style={{ minHeight: "100vh" }} aria-busy="true" />;
  }

  if (!a || !b) {
    return (
      <div className="dv">
        <section className="dv-top" style={{ minHeight: "80vh" }}>
          <h1 className="lp-display dv-h1" style={{ fontSize: "clamp(2.4rem, 8vw, 8rem)" }}>Pick two stocks to begin.</h1>
          <p className="dv-sub">Choose the two companies you want to compare.</p>
          <Link href="/" className="go-btn" style={{ marginTop: 32, display: "inline-flex", background: "var(--lp-green)", color: "var(--lp-ink)" }}>
            Choose stocks <IconArrow size={26} />
          </Link>
        </section>
      </div>
    );
  }

  const r = live.result;
  const doingA = (n: number) => (n === 1 ? "Writing the opening case..." : "Writing the rebuttal...");

  return (
    <div className="dv">
      {fresh && !reduce && <Intro />}

      <section className="dv-top">
        <h1 className="lp-display dv-h1">
          <span className="tag-a">{tA}</span> <span className="dv-vs-word">vs</span> <span className="tag-b">{tB}</span>
        </h1>
        <p className="dv-sub">Two AI analysts argue. A third fact-checks every claim.</p>
      </section>

      <Versus fields left={<StockCard side="a" ticker={tA} name={nameA} />} right={<StockCard side="b" ticker={tB} name={nameB} />} />

      {failed ? (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="dv-fail" role="alert">
          <span style={{ color: "var(--bad)" }}><IconAlert size={26} /></span>
          <h2>{live.error!.message}</h2>
          <p className="muted">You can try again in a moment.</p>
          {live.error!.details && (
            <details>
              <summary className="faint" style={{ cursor: "pointer" }}>Technical details</summary>
              <pre>{live.error!.details}</pre>
            </details>
          )}
          <div className="dv-acts">
            <button className="btn btn-primary btn-sm" onClick={retryDebate}>Try again</button>
            <Link href="/" className="btn btn-ghost btn-sm">Choose other stocks</Link>
          </div>
        </motion.div>
      ) : (
        <Stepper current={live.step} note={live.note} startedAt={startedAt} running={!done && !failed} finalElapsed={done ? r!.elapsed : undefined} />
      )}

      {!failed && (
        <div className="dv-body">
          {r ? (
            <>
              <VerdictCard r={r} />
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="dv-acts">
                <CopyButton text={shareText(r)} />
                <Magnetic strength={0.1}><Link href="/" className="btn btn-primary">Debate another stock <IconArrow size={18} /></Link></Magnetic>
              </motion.div>

              <Tabs tabs={["Round 1 · Opening", "Round 2 · Rebuttal", "Factor breakdown", "Price charts"]}>
                {[
                  <Versus key="r1" left={<ArgumentCard side="a" ticker={r.ticker_A} debater="Debater A" roundN={1} subtitle="Opening case" arg={r.rounds.r1_A} />} right={<ArgumentCard side="b" ticker={r.ticker_B} debater="Debater B" roundN={1} subtitle="Opening case" arg={r.rounds.r1_B} />} />,
                  <Versus key="r2" left={<ArgumentCard side="a" ticker={r.ticker_A} debater="Debater A" roundN={2} subtitle={`Rebuttal of ${r.ticker_B}`} arg={r.rounds.r2_A} />} right={<ArgumentCard side="b" ticker={r.ticker_B} debater="Debater B" roundN={2} subtitle={`Rebuttal of ${r.ticker_A}`} arg={r.rounds.r2_B} />} />,
                  <FactorTable key="f" ta={r.ticker_A} tb={r.ticker_B} rows={r.factors.map((f) => ({ ...f, weight: Math.round(f.weight * 100) }))} />,
                  <PriceCharts key="p" ta={r.ticker_A} tb={r.ticker_B} />,
                ]}
              </Tabs>

              <ChatPanel debateId={r.id} winner={r.verdict.winner} />
            </>
          ) : (
            <>
              {/* popLayout: the waiting card is lifted out of the flow and fades away underneath while the finished
                  card takes its exact place, so the page never collapses and re-opens between the two. */}
              <AnimatePresence mode="popLayout" initial={false}>
                {live.r1 ? (
                  <motion.div key="r1">
                    <Versus left={<ArgumentCard side="a" ticker={tA} debater="Debater A" roundN={1} subtitle="Opening case" arg={live.r1.A} typing />} right={<ArgumentCard side="b" ticker={tB} debater="Debater B" roundN={1} subtitle="Opening case" arg={live.r1.B} typing />} />
                  </motion.div>
                ) : (
                  <motion.div key="s1" exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                    <Versus left={<SkeletonCard side="a" ticker={tA} debater="Debater A" roundN={1} doing={doingA(1)} />} right={<SkeletonCard side="b" ticker={tB} debater="Debater B" roundN={1} doing={doingA(1)} />} />
                  </motion.div>
                )}
              </AnimatePresence>
              {live.r1 && (
                <AnimatePresence mode="popLayout" initial={false}>
                  {live.r2 ? (
                    <motion.div key="r2">
                      <Versus left={<ArgumentCard side="a" ticker={tA} debater="Debater A" roundN={2} subtitle={`Rebuttal of ${tB}`} arg={live.r2.A} typing />} right={<ArgumentCard side="b" ticker={tB} debater="Debater B" roundN={2} subtitle={`Rebuttal of ${tA}`} arg={live.r2.B} typing />} />
                    </motion.div>
                  ) : (
                    <motion.div key="s2" exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                      <Versus left={<SkeletonCard side="a" ticker={tA} debater="Debater A" roundN={2} doing={doingA(2)} />} right={<SkeletonCard side="b" ticker={tB} debater="Debater B" roundN={2} doing={doingA(2)} />} />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
