import type { Metadata } from "next";
import "./_components/landing/landing.css";
import { Nav, Hero, How, Feats, Showcase, FAQ, CTABand, Footer } from "@/app/_components/landing/sections";
import { DemoSection } from "@/app/_components/landing/demo";
import { PricingSection } from "@/app/_components/landing/pricing";
import { LandingStructuredData } from "@/app/_components/landing/structured-data";
import { SITE_URL, SOFTWARE_DESCRIPTION } from "@/app/_lib/site-config";

const LANDING_TITLE = "Sherpa — Interactive rulebooks for board games";

export const metadata: Metadata = {
  title: LANDING_TITLE,
  description: SOFTWARE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: LANDING_TITLE,
    description: SOFTWARE_DESCRIPTION,
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: LANDING_TITLE,
    description: SOFTWARE_DESCRIPTION,
  },
};

export default function LandingPage() {
  return (
    <>
      <LandingStructuredData />
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
    </>
  );
}
