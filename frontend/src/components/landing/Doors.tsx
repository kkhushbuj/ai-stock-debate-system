"use client";

import gsap from "gsap";
import { useEffect } from "react";

/** Two doors, blue and amber, cover the screen when the home page first opens in a session.
 *  The words rise, then the doors slide apart. The layout script sets the `doors-on` class
 *  before the first paint; this removes it when the doors are done.
 *
 *  The timeline is built at once (so the words start out of sight) but only plays after the display
 *  font has loaded, so the letters never change shape while they are on screen. When the doors begin
 *  to part it sends `sd:doors-open`, and the hero starts its own entrance on that signal. */
export function Doors() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("doors-on")) return;
    try {
      sessionStorage.setItem("sd-doors", "1");
    } catch {}
    window.__lenis?.stop();
    let cancelled = false;
    const done = () => {
      root.classList.remove("doors-on");
      window.__lenis?.start();
    };

    let tl: gsap.core.Timeline | undefined;
    const ctx = gsap.context(() => {
      tl = gsap
        .timeline({ paused: true, onComplete: done })
        // The words rise on their own in CSS (see .doors-on in home.css); this only parts the doors.
        .to(".lp-door-l", { xPercent: -100, duration: 0.9, ease: "power4.inOut" })
        .to(".lp-door-r", { xPercent: 100, duration: 0.9, ease: "power4.inOut" }, "<")
        .call(() => window.dispatchEvent(new Event("sd:doors-open")), [], "<+=0.25");
    });

    // Wait for the font (never more than a moment) and for the words to finish rising and rest a beat,
    // then part the doors at once. If the page script was slow, the words have long since landed.
    const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);
    fontsReady.then(() => {
      const rest = Math.max(0, 1150 - performance.now());
      setTimeout(() => {
        if (!cancelled) tl?.play();
      }, rest);
    });

    // Safety net: never leave the page covered.
    const failsafe = setTimeout(done, 7000);
    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      ctx.revert();
    };
  }, []);

  return (
    <div className="lp-doors" aria-hidden="true">
      <div className="lp-door lp-door-l"><span>Stock</span></div>
      <div className="lp-door lp-door-r"><span>Duel</span></div>
    </div>
  );
}
