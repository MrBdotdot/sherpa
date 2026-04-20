"use client";

import { useState } from "react";
import Link from "next/link";

function ArrowR({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true" className="arr">
      <path d="M2.5 6 H9.5 M6.5 3 L9.5 6 L6.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const TIERS = [
  {
    k: "Free",
    name: "Free",
    priceMonthly: "$0",
    priceAnnual: "$0",
    annualBill: "Forever · unlimited playtesters",
    monthlyBill: "Forever · unlimited playtesters",
    desc: "For designers still shaping the rules. Share a preview link with your playtest group.",
    cta: "Start free",
    features: [
      "One active experience",
      "Preview link (sherpa.run/your-game)",
      "Convention Mode on any device",
      "Sherpa branding visible",
      "Playtest insights",
    ],
  },
  {
    k: "Pro",
    name: "Pro",
    priceMonthly: "$19",
    priceAnnual: "$15",
    annualBill: "Billed $180 yearly",
    monthlyBill: "Per month",
    desc: "For solo designers shipping a game to Kickstarter or a first print run.",
    cta: "Start Pro trial",
    featured: true,
    features: [
      "Unlimited experiences",
      "Your own domain (rules.yourgame.com)",
      "No Sherpa branding",
      "Permanent public URLs",
      "Print-ready QR inserts",
      "Email support",
    ],
  },
  {
    k: "Studio",
    name: "Studio",
    priceMonthly: "$49",
    priceAnnual: "$39",
    annualBill: "Billed $468 yearly",
    monthlyBill: "Per month",
    desc: "For studios and publishers with a catalog, co-designers, and international players.",
    cta: "Start Studio trial",
    features: [
      "Everything in Pro",
      "10 team seats",
      "Multi-language rulebooks, one source",
      "Expansion-aware publishing",
      "White-label player (your brand, not ours)",
      "Bulk QR generation for print runs",
      "Priority support + onboarding",
    ],
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="section pricing">
      <div className="wrap">
        <div className="pricing-head">
          <span className="kicker">Pricing</span>
          <h2 className="display">Fair plans for <em>designers</em> and <em>publishers</em>.</h2>
          <div className="seg" style={{display:'inline-flex',background:'#fff',border:'1px solid var(--line)',borderRadius:9999,padding:3,gap:2,marginTop:20}}>
            <button
              onClick={() => setAnnual(false)}
              style={{padding:'6px 16px',borderRadius:9999,background:!annual?'var(--ink)':'transparent',color:!annual?'#fff':'var(--ink-muted)',fontSize:12.5,fontWeight:600,border:0,cursor:'pointer'}}>
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              style={{padding:'6px 16px',borderRadius:9999,background:annual?'var(--ink)':'transparent',color:annual?'#fff':'var(--ink-muted)',fontSize:12.5,fontWeight:600,whiteSpace:'nowrap',border:0,cursor:'pointer'}}>
              Annual&nbsp;<span style={{opacity:0.7,marginLeft:4}}>· save 20%</span>
            </button>
          </div>
        </div>
        <div className="pricing-grid">
          {TIERS.map((t, i) => (
            <div key={i} className={`tier${t.featured ? " feature" : ""}`}>
              {t.featured && <div className="tier-badge">Most popular</div>}
              <div className="t-k">{t.k}</div>
              <h3>{t.name}</h3>
              <p className="t-desc">{t.desc}</p>
              <div className="t-price">
                <b>{annual ? t.priceAnnual : t.priceMonthly}</b>
                <small>{t.k === "Free" ? "" : "/mo"}</small>
              </div>
              <div className="t-annual">{annual ? t.annualBill : t.monthlyBill}</div>
              <ul className="t-list">
                {t.features.map((f, j) => <li key={j}>{f}</li>)}
              </ul>
              <Link className="btn btn-primary" href="/login">{t.cta} <ArrowR/></Link>
            </div>
          ))}
        </div>

        {/* Lifetime callout */}
        <div className="lifetime-row">
          <div>
            <span className="k">Lifetime · $299 one-time</span>
            <p>Pro features, forever, for one person. Unlimited games, permanent URLs, no branding.</p>
          </div>
          <Link className="btn btn-ghost" href="/login">Buy Lifetime <ArrowR/></Link>
        </div>
      </div>
    </section>
  );
}
