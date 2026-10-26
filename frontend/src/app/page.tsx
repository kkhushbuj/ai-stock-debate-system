import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Cta, Faq, FactorsSection, SampleVerdict } from "@/components/landing/Sections";
import { TickerTape } from "@/components/landing/TickerTape";

export default function Home() {
  return (
    <div id="top">
      <Hero />
      <TickerTape />
      <HowItWorks />
      <SampleVerdict />
      <FactorsSection />
      <Faq />
      <Cta />
    </div>
  );
}
