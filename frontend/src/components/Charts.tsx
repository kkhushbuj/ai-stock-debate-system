"use client";

import { useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { fmtMoney } from "@/lib/api";

/** Tiny trend line. Draws itself in when it appears. */
export function Sparkline({
  data,
  color,
  height = 56,
  className,
}: {
  data: number[];
  color: string;
  height?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const w = 240;
  const pad = 4;
  const { line, area } = useMemo(() => {
    if (data.length < 2) return { line: "", area: "" };
    const lo = Math.min(...data);
    const hi = Math.max(...data);
    const span = hi - lo || 1;
    const pts = data.map((c, i) => [pad + (i * (w - pad * 2)) / (data.length - 1), height - pad - ((c - lo) / span) * (height - pad * 2)]);
    const l = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    return { line: l, area: `${pad},${height} ${l} ${w - pad},${height}` };
  }, [data, height]);
  if (!line) return null;
  return (
    <svg className={className} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" role="img" aria-label="Recent price trend" style={{ width: "100%", height }}>
      <motion.polygon points={area} fill={color} fillOpacity={0.18} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} />
      <motion.polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

/** Full price chart with a hover read-out. */
export function AreaChart({
  dates,
  close,
  color,
  height = 260,
}: {
  dates: string[];
  close: number[];
  color: string;
  height?: number;
}) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const w = 800;
  const padL = 8;
  const padR = 8;
  const padT = 14;
  const padB = 14;

  const geo = useMemo(() => {
    if (close.length < 2) return null;
    const lo = Math.min(...close);
    const hi = Math.max(...close);
    const room = (hi - lo) * 0.14 || hi * 0.01 || 1;
    const min = lo - room;
    const max = hi + room;
    const x = (i: number) => padL + (i * (w - padL - padR)) / (close.length - 1);
    const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (height - padT - padB);
    const pts = close.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    return { x, y, pts, area: `${padL},${height - padB} ${pts} ${w - padR},${height - padB}`, min, max };
  }, [close, height]);

  if (!geo) return <div className="faint" style={{ padding: 40, textAlign: "center" }}>No price history for this range.</div>;

  const idx = hover ?? close.length - 1;
  const first = close[0];
  const change = first ? (close[idx] / first - 1) * 100 : 0;
  const label = dates[idx] ? dates[idx].replace("T", " ").slice(0, 16) : "";

  return (
    <div>
      <div className="num" style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: "1.9rem", fontWeight: 700, letterSpacing: "-0.03em" }}>{fmtMoney(close[idx])}</span>
        <span style={{ color: change >= 0 ? "var(--accent)" : "var(--bad)", fontWeight: 600 }}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
        <span className="faint" style={{ fontSize: ".85rem" }}>{label}</span>
      </div>
      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height, display: "block", touchAction: "pan-y" }}
        onPointerMove={(e) => {
          const r = ref.current!.getBoundingClientRect();
          const p = (e.clientX - r.left) / r.width;
          setHover(Math.max(0, Math.min(close.length - 1, Math.round(p * (close.length - 1)))));
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Price chart"
      >
        <polygon points={geo.area} fill={color} fillOpacity={0.16} />
        <motion.polyline
          points={geo.pts}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        {hover !== null && (
          <>
            <line x1={geo.x(hover)} x2={geo.x(hover)} y1={0} y2={height} stroke="var(--text-3)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            <circle cx={geo.x(hover)} cy={geo.y(close[hover])} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
    </div>
  );
}
