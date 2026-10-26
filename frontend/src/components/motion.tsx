"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode, type PointerEvent } from "react";

/** Fades and lifts its children in when they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}

/** Headline whose words rise in one by one. */
export function SplitText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.08em" }}>
          <motion.span
            style={{ display: "inline-block" }}
            initial={reduce ? false : { y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: delay + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

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

/** Sets --mx / --my as PERCENTAGES of the element, for .glow-card. */
export function useGlow() {
  return {
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    },
  };
}

/** A card that follows the pointer with a soft glow and a gentle 3D tilt.
 *  Tilt is derived from the card's own proportions, so every card tilts alike. */
export function TiltCard({ children, className = "", max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 220, damping: 22 });
  const sy = useSpring(ry, { stiffness: 220, damping: 22 });
  const glow = useGlow();

  return (
    <motion.div
      className={`glow-card card ${className}`}
      style={reduce ? undefined : { rotateX: sx, rotateY: sy, transformPerspective: 900 }}
      onPointerMove={(e) => {
        glow.onPointerMove(e);
        if (reduce || e.pointerType === "touch") return;
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry.set(px * max * 2);
        rx.set(-py * max * 2);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
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
    <div ref={track} style={{ height, background: "var(--surface-3)", borderRadius: 999, overflow: "hidden" }}>
      <motion.div
        style={{ height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: color, borderRadius: 999, transformOrigin: "left" }}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: seen || reduce || immediate ? 1 : 0 }}
        transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

export { useTransform };
