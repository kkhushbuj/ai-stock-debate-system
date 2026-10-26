"use client";

import { useSyncExternalStore } from "react";
import { api } from "./api";
import type { Argument, DebateResult } from "./types";

/** The debate in progress (or just finished) for this tab.
 *
 *  It lives here, outside any page, so it keeps running while the visitor looks at History or the home
 *  page. The debate page re-attaches to it when the visitor comes back, and the top bar shows a button
 *  that leads there. A full page refresh clears it (the visitor is then sent to the home page). */

export interface Live {
  step: number;
  note: string;
  r1?: { A: Argument; B: Argument };
  r2?: { A: Argument; B: Argument };
  result?: DebateResult;
  error?: { message: string; details?: string };
}

export interface Session {
  a: string;
  b: string;
  live: Live;
  startedAt: number;
  status: "running" | "done" | "failed";
  /** false while a finished result is waiting for the visitor to look at it */
  seen: boolean;
}

let session: Session | null = null;
let snapshot: Session | null = null;
let source: EventSource | null = null;
const listeners = new Set<() => void>();

function emit() {
  snapshot = session ? { ...session } : null;
  listeners.forEach((l) => l());
}

export const sameDebate = (s: Session | null, a: string, b: string) =>
  !!s && s.a.toUpperCase() === a.toUpperCase() && s.b.toUpperCase() === b.toUpperCase();

export function getSession(): Session | null {
  return snapshot;
}

export function useDebateSession(): Session | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => snapshot,
    () => null,
  );
}

function patch(live: Partial<Live>, rest: Partial<Session> = {}) {
  if (!session) return;
  session = { ...session, ...rest, live: { ...session.live, ...live } };
  emit();
}

/** Start a debate. If the same pair is already running, do nothing (so a double start cannot run it twice). */
export function startDebate(a: string, b: string) {
  if (session && session.status === "running" && sameDebate(session, a, b)) return;
  source?.close();
  session = { a, b, live: { step: 0, note: "Starting up..." }, startedAt: Date.now(), status: "running", seen: true };
  emit();

  const es = new EventSource(api.streamUrl(a, b));
  source = es;
  let finished = false;
  const current = () => source === es; // ignore events from a debate that was replaced
  const on = (name: string, fn: (d: any) => void) =>
    es.addEventListener(name, (e) => current() && fn(JSON.parse((e as MessageEvent).data)));

  on("stage", (d) => patch({ step: d.step, note: d.note }));
  on("round1", (d) => patch({ step: d.step, note: d.note, r1: { A: d.A, B: d.B } }));
  on("round2", (d) => patch({ step: d.step, note: d.note, r2: { A: d.A, B: d.B } }));
  on("done", (d: DebateResult) => {
    finished = true;
    es.close();
    // If the visitor is looking at the debate page right now, the result counts as seen; otherwise it waits.
    patch({ step: 5, note: "Debate complete", result: d }, { status: "done", seen: onDebatePage() });
  });
  on("fail", (d) => {
    finished = true;
    es.close();
    patch({ error: { message: d.message, details: d.details } }, { status: "failed" });
  });
  es.onerror = () => {
    if (finished || !current()) return;
    finished = true;
    es.close();
    patch(
      { error: { message: "We lost the connection to the server.", details: "Check that the API is running, then try again." } },
      { status: "failed" },
    );
  };
}

export function retryDebate() {
  if (!session) return;
  const { a, b } = session;
  source?.close();
  session = null;
  startDebate(a, b);
}

export function markSeen() {
  if (session && !session.seen) {
    session = { ...session, seen: true };
    emit();
  }
}

const onDebatePage = () => typeof location !== "undefined" && location.pathname.startsWith("/debate");
