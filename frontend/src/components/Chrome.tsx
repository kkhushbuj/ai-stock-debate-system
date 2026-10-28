"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { motion } from "motion/react";
import { useDebateSession } from "@/lib/debateStore";
import { IconAlert, IconArrow, IconCheck, IconHistory, IconHome, Logo } from "./Icons";
import { scrollToTop } from "./SmoothScroll";

export function Nav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const home = path === "/";
  // A debate that is running, or finished while the visitor was elsewhere, gets a button back to it.
  const session = useDebateSession();
  const onDebatePage = path.startsWith("/debate");
  const pill =
    session && !onDebatePage
      ? session.status === "running"
        ? { label: "Debate running", tone: "live" as const }
        : session.status === "done" && !session.seen
        ? { label: "Result ready", tone: "ok" as const }
        : session.status === "failed"
        ? { label: "Debate failed", tone: "bad" as const }
        : null
      : null;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const link = (href: string, label: string) => (
    <Link href={href} className="nav-link">
      {label}
    </Link>
  );

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "background .3s",
        background: scrolled ? "var(--lp-ink)" : "transparent",
      }}
    >
      <div className="lp-wrap" style={{ height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Link href="/" className="nav-brand" aria-label="StockDuel home">
          <Logo size={30} />
          StockDuel
        </Link>

        <nav aria-label="Main" style={{ display: "flex", alignItems: "center", gap: 4 }} className="hide-sm">
          {home && (
            <>
              {link("/#how", "How it works")}
              {link("/#factors", "Factors")}
              {link("/#faq", "FAQ")}
            </>
          )}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {pill && session && (
            <Link
              href={`/debate?a=${encodeURIComponent(session.a)}&b=${encodeURIComponent(session.b)}`}
              className="btn btn-sm nav-btn"
              aria-label={`${pill.label}: ${session.a} vs ${session.b}. Go back to it`}
              style={{
                background: pill.tone === "bad" ? "var(--bad-soft)" : "var(--accent-soft)",
                border: `1px solid ${pill.tone === "bad" ? "var(--bad)" : "var(--accent-ring)"}`,
                color: pill.tone === "bad" ? "var(--bad)" : "var(--accent)",
              }}
            >
              {pill.tone === "live" ? <span className="live-dot" /> : pill.tone === "ok" ? <IconCheck size={16} /> : <IconAlert size={16} />}
              <span className="hide-xs">{pill.label}</span>
              <span className="hide-sm" style={{ opacity: 0.8 }}>· {session.a} vs {session.b}</span>
            </Link>
          )}
          {!home && (
            <Link href="/" className="btn btn-ghost btn-sm nav-btn" aria-label="Back to the home page">
              <IconHome size={17} />
              <span className="hide-xs">Home</span>
            </Link>
          )}
          <Link href="/history" className="btn btn-ghost btn-sm nav-btn" aria-label="Debate history">
            <IconHistory size={17} />
            <span className="hide-xs">History</span>
          </Link>
        </div>
      </div>
      <style>{`
        .nav-brand { display: flex; align-items: center; gap: 11px; font-family: var(--lp-face); font-weight: 900; font-size: 1.25rem; letter-spacing: -0.05em; text-transform: uppercase; color: #fff; }
        .nav-link { color: #fff; font-family: var(--lp-face); font-size: 1rem; font-weight: 700; padding: 8px 12px; opacity: .8; transition: opacity .2s, background .2s; }
        .nav-link:hover { opacity: 1; background: var(--lp-ink-3); }
        @media (max-width: 760px) { .hide-sm { display: none !important; } }
        @media (max-width: 480px) { .hide-xs { display: none; } }
      `}</style>
    </motion.header>
  );
}

export function Footer() {
  const path = usePathname();
  // On the home page the start link glides up to the pickers; elsewhere it is a normal link home.
  const start = (e: MouseEvent<HTMLAnchorElement>) => {
    if (path === "/") {
      e.preventDefault();
      scrollToTop();
    }
  };

  return (
    <footer className="ft">
      <div className="ft-r1">
        <div className="ft-t ft-1">
          <p className="ft-lead">Two AI<span style={{ textTransform: "none" }}>s</span> argue. One judge checks. Built to learn from, not to trade on.</p>
          <p className="ft-small">For education only. Not financial advice.</p>
        </div>
        <nav className="ft-t ft-2" aria-label="Footer">
          <Link href="/#how">How it works</Link>
          <Link href="/#factors">Factors</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/history">History</Link>
        </nav>
        <div className="ft-t ft-3">
          <p className="ft-small">Built by</p>
          <p style={{ fontWeight: 900, fontSize: "1.25rem", lineHeight: 1.1 }}>Khushbu Kapade</p>
        </div>
        <a className="ft-t ft-4" href="https://github.com/kkhushbuj/ai-stock-debate-system" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository">
          <span>GitHub ↗</span>
          <span className="ft-small">Powered by LangGraph and LangChain.</span>
        </a>
      </div>
      <div className="ft-r2">
        <div className="ft-t ft-mark">
          <span className="lp-display">StockDuel</span>
        </div>
        <Link href="/#top" className="ft-t ft-go" onClick={start}>
          <span>Start a duel</span>
          <IconArrow size={64} strokeWidth={3.5} />
        </Link>
      </div>
    </footer>
  );
}
