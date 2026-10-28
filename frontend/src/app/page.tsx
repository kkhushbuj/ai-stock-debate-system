import { Doors } from "@/components/landing/Doors";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Cta, Faq, FactorsSection, SampleVerdict } from "@/components/landing/Sections";
import { TickerTape } from "@/components/landing/TickerTape";

export default function Home() {
  return (
    <div id="top" className="lp">
      <Doors />
      <Hero />
      <TickerTape />
      <HowItWorks />
      <FactorsSection />
      <SampleVerdict />
      <Faq />
      <Cta />
    </div>
  );
}
