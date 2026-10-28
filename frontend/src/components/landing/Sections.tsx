"use client";

import gsap from "gsap";
import { CATEGORIES, FACTORS } from "@/lib/factors";
import { IconArrow } from "../Icons";
import { CountUp, Magnetic } from "../motion";
import { scrollToTop } from "../SmoothScroll";
import { Words, riseIn, riseWords, useScene } from "./kit";

/* ----------------------- The 10 factors (names only, no weights) ----------------------- */

const CATEGORY_CLASS: Record<string, string> = { Fundamental: "fc-fund", "Market Intelligence": "fc-mkt", Macro: "fc-macro", External: "fc-ext" };
const FACTOR_TILES = CATEGORIES.flatMap((c) => FACTORS.filter((f) => f.category === c));

export function FactorsSection() {
  const ref = useScene<HTMLElement>((root) => {
    riseWords(root);
    riseIn(root.querySelectorAll(".fc-note"), root.querySelector(".fc-top")!, { y: 24 });
    gsap.fromTo(
      ".fc-t",
      { clipPath: "inset(100% 0% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "power4.inOut", stagger: 0.06, clearProps: "clipPath", scrollTrigger: { trigger: root.querySelector(".fc-grid"), start: "top 85%", once: true } },
    );
  });

  return (
    <section id="factors" ref={ref} className="fc">
      <div className="lp-wrap fc-top">
        <h2 className="lp-display lp-head fc-h"><Words text="10 factors, locked first." /></h2>
        <p className="fc-note">Every factor is fixed before a debate starts, so no AI can pick its own rules mid-debate.</p>
      </div>
      <ul className="fc-grid" aria-label="The 10 scoring factors">
        {FACTOR_TILES.map((f) => (
          <li key={f.id} className={`fc-t ${CATEGORY_CLASS[f.category]}`}>
            <span className="fc-name">{f.name}</span>
            <span className="fc-cat">{f.category}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ----------------------- Transparent example ----------------------- */

export function SampleVerdict() {
  const ref = useScene<HTMLElement>((root) => {
    riseWords(root);
    riseIn(root.querySelectorAll(".vd-lede > *"), root.querySelector(".vd-head")!, { y: 24, stagger: 0.12 });
    gsap.fromTo(
      ".vd-s",
      { clipPath: "inset(0% 0% 100% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power4.inOut", stagger: 0.15, clearProps: "clipPath", scrollTrigger: { trigger: root.querySelector(".vd-split"), start: "top 80%", once: true } },
    );
    gsap.fromTo(".vd-bar", { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: "power4.out", clearProps: "transform", scrollTrigger: { trigger: root.querySelector(".vd-conf"), start: "top 92%", once: true } });
  });

  return (
    <section id="example" ref={ref}>
      <div className="vd-head lp-paper">
        <h2 className="lp-display lp-head vd-h"><Words text="See exactly why one stock wins" /></h2>
        <div className="vd-lede">
          <p>Every claim gets a status you can hover for its source. The final score follows fixed rules, so no AI can pick its own rules mid-debate.</p>
          <ul>
            <li>Verified, unverified and disputed claims are labelled on every argument.</li>
            <li>Wrong numbers are shown next to the real ones from the data.</li>
            <li>A factor-by-factor table shows where each stock is stronger.</li>
          </ul>
        </div>
      </div>

      <div className="vd-split">
        <div className="vd-s vd-a">
          <div className="vd-t">NVDA <span>NVIDIA · from a real run</span></div>
          <div className="vd-n"><CountUp value={9.44} decimals={2} /><small>/ 10</small></div>
          <div className="vd-claim">
            <b>Verified</b>
            <span>NVDA&apos;s beta of 2.215 indicates higher volatility than the broader market.</span>
            <small>Source: valuation data. Fresh data confirms 2.215.</small>
          </div>
        </div>
        <div className="vd-s vd-b">
          <div className="vd-t">GOOGL <span>Alphabet · from a real run</span></div>
          <div className="vd-n"><CountUp value={8.38} decimals={2} /><small>/ 10</small></div>
          <div className="vd-claim">
            <b>Verified</b>
            <span>GOOGL has an elite market capitalization of $4.17 trillion.</span>
            <small>Source: valuation data. Matches the fetched data.</small>
          </div>
        </div>
      </div>

      <div className="vd-conf lp-ink">
        <div className="vd-bar" role="img" aria-label="Confidence split: NVDA 53 percent, GOOGL 47 percent">
          <div className="vd-bar-a">NVDA 53.0%</div>
          <div className="vd-bar-b">GOOGL 47.0%</div>
        </div>
        <p>Confidence split. 50% would be dead even.</p>
      </div>
    </section>
  );
}

/* ----------------------- FAQ ----------------------- */

const FAQ = [
  { q: "Is this financial advice?", a: "No. StockDuel is a learning project. It shows what two AI analysts argued and what a judge could verify. It is not a recommendation to buy or sell anything." },
  { q: "Where does the data come from?", a: "Prices and company numbers come from Yahoo Finance, news from Tavily search, and the interest rate from the US Federal Reserve data service. Public data can be delayed." },
  { q: "How does the fact-check work?", a: "After both rounds, a separate judge fetches the numbers again by itself. It marks every claim as verified, unverified or disputed, and shows the real value next to any wrong one." },
  { q: "Can the AI be wrong?", a: "Yes. AI models make mistakes, and data can be late or missing. That is why every claim is checked and why the page tells you when the fact-check could not run." },
  { q: "How long does a debate take?", a: "Usually one to two minutes. You can watch each step finish live on the debate page." },
];

export function Faq() {
  const ref = useScene<HTMLElement>((root) => {
    riseWords(root);
    riseIn(root.querySelectorAll(".fq-t"), root.querySelector(".fq-list")!, { y: 28, stagger: 0.08, start: "top 85%" });
  });

  return (
    <section id="faq" ref={ref} className="fq">
      <h2 className="lp-display lp-head fq-h"><Words text="Good to know" /></h2>
      <div className="fq-list">
        {FAQ.map((f, i) => (
          <details key={f.q} className="fq-t" open={i === 0 ? true : undefined} {...({ name: "faq" } as object)}>
            <summary>
              {f.q}
              <span className="fq-plus" aria-hidden="true" />
            </summary>
            <p className="fq-a">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ----------------------- Closing field + disclaimer ----------------------- */

export function Cta() {
  const ref = useScene<HTMLElement>((root) => {
    riseWords(root);
    riseIn(root.querySelectorAll(".cta-act > *, .cta-note"), root.querySelector(".cta-act")!, { y: 28, stagger: 0.12, start: "top 90%" });
  });

  return (
    <section ref={ref} className="cta">
      <div>
        <h2 className="lp-display lp-head cta-h"><Words text="Ready to see two AIs argue it out?" /></h2>
        <div className="cta-act">
          <Magnetic>
            <button type="button" className="go-btn" onClick={scrollToTop}>
              Start the debate <IconArrow size={26} />
            </button>
          </Magnetic>
          <p>It takes about a minute or two. No sign-up needed.</p>
        </div>
      </div>
      <p className="cta-note">
        For education only. Not financial advice. StockDuel uses AI models and delayed public market data, and AI can make mistakes. Always do your own research before investing.
      </p>
    </section>
  );
}
