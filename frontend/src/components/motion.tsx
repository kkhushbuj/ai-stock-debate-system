"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/** Counts up to a number when scrolled into view. */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.4,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });
  const reduce = useReducedMotion();
  const fmt = (n: number) => `${prefix}${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || !inView) {
      el.textContent = fmt(reduce ? value : 0);
      if (!inView && !reduce) return;
    }
    if (reduce) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className={`num ${className ?? ""}`}>
      {fmt(0)}
    </span>
  );
}

/** Button that is gently pulled toward the pointer. */
export function Magnetic({ children, strength = 0.25, block = false }: { children: ReactNode; strength?: number; block?: boolean }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18 });
  const sy = useSpring(y, { stiffness: 250, damping: 18 });
  return (
    <motion.div
      style={{ x: sx, y: sy, display: block ? "block" : "inline-block" }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType === "touch") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** A bar that grows from zero when scrolled into view. `pct` is 0-100. */
export function GrowBar({ pct, color, height = 8, delay = 0, immediate = false }: { pct: number; color: string; height?: number; delay?: number; immediate?: boolean }) {
  const reduce = useReducedMotion();
  // Watch the track (fixed size), not the bar itself: a bar scaled to 0 has no area to intersect.
  const track = useRef<HTMLDivElement>(null);
  const seen = useInView(track, { once: true });
  return (
    <div ref={track} style={{ height, background: "var(--surface-3)", overflow: "hidden" }}>
      <motion.div
        style={{ height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: color, transformOrigin: "left" }}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: seen || reduce || immediate ? 1 : 0 }}
        transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
