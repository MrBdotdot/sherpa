"use client";

import { useState } from "react";

function ArrowR({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true" className="arr">
      <path d="M2.5 6 H9.5 M6.5 3 L9.5 6 L6.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const STEPS = [
  { x: 26, y: 34, label: "The Board",     title: "The trail, laid out space by space.",   body: "Kestrel Pass is played on a 15-space mountain trail. Each player moves their pass-holder from Start to the summit over three Ages.", comp: "BOARD" },
  { x: 48, y: 52, label: "Your Pass-Holder", title: "This meeple is you.",               body: "Place your pass-holder on the Start space. On your turn, move one to three spaces. Sherpa will tell you how on the next card.", comp: "MEEPLE" },
  { x: 78, y: 22, label: "Event Deck",    title: "Draw an Event when you stop.",          body: "When your pass-holder ends a move on an event space (the copper circles), draw the top card of the Event deck and resolve it.", comp: "EVENT DECK" },
  { x: 82, y: 74, label: "Dice",          title: "Two dice. Two choices.",               body: "Most events ask you to roll both dice. You may spend a Resolve token to re-roll one, but you only have three for the whole game.", comp: "DICE · 2d6" },
];

const TRAIL: [number,number][] = [
  [110,180],[150,190],[190,210],[230,225],[270,240],
  [310,260],[350,275],[385,290],[415,310],[430,340],
  [400,370],[355,385],[305,390],[255,385],[200,360],
];

function Board() {
  return (
    <svg viewBox="0 0 720 480" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%'}}>
      <defs>
        <radialGradient id="tbl" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#f6efe1"/>
          <stop offset="100%" stopColor="#d9cdb5"/>
        </radialGradient>
        <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 0 L40 0 L40 40" fill="none" stroke="#b8a88b" strokeWidth="0.6" opacity="0.4"/>
        </pattern>
      </defs>
      <rect width="720" height="480" fill="url(#tbl)"/>
      <rect width="720" height="480" fill="url(#grid2)"/>
      <rect x="44" y="48" width="520" height="400" rx="10" fill="#e7d7ad" stroke="#8a7658" strokeWidth="2"/>
      <rect x="60" y="64" width="488" height="368" rx="6" fill="none" stroke="#8a7658" strokeDasharray="4 3" opacity="0.55"/>
      <text x="304" y="90" textAnchor="middle" fontFamily="var(--font-display)" fontSize="20" fill="#3a2a14" opacity="0.6">Kestrel Pass</text>
      <text x="304" y="106" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="9" letterSpacing="0.2em" fill="#6b5632" opacity="0.7">THE MOUNTAIN TRAIL · AGE I</text>
      {TRAIL.map(([x,y],i) => {
        const isEvent = i % 4 === 2;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="16" fill={isEvent ? "#c4a46a" : "#f6efe1"} stroke="#6b5632" strokeWidth="1.5"/>
            {isEvent && <text x={x} y={y+4} textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fill="#3a2a14">★</text>}
            {i === 0 && <text x={x} y={y-22} textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8" fill="#3a2a14" letterSpacing="0.14em" fontWeight="700">START</text>}
            {i === 14 && <text x={x} y={y-22} textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8" fill="#3a2a14" letterSpacing="0.14em" fontWeight="700">SUMMIT</text>}
          </g>
        );
      })}
      <g transform="translate(150, 180)">
        <path d="M0 -10 a10 10 0 1 1 0 -0.1 M0 -10 l-10 20 l20 0 Z" fill="#c84a3b" stroke="#6b2a1f" strokeWidth="1"/>
      </g>
      <g transform="translate(190, 210)">
        <path d="M0 -9 a9 9 0 1 1 0 -0.1 M0 -9 l-8 16 l16 0 Z" fill="#2f6b8f" stroke="#15374a" strokeWidth="1"/>
      </g>
      <g transform="translate(610,120) rotate(-4)">
        <rect x="-36" y="-48" width="72" height="96" rx="6" fill="#c4a46a" stroke="#6b5632" strokeWidth="1.6"/>
        <text x="0" y="-6" textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fill="#3a2a14">Event</text>
        <text x="0" y="10" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="7" letterSpacing="0.14em" fill="#6b5632">DECK · 32</text>
      </g>
      <g transform="translate(600,360) rotate(-6)">
        <rect x="-18" y="-18" width="36" height="36" rx="6" fill="#fbf7ed" stroke="#6b5632" strokeWidth="1.6"/>
        <circle cx="-7" cy="-7" r="3" fill="#3a2a14"/>
        <circle cx="7" cy="7" r="3" fill="#3a2a14"/>
        <circle cx="-7" cy="7" r="3" fill="#3a2a14"/>
        <circle cx="7" cy="-7" r="3" fill="#3a2a14"/>
        <circle cx="0" cy="0" r="3" fill="#3a2a14"/>
      </g>
      <g transform="translate(645,395) rotate(16)">
        <rect x="-16" y="-16" width="32" height="32" rx="6" fill="#fbf7ed" stroke="#6b5632" strokeWidth="1.4"/>
        <circle cx="0" cy="0" r="3" fill="#3a2a14"/>
        <circle cx="-6" cy="-6" r="3" fill="#3a2a14"/>
        <circle cx="6" cy="6" r="3" fill="#3a2a14"/>
      </g>
      <g transform="translate(90, 420)">
        <circle cx="0" cy="0" r="10" fill="#b84a2e" stroke="#6b2a1f" strokeWidth="1.2"/>
        <circle cx="22" cy="0" r="10" fill="#b84a2e" stroke="#6b2a1f" strokeWidth="1.2"/>
        <circle cx="44" cy="0" r="10" fill="#b84a2e" stroke="#6b2a1f" strokeWidth="1.2"/>
        <text x="22" y="28" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="7" fill="#3a2a14" letterSpacing="0.14em">RESOLVE · 3</text>
      </g>
    </svg>
  );
}

export function DemoSection() {
  const [step, setStep] = useState(0);
  const s = STEPS[step];

  return (
    <section id="demo" className="section demo">
      <div className="wrap">
        <div className="demo-head">
          <span className="kicker">Try a Sherpa rulebook</span>
          <h2 className="display">Learn a game you&apos;ve <em>never played</em>, in under a minute.</h2>
          <p className="lede" style={{maxWidth:'54ch'}}>This is a live Sherpa rulebook for <em>Kestrel Pass</em>, a fictional deckbuilder. Step through it exactly like a new player would at the table.</p>
        </div>

        <div className="demo-stage">
          <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#1a2875,#293B9C 60%,#3C5BD5)'}}/>
          <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.12) 1.4px, transparent 0)',backgroundSize:'32px 32px',opacity:0.35}}/>

          {/* Left rail */}
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:240,background:'rgba(10,14,42,0.55)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',borderRight:'1px solid rgba(255,255,255,0.1)',padding:'28px 22px',color:'#fff',display:'flex',flexDirection:'column',gap:18,zIndex:5}}>
            <div style={{fontFamily:'var(--font-mono, monospace)',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(255,255,255,0.55)'}}>Kestrel Pass</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:20,lineHeight:1.2,letterSpacing:'-0.01em'}}>Learn to play</div>
            <div style={{height:1,background:'rgba(255,255,255,0.12)',margin:'4px 0'}}/>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {STEPS.map((st, i) => {
                const state = i < step ? 'visited' : i === step ? 'active' : 'upcoming';
                return (
                  <button key={i} onClick={() => setStep(i)}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,textAlign:'left',background:state==='active'?'rgba(255,255,255,0.08)':'transparent',color:state==='upcoming'?'rgba(255,255,255,0.5)':'#fff',fontSize:13,fontFamily:'inherit',border:0,cursor:'pointer'}}>
                    <span style={{width:24,height:24,borderRadius:9999,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flex:'0 0 auto',background:state==='active'?'#5B7AF5':state==='visited'?'rgba(255,255,255,0.2)':'transparent',border:state==='upcoming'?'1px solid rgba(255,255,255,0.35)':'none',color:state==='visited'?'rgba(255,255,255,0.75)':'#fff'}}>
                      {state==='visited' ? '✓' : i+1}
                    </span>
                    {st.label}
                  </button>
                );
              })}
            </div>
            <div style={{marginTop:'auto'}}>
              <div style={{height:4,background:'rgba(255,255,255,0.12)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${((step+1)/STEPS.length)*100}%`,background:'#5B7AF5',transition:'width 300ms cubic-bezier(0.22,1,0.36,1)'}}/>
              </div>
              <div style={{marginTop:8,fontFamily:'var(--font-mono, monospace)',fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(255,255,255,0.55)',display:'flex',justifyContent:'space-between'}}>
                <span>Step {step+1} / {STEPS.length}</span><span>{Math.round(((step+1)/STEPS.length)*100)}%</span>
              </div>
            </div>
          </div>

          {/* Board canvas */}
          <div style={{position:'absolute',left:240,right:0,top:0,bottom:0,padding:'40px 48px',overflow:'hidden'}}>
            <div style={{background:'#fbf7ed',borderRadius:14,height:'100%',boxShadow:'0 30px 60px -15px rgba(0,0,0,0.35)',overflow:'hidden',position:'relative'}}>
              <Board/>
              {STEPS.map((st, i) => (
                <button key={i} onClick={() => setStep(i)}
                  className={i===step ? 'hs selected' : 'hs'}
                  style={{left:`${st.x}%`,top:`${st.y}%`,border:0,padding:0,background:'transparent',cursor:'pointer'}}>
                  <i/>
                </button>
              ))}
              <div style={{position:'absolute',left:`clamp(6%, ${Math.max(s.x-14, 6)}%, 56%)`,top:`clamp(10%, ${Math.min(s.y+6, 62)}%, 62%)`,width:280,background:'#fff',borderRadius:14,boxShadow:'0 24px 48px -12px rgba(0,0,0,0.35)',padding:'18px 20px',zIndex:20,border:'1px solid rgba(255,255,255,0.6)',transition:'left 300ms cubic-bezier(0.22,1,0.36,1), top 300ms cubic-bezier(0.22,1,0.36,1)'}}>
                <div style={{fontFamily:'var(--font-mono, monospace)',fontSize:10,letterSpacing:'0.16em',textTransform:'uppercase',color:'#78746c',marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:5,height:5,borderRadius:99,background:'#5B7AF5'}}/>
                  {s.comp} · {step+1} of {STEPS.length}
                </div>
                <h4 style={{fontFamily:'var(--font-display)',fontWeight:400,fontSize:19,letterSpacing:'-0.01em',margin:'0 0 6px',color:'#101314'}}>{s.title}</h4>
                <p style={{margin:'0 0 14px',fontSize:12.5,color:'#4a443b',lineHeight:1.5}}>{s.body}</p>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <button onClick={() => setStep(Math.max(0, step-1))} disabled={step===0}
                    style={{fontSize:11,color:step===0?'#c4bdb0':'#78746c',background:'transparent',border:0,cursor:step===0?'default':'pointer',fontFamily:'inherit'}}>
                    ← Back
                  </button>
                  <button onClick={() => setStep(Math.min(STEPS.length-1, step+1))} disabled={step===STEPS.length-1}
                    style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:99,background:step===STEPS.length-1?'#dcfce7':'#101314',color:step===STEPS.length-1?'#166534':'#fff',fontSize:12,fontWeight:600,border:0,cursor:step===STEPS.length-1?'default':'pointer',fontFamily:'inherit'}}>
                    {step===STEPS.length-1 ? '✓ Ready to play' : 'Next'}
                    {step!==STEPS.length-1 && <ArrowR size={10}/>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{marginTop:20,fontFamily:'var(--font-mono, monospace)',fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',color:'#78746c'}}>
          This is the real Sherpa player, exactly what your players see at the table
        </div>
      </div>
    </section>
  );
}
