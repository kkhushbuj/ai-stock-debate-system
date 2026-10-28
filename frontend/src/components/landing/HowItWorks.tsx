"use client";

import gsap from "gsap";
import { Words, riseIn, riseWords, useScene } from "./kit";

/* One ticket, shown in four fields. It is further along each time: picked, argued, checked, scored.
 * The sentences and numbers are the ones from a real NVDA vs GOOGL run, except the disputed example. */

const FIELDS = [
  { cls: "ho-1", clause: "First, pick two.", text: "Choose any two companies from the S&P 500, or type any ticker you like." },
  { cls: "ho-2", clause: "Then they argue.", text: "Each analyst gets live data, argues for its stock, then attacks the other side's weak points." },
  { cls: "ho-3", clause: "Then a judge checks.", text: "A separate judge re-fetches the real numbers and marks every claim. It never reads the debate." },
  { cls: "ho-4", clause: "Last, one verdict.", text: "Ten locked factors turn the checked facts into a score for each stock." },
];

function Ticket({ stage }: { stage: number }) {
  return (
    <div className="tix" data-ui>
      <div className="tix-head">
        <span className="tix-t"><i className="sw sw-a" />NVDA</span>
        <span className="tix-vs">vs</span>
        <span className="tix-t"><i className="sw sw-b" />GOOGL</span>
      </div>

      {stage === 0 && (
        <>
          <div className="tix-sec"><b>Stock A</b><span>NVIDIA</span></div>
          <div className="tix-sec"><b>Stock B</b><span>Alphabet</span><small>Live market data loaded for both.</small></div>
        </>
      )}

      {stage === 1 && (
        <>
          <div className="tix-sec"><b>Round 1 · NVDA opens</b><span>NVDA&apos;s beta of 2.215 indicates higher volatility than the broader market.</span></div>
          <div className="tix-sec"><b>Round 2 · GOOGL replies</b><span>GOOGL has an elite market capitalization of $4.17 trillion.</span></div>
        </>
      )}

      {stage === 2 && (
        <>
          <div className="tix-sec"><span className="tix-chip">Verified</span><span>NVDA&apos;s beta is 2.215.</span><small>Fresh data confirms 2.215.</small></div>
          <div className="tix-sec"><span className="tix-chip tix-chip-bad">Disputed</span><span>GOOGL P/E is 12.</span><small className="num">Claimed 12, actual 27.4.</small></div>
        </>
      )}

      {stage === 3 && (
        <>
          <div className="tix-score"><span>NVDA</span>9.44 <span>/ 10</span></div>
          <div className="tix-score"><span>GOOGL</span>8.38 <span>/ 10</span></div>
          <div className="tix-split" aria-label="Confidence split: NVDA 53 percent, GOOGL 47 percent">
            <i style={{ width: "53%", background: "var(--lp-blue)" }} />
            <i style={{ flex: 1, background: "var(--lp-amber)" }} />
          </div>
        </>
      )}

      <div className="tix-prog" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <i key={i} data-on={i <= stage} />)}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const ref = useScene<HTMLElement>((root) => {
    riseWords(root);
    const grid = root.querySelector(".ho")!;
    gsap.fromTo(
      ".ho-f",
      { clipPath: "inset(100% 0% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power4.inOut", stagger: 0.12, clearProps: "clipPath", scrollTrigger: { trigger: grid, start: "top 78%", once: true } },
    );
    riseIn(root.querySelectorAll(".ho-slot, .ho-clause, .ho-text"), grid, { stagger: 0.04, delay: 0.5, start: "top 78%" });
  });

  return (
    <section id="how" ref={ref}>
      <div className="ho">
        {FIELDS.map((f, i) => (
          <div key={f.cls} className={`ho-f ${f.cls}`}>
            {i === 0 ? (
              <h2 className="lp-display lp-head ho-h"><Words text="How a duel works" /></h2>
            ) : (
              <div />
            )}
            <div className="ho-slot"><Ticket stage={i} /></div>
            <div>
              <h3 className="ho-clause">{f.clause}</h3>
              <p className="ho-text">{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
