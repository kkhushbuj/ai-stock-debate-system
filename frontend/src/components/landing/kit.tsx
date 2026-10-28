"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Fragment, useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

const calm = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The words of a headline, each in its own mask so it can rise into place. */
export function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <Fragment key={i}>
          <span className="lp-w"><span>{w === "AIs" ? <>AI<span style={{ textTransform: "none" }}>s</span></> : w}</span></span>{" "}
        </Fragment>
      ))}
    </>
  );
}

/** Runs `setup` inside a GSAP context that is undone on unmount. Visitors who ask for reduced motion
 *  get no animation at all, so they see the finished page. */
export function useScene<T extends HTMLElement>(setup: (root: T) => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || calm()) return;
    const ctx = gsap.context(() => setup(root), root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

/** Headline words rise as each heading scrolls into view. */
export function riseWords(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".lp-head").forEach((h) => {
    gsap.fromTo(
      h.querySelectorAll(".lp-w > span"),
      { yPercent: 110 },
      { yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.05, scrollTrigger: { trigger: h, start: "top 88%", once: true } },
    );
  });
}

/** Things lift and fade in, one after another, when their trigger scrolls into view. */
export function riseIn(targets: gsap.TweenTarget, trigger: Element, opts: { y?: number; stagger?: number; delay?: number; start?: string } = {}) {
  gsap.fromTo(
    targets,
    { y: opts.y ?? 36, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: opts.stagger ?? 0.1, delay: opts.delay ?? 0, scrollTrigger: { trigger, start: opts.start ?? "top 80%", once: true } },
  );
}
