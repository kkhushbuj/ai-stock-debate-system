"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Live, getSession, markSeen, retryDebate, sameDebate, startDebate, useDebateSession } from "@/lib/debateStore";
import { consumeDebateStart } from "@/lib/nav";
import { IconAlert, IconArrow, IconCheck, IconCopy } from "../Icons";
import { Magnetic } from "../motion";
import { ArgumentCard, SkeletonCard, StockCard } from "./Cards";
import { ChatPanel, FactorTable, PriceCharts, Tabs, VerdictCard, shareText } from "./Results";
import { Stepper } from "./Stepper";

function VsBadge() {
  return (
    <div className="vs-badge" aria-hidden="true" style={{ alignSelf: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 800, fontSize: ".85rem", background: "var(--surface-3)", border: "1px solid var(--line-strong)", color: "var(--text-2)" }}>VS</div>
    </div>
  );
}

function Versus({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="versus" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 18, alignItems: "stretch" }}>
      <div>{left}</div>
      <VsBadge />
      <div>{right}</div>
      <style>{`@media (max-width: 860px) { .versus { grid-template-columns: 1fr !important; } .versus .vs-badge { justify-self: center; margin: -6px 0; } }`}</style>
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
  const a = (params.get("a") || "").trim();
  const b = (params.get("b") || "").trim();
  const session = useDebateSession();

  // Who may see this page:
  //  - a visitor who just pressed "Start the debate" on the home page (starts a new debate),
  //  - a visitor coming back to a debate that is still running or finished in this tab (re-attaches to it).
  // A refresh, the back button after closing the tab, or a pasted link has neither, so it goes home.
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!a || !b) { setAllowed(true); return; }
    if (consumeDebateStart()) {
      startDebate(a, b);
      setAllowed(true);
    } else if (sameDebate(getSession(), a, b)) {
      markSeen();
      setAllowed(true);
    } else {
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

  // Real tickers come back from the server; until then use what is in the URL.
  const tA = live.result?.ticker_A ?? a.toUpperCase();
  const tB = live.result?.ticker_B ?? b.toUpperCase();
  const nameA = live.result?.name_A ?? tA;
  const nameB = live.result?.name_B ?? tB;

  if (allowed !== true) {
    return <div className="wrap" style={{ paddingTop: 160, minHeight: "60vh" }} aria-busy="true" />;
  }

  if (!a || !b) {
    return (
      <div className="wrap" style={{ paddingTop: 160, textAlign: "center" }}>
        <h1 className="hd-2">Pick two stocks to begin</h1>
        <p className="lede" style={{ margin: "14px auto 28px" }}>Choose the two companies you want to compare.</p>
        <Link href="/" className="btn btn-primary">Choose stocks <IconArrow size={18} /></Link>
      </div>
    );
  }

  const r = live.result;
  const doingA = (n: number) => (n === 1 ? "Writing the opening case..." : "Writing the rebuttal...");

  return (
    <div className="wrap" style={{ paddingTop: 110, paddingBottom: 40 }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 className="hd-1" style={{ margin: 0 }}>
          <span className="tag-a">{tA}</span> <span className="faint" style={{ fontWeight: 500 }}>vs</span> <span className="tag-b">{tB}</span>
        </h1>
        <p className="muted" style={{ margin: "10px 0 0" }}>Two AI analysts argue. A third fact-checks every claim.</p>
      </motion.div>

      <Versus left={<StockCard side="a" ticker={tA} name={nameA} />} right={<StockCard side="b" ticker={tB} name={nameB} />} />

      <div style={{ marginTop: 22 }}>
        {failed ? (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card card-pad" role="alert" style={{ borderColor: "color-mix(in srgb, var(--bad) 40%, var(--line))" }}>
            <div style={{ display: "flex", gap: 14 }}>
              <span style={{ color: "var(--bad)", marginTop: 2 }}><IconAlert size={22} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{live.error!.message}</div>
                <p className="muted" style={{ margin: "6px 0 0" }}>You can try again in a moment.</p>
                {live.error!.details && (
                  <details style={{ marginTop: 12 }}>
                    <summary className="faint" style={{ cursor: "pointer" }}>Technical details</summary>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: ".82rem", color: "var(--text-2)", background: "var(--surface-2)", padding: 14, borderRadius: 12, overflowX: "auto" }}>{live.error!.details}</pre>
                  </details>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                  <button className="btn btn-primary btn-sm" onClick={retryDebate}>Try again</button>
                  <Link href="/" className="btn btn-ghost btn-sm">Choose other stocks</Link>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <Stepper current={live.step} note={live.note} startedAt={startedAt} running={!done && !failed} finalElapsed={done ? r!.elapsed : undefined} />
        )}
      </div>

      {!failed && (
        <div style={{ marginTop: 22, display: "grid", gap: 22 }}>
          {r ? (
            <>
              <VerdictCard r={r} />
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <CopyButton text={shareText(r)} />
                <Magnetic strength={0.1}><Link href="/" className="btn btn-primary">Debate another stock <IconArrow size={18} /></Link></Magnetic>
              </motion.div>

              <div style={{ marginTop: 28 }}>
                <Tabs tabs={["Round 1 · Opening", "Round 2 · Rebuttal", "Factor breakdown", "Price charts"]}>
                  {[
                    <Versus key="r1" left={<ArgumentCard side="a" ticker={r.ticker_A} debater="Debater A" roundN={1} subtitle="Opening case" arg={r.rounds.r1_A} />} right={<ArgumentCard side="b" ticker={r.ticker_B} debater="Debater B" roundN={1} subtitle="Opening case" arg={r.rounds.r1_B} />} />,
                    <Versus key="r2" left={<ArgumentCard side="a" ticker={r.ticker_A} debater="Debater A" roundN={2} subtitle={`Rebuttal of ${r.ticker_B}`} arg={r.rounds.r2_A} />} right={<ArgumentCard side="b" ticker={r.ticker_B} debater="Debater B" roundN={2} subtitle={`Rebuttal of ${r.ticker_A}`} arg={r.rounds.r2_B} />} />,
                    <FactorTable key="f" ta={r.ticker_A} tb={r.ticker_B} rows={r.factors.map((f) => ({ ...f, weight: Math.round(f.weight * 100) }))} />,
                    <PriceCharts key="p" ta={r.ticker_A} tb={r.ticker_B} />,
                  ]}
                </Tabs>
              </div>

              <div style={{ marginTop: 28 }}>
                <ChatPanel debateId={r.id} winner={r.verdict.winner} />
              </div>
            </>
          ) : (
            <>
              <AnimatePresence mode="wait">
                {live.r1 ? (
                  <motion.div key="r1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Versus left={<ArgumentCard side="a" ticker={tA} debater="Debater A" roundN={1} subtitle="Opening case" arg={live.r1.A} typing />} right={<ArgumentCard side="b" ticker={tB} debater="Debater B" roundN={1} subtitle="Opening case" arg={live.r1.B} typing />} />
                  </motion.div>
                ) : (
                  <motion.div key="s1" exit={{ opacity: 0 }}>
                    <Versus left={<SkeletonCard side="a" ticker={tA} debater="Debater A" roundN={1} doing={doingA(1)} />} right={<SkeletonCard side="b" ticker={tB} debater="Debater B" roundN={1} doing={doingA(1)} />} />
                  </motion.div>
                )}
              </AnimatePresence>
              {live.r1 && (
                <AnimatePresence mode="wait">
                  {live.r2 ? (
                    <motion.div key="r2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Versus left={<ArgumentCard side="a" ticker={tA} debater="Debater A" roundN={2} subtitle={`Rebuttal of ${tB}`} arg={live.r2.A} typing />} right={<ArgumentCard side="b" ticker={tB} debater="Debater B" roundN={2} subtitle={`Rebuttal of ${tA}`} arg={live.r2.B} typing />} />
                    </motion.div>
                  ) : (
                    <motion.div key="s2" exit={{ opacity: 0 }}>
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
