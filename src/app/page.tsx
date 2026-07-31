import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ProductScreen } from "@/components/ProductScreen";
import { HowItWorks } from "@/components/HowItWorks";
import { FeatureSpread } from "@/components/FeatureSpread";
import { DeepResearch } from "@/components/DeepResearch";
import { StatsSection } from "@/components/StatsSection";
import { ResultsSection } from "@/components/ResultsSection";
import { ThirtyDays } from "@/components/ThirtyDays";
import { CtaEngine } from "@/components/CtaEngine";
import { BlogSection } from "@/components/BlogSection";
import { FaqSection } from "@/components/FaqSection";
import { Footer } from "@/components/Footer";

function WorkflowBridge() {
  return (
    <section className="bg-gcw-bg px-5 pb-6 pt-2 md:pb-10 md:pt-4">
      <h2 className="font-heading mx-auto max-w-[900px] text-center text-[28px] font-normal italic leading-tight tracking-[-0.8px] text-gcw-ink-soft md:text-[40px] md:tracking-[-1.2px]">
        Geek Content Workflow handles research, drafts, publishing, analytics &amp; strategy
        optimization in one workflow.
      </h2>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col overflow-x-hidden bg-gcw-bg">
        <HeroSection />
        <ProductScreen />
        <WorkflowBridge />
        <HowItWorks />
        <FeatureSpread />
        <DeepResearch />
        <StatsSection />
        <ResultsSection />
        <ThirtyDays />
        <CtaEngine />
        <BlogSection />
        <FaqSection />
        <Footer />
      </main>
    </>
  );
}
