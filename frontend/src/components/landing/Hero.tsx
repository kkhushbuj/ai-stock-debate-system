"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useLayoutEffect, useRef } from "react";
import { DuelPicker } from "../DuelPicker";

gsap.registerPlugin(ScrollTrigger);

// Runs before the browser paints when coming back to this page inside the site, so the hero is never
// seen in its finished state for a moment and then pulled apart to play its entrance.
const useBeforePaint = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Hero() {
  const ref = useRef<HTMLElement>(null);

  useBeforePaint(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const html = document.documentElement;

    // When the opening doors are on screen the hero is already finished behind them: the doors slide apart
    // and show a calm, complete page. Building the page up piece by piece while the doors move looked glitchy.
    const withDoors = html.classList.contains("doors-on");

    // The timeline is built now, paused: building it puts every part in its starting pose.
    let tl: gsap.core.Timeline | undefined;
    const ctx = gsap.context(() => {
      if (!withDoors) tl = gsap
        .timeline({ paused: true, defaults: { ease: "power4.out" } })
        .fromTo(".lp-line > span", { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.1, stagger: 0.12 })
        .from(".hero-sub", { y: 24, opacity: 0, duration: 0.9 }, "-=0.7")
        .fromTo(".ar-a", { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power4.inOut", clearProps: "clipPath" }, "-=0.6")
        .fromTo(".ar-b", { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power4.inOut", clearProps: "clipPath" }, "<")
        .from(".ar-vs-b", { scale: 0, rotate: -135, duration: 0.8, ease: "back.out(1.8)" }, "-=0.35")
        .fromTo(".actbar", { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "power4.inOut", clearProps: "clipPath" }, "-=0.5")
        .from(".qp-btn", { y: 18, opacity: 0, duration: 0.5, stagger: 0.05 }, "-=0.3")
        .from(".go-btn", { x: 40, opacity: 0, duration: 0.6 }, "<");

      // As the page scrolls, the two headline lines slide apart.
      const drift = { trigger: root, start: "top top", end: "bottom top", scrub: true };
      gsap.to(".lp-line:nth-child(1)", { xPercent: -6, ease: "none", scrollTrigger: drift });
      gsap.to(".lp-line:nth-child(2)", { xPercent: 6, ease: "none", scrollTrigger: drift });
    }, root);

    // Every part is in its starting pose, so the parts that waited behind the class can be shown.
    html.classList.add("hero-go");

    // Behind the doors nothing plays: show the finished hero. With no doors (a later visit) the entrance
    // plays as soon as the font is in.
    if (withDoors) html.classList.add("hero-static");
    else Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 800))]).then(() => tl?.play());

    // Fonts change line widths; measure the page again once they are in.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      ctx.revert();
      html.classList.remove("hero-go", "hero-static");
    };
  }, []);

  return (
    <section ref={ref} className="hero lp-ink">
      <div className="lp-wrap hero-top">
        <h1 className="lp-display lp-h1">
          <span className="lp-line"><span>Two AI<span style={{ textTransform: "none" }}>s</span> argue.</span></span>
          <span className="lp-line"><span>One judge checks.</span></span>
        </h1>
        <p className="hero-sub">Pick any two stocks. Two AI analysts debate them with live data, then a third AI re-checks every claim and scores both stocks on 10 fixed factors.</p>
      </div>
      <DuelPicker variant="arena" />
    </section>
  );
}
