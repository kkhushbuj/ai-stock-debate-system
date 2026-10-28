"use client";

import { useEffect, useState } from "react";

const LABELS = ["Opening", "Rebuttal", "Fact-check", "Scoring", "Verdict"];

/** current: 0-4 = that step is running, 5 = everything finished.
 *  The seconds counter lives in here, so ticking once a second only redraws this small block,
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

  return (
    <div className="dv-step" role="status" aria-live="polite" data-done={finished}>
      <ol className="dv-steps">
        {LABELS.map((label, i) => {
          const state = i < current ? "done" : i === current && !finished ? "active" : "todo";
          return (
            <li key={label} className="dv-s" data-state={state} aria-current={state === "active" ? "step" : undefined}>
              <span className="dv-sbar" aria-hidden="true" />
              <span className="dv-slab">{label}</span>
            </li>
          );
        })}
      </ol>
      <div className="dv-sfoot">
        <span className="dv-snote">{note || (finished ? "Debate complete" : "Working...")}</span>
        <span className="dv-stime num">Step {Math.min(current + 1, 5)} of 5 · {elapsed}s</span>
      </div>
    </div>
  );
}
