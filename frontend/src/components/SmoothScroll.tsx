"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/** Smooth, inertial page scrolling (Lenis), driven by GSAP's ticker so that
 *  ScrollTrigger always reads the same scroll position Lenis is animating.
 *  Lenis turns itself off for visitors who ask for reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      anchors: true, // in-page links like /#how glide instead of jumping
    });
    window.__lenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000); // GSAP time is in seconds
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Lenis remembers how tall the page is. When content grows or shrinks (a debate finishing, a panel
    // opening) that number goes stale and Lenis stops short of the real bottom, so scrolling feels
    // stuck. Re-measure whenever the height changes. Two safety nets: a ResizeObserver, plus a
    // cheap height check in case the observer misses a change.
    let queued: ReturnType<typeof setTimeout> | null = null;
    const remeasure = () => {
      if (queued) return; // already scheduled: a streaming answer changes the height many times a second
      queued = setTimeout(() => {
        queued = null;
        lenis.resize();
      }, 150);
    };
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);
    ro.observe(document.documentElement);
    let lastHeight = document.documentElement.scrollHeight;
    const watch = setInterval(() => {
      const h = document.documentElement.scrollHeight;
      if (h !== lastHeight) {
        lastHeight = h;
        lenis.resize(); // direct call: cheap, and does not depend on an animation frame
      }
    }, 300);

    lenis.resize();
    const settle = setTimeout(() => lenis.resize(), 600);

    return () => {
      clearTimeout(settle);
      clearInterval(watch);
      if (queued) clearTimeout(queued);
      ro.disconnect();
      gsap.ticker.remove(tick);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  return null;
}

/** Glide back to the top. Longer pages get a longer ride, and the motion eases in and out
 *  (gentle start, gentle stop) instead of lurching. */
export function scrollToTop() {
  const lenis = window.__lenis;
  if (!lenis) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const distance = lenis.scroll;
  const duration = Math.min(3.2, Math.max(1.2, distance / 2600));
  lenis.scrollTo(0, {
    duration,
    easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    lock: true,
    onComplete: () => ScrollTrigger.update(), // let the scroll scene settle on the right step
  });
}
