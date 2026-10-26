"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** A simple centred confirmation pop-up. Closes with Esc or a click outside; focus starts on the safe button. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop(); // keep the page still behind the pop-up
    const t = setTimeout(() => cancelRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.__lenis?.start();
    };
  }, [open, onCancel]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "grid", placeItems: "center", padding: 20, background: "rgba(3, 5, 8, 0.72)" }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: "min(480px, 100%)", padding: "28px 28px 24px", boxShadow: "0 30px 80px -20px rgba(0,0,0,.8)" }}
          >
            <h2 id="confirm-title" className="hd-3" style={{ margin: 0, fontSize: "1.3rem" }}>{title}</h2>
            <div className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>{children}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 26 }}>
              <button ref={cancelRef} className="btn btn-ghost btn-sm" onClick={onCancel}>{cancelLabel}</button>
              <button className="btn btn-sm" onClick={onConfirm} style={{ background: "var(--bad)", color: "#1a0509", border: "1px solid transparent" }}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
