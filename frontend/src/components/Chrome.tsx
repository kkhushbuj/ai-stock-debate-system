"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useDebateSession } from "@/lib/debateStore";
import { IconAlert, IconCheck, IconGithub, IconHistory, IconHome, Logo } from "./Icons";

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
    <Link
      href={href}
      style={{ color: "var(--text-2)", fontSize: ".95rem", fontWeight: 550, padding: "8px 12px", borderRadius: 10 }}
      className="nav-link"
    >
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
        transition: "background .3s, border-color .3s, backdrop-filter .3s",
        background: scrolled ? "color-mix(in srgb, var(--bg) 94%, transparent)" : "transparent",
        borderBottom: `1px solid ${scrolled ? "var(--line)" : "transparent"}`,
      }}
    >
      <div className="wrap" style={{ height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, fontWeight: 750, fontSize: "1.15rem", letterSpacing: "-0.03em" }} aria-label="StockDuel home">
          <Logo size={30} />
          StockDuel
        </Link>

        <nav aria-label="Main" style={{ display: "flex", alignItems: "center", gap: 2 }} className="hide-sm">
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
              className="btn btn-sm"
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
            <Link href="/" className="btn btn-ghost btn-sm" aria-label="Back to the home page">
              <IconHome size={17} />
              <span className="hide-xs">Home</span>
            </Link>
          )}
          <Link href="/history" className="btn btn-ghost btn-sm" aria-label="Debate history">
            <IconHistory size={17} />
            <span className="hide-xs">History</span>
          </Link>
        </div>
      </div>
      <style>{`
        .nav-link:hover { color: var(--text) !important; background: var(--surface-2); }
        @media (max-width: 760px) { .hide-sm { display: none !important; } }
        @media (max-width: 480px) { .hide-xs { display: none; } }
      `}</style>
    </motion.header>
  );
}

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--line)", marginTop: 40 }}>
      <div className="wrap" style={{ padding: "44px 24px", display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo size={26} />
          <div>
            <div style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>StockDuel</div>
            <div className="faint" style={{ fontSize: ".85rem" }}>Built by Khushbu Kapade</div>
          </div>
        </div>
        <a
          href="https://github.com/kkhushbuj/ai-stock-debate-system"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
          aria-label="GitHub repository"
        >
          <IconGithub size={17} /> GitHub
        </a>
        <div className="faint" style={{ fontSize: ".85rem", maxWidth: 360 }}>
          Powered by LangGraph and LangChain. For education only, not financial advice.
        </div>
      </div>
    </footer>
  );
}
