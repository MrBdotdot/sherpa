import "./_components/landing/landing.css";
import { Nav, Hero, How, Feats, Showcase, FAQ, CTABand, Footer } from "@/app/_components/landing/sections";
import { DemoSection } from "@/app/_components/landing/demo";
import { PricingSection } from "@/app/_components/landing/pricing";

export default function LandingPage() {
  return (
    <div className="sherpa-landing">
      <Nav />
      <Hero />
      <How />
      <Feats />
      <DemoSection />
      <Showcase />
      <PricingSection />
      <FAQ />
      <CTABand />
      <Footer />
    </div>
  );
}
