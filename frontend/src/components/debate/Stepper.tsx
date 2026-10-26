"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { IconCheck } from "../Icons";

const LABELS = ["Opening", "Rebuttal", "Fact-check", "Scoring", "Verdict"];

/** current: 0-4 = that step is running, 5 = everything finished.
 *  The seconds counter lives in here, so ticking once a second only redraws this small card,
 *  not the whole debate page. */
export function Stepper({
  current,
  note,
  startedAt,
  running,
  finalElapsed,
}: {
  current: number;
  note: string;
  startedAt: number;
  running: boolean;
  finalElapsed?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  const elapsed = finalElapsed ?? Math.max(0, Math.floor((now - startedAt) / 1000));

  const finished = current >= LABELS.length;
  const progress = Math.min(1, current / (LABELS.length - 1));
  return (
    <div className="card card-pad" role="status" aria-live="polite">
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "10%", right: "10%", top: 19, height: 2, background: "var(--line)", borderRadius: 2 }}>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: "100%", background: "var(--accent)", transformOrigin: "left", borderRadius: 2 }}
          />
        </div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: `repeat(${LABELS.length}, 1fr)`, position: "relative" }}>
          {LABELS.map((label, i) => {
            const done = i < current;
            const active = i === current && !finished;
            return (
              <li key={label} aria-current={active ? "step" : undefined} style={{ display: "grid", justifyItems: "center", gap: 10 }}>
                <div
                  className={active ? "step-dot step-dot-active" : "step-dot"}
                  style={{
                    background: done ? "var(--accent)" : "var(--surface-2)", color: done ? "var(--accent-ink)" : active ? "var(--accent)" : "var(--text-3)",
                    border: `2px solid ${done || active ? "var(--accent)" : "var(--line-strong)"}`,
                  }}
                >
                  {done ? <IconCheck size={18} /> : i + 1}
                  {active && <span aria-hidden="true" className="step-ring" />}
                </div>
                <span style={{ fontSize: ".82rem", fontWeight: active || done ? 650 : 500, color: active || done ? "var(--text)" : "var(--text-3)" }}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginTop: 22, paddingTop: 16, borderTop: "1px solid var(--line)", fontSize: ".92rem" }}>
        <span className="muted">{note || (finished ? "Debate complete" : "Working...")}</span>
        <span className="num faint">Step {Math.min(current + 1, 5)} of 5 · {elapsed}s</span>
      </div>
    </div>
  );
}
