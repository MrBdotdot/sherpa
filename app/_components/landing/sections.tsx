import React from "react";
import Link from "next/link";
import { GALLERY_ENTRIES } from "@/app/_lib/gallery-data";

function ArrowR({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true" className="arr">
      <path d="M2.5 6 H9.5 M6.5 3 L9.5 6 L6.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SherpaIcon() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/sherpa-icon.svg" alt="" width="30" height="30" aria-hidden="true" style={{display:'block'}}/>;
}

export function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link href="/" className="nav-brand">
          <SherpaIcon />
          <b>Sherpa</b>
        </Link>
        <nav className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#demo">Learn to play</a>
          <a href="#showcase">Games</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="nav-spacer"/>
        <div className="nav-cta">
          <Link className="nav-signin" href="/login?returnUrl=/studio">Sign in</Link>
          <Link className="btn btn-primary" href="/login?returnUrl=/studio">Start free <ArrowR/></Link>
        </div>
      </div>
    </header>
  );
}

function HeroCanvas() {
  return (
    <div className="hero-canvas-wrap">
      <div className="hero-canvas-bg hero-table"/>
      <svg className="hero-board" viewBox="0 0 600 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="boardShade" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#f6efe1"/>
            <stop offset="100%" stopColor="#d9cdb5"/>
          </radialGradient>
          <pattern id="boardGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M0 0 L48 0 L48 48" fill="none" stroke="#b8a88b" strokeWidth="0.6" opacity="0.4"/>
          </pattern>
          <filter id="boardShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6"/>
          </filter>
        </defs>
        <rect x="58" y="50" width="484" height="350" rx="8" fill="#2a1e10" opacity="0.25" filter="url(#boardShadow)"/>
        <rect x="50" y="42" width="500" height="360" rx="10" fill="url(#boardShade)" stroke="#8a7658" strokeWidth="2"/>
        <rect x="50" y="42" width="500" height="360" rx="10" fill="url(#boardGrid)"/>
        <rect x="66" y="58" width="468" height="328" rx="6" fill="none" stroke="#8a7658" strokeWidth="1" strokeDasharray="4 3" opacity="0.55"/>
        <g transform="translate(130,130)">
          <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" fill="#c4a46a" stroke="#6b5632" strokeWidth="1.6"/>
          <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" fill="none" stroke="#6b5632" strokeWidth="1" opacity="0.5"/>
          <text x="0" y="4" textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" fill="#3a2a14">Draw</text>
        </g>
        <g stroke="#8a7658" strokeWidth="1.5" fill="#f6efe1">
          {([
            [210,110],[250,120],[290,135],[330,155],[370,180],
            [400,215],[420,255],[430,300],[420,340],[390,370],
            [340,380],[290,370],[250,350],[220,320],[200,285],
          ] as [number,number][]).map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r="13" fill={i%4===0?"#a8814e":"#efe4cc"}/>
          ))}
        </g>
        <text x="210" y="113" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="9" fill="#3a2a14" fontWeight="700">ST</text>
        <text x="200" y="289" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8" fill="#3a2a14" fontWeight="700">END</text>
        <g>
          <path d="M225 102 a10 10 0 1 1 0 -0.1 M225 102 l-8 16 l16 0 Z" fill="#c84a3b" stroke="#6b2a1f" strokeWidth="1"/>
          <path d="M255 115 a9 9 0 1 1 0 -0.1 M255 115 l-7 14 l14 0 Z" fill="#2f6b8f" stroke="#15374a" strokeWidth="1"/>
        </g>
        <g transform="translate(470,330) rotate(-8)">
          <rect x="-16" y="-16" width="32" height="32" rx="5" fill="#fbf7ed" stroke="#6b5632" strokeWidth="1.4"/>
          <circle cx="-6" cy="-6" r="2.5" fill="#3a2a14"/>
          <circle cx="6" cy="6" r="2.5" fill="#3a2a14"/>
          <circle cx="-6" cy="6" r="2.5" fill="#3a2a14"/>
          <circle cx="6" cy="-6" r="2.5" fill="#3a2a14"/>
          <circle cx="0" cy="0" r="2.5" fill="#3a2a14"/>
        </g>
        <g transform="translate(500,355) rotate(14)">
          <rect x="-14" y="-14" width="28" height="28" rx="5" fill="#fbf7ed" stroke="#6b5632" strokeWidth="1.4"/>
          <circle cx="0" cy="0" r="2.5" fill="#3a2a14"/>
          <circle cx="-5" cy="-5" r="2.5" fill="#3a2a14"/>
          <circle cx="5" cy="5" r="2.5" fill="#3a2a14"/>
        </g>
        <g transform="translate(460,110) rotate(-6)">
          <rect x="-30" y="-40" width="60" height="80" rx="6" fill="#e7d7ad" stroke="#6b5632" strokeWidth="1.2"/>
          <rect x="-26" y="-36" width="52" height="72" rx="4" fill="none" stroke="#6b5632" strokeWidth="0.8" opacity="0.5"/>
          <text x="0" y="-6" textAnchor="middle" fontFamily="var(--font-display)" fontSize="11" fill="#3a2a14">Event</text>
          <text x="0" y="8" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="7" letterSpacing="0.1em" fill="#6b5632">DECK · 32</text>
        </g>
      </svg>

      <div className="hs selected" style={{left: '38%', top: '28%'}}><i/></div>
      <div className="hs" style={{left: '22%', top: '30%'}}><i/></div>
      <div className="hs" style={{left: '80%', top: '24%'}}><i/></div>
      <div className="hs" style={{left: '82%', top: '78%'}}><i/></div>

      <div className="hs-card" style={{left: '42%', top: '36%'}}>
        <div className="k"><i/> Setup · Step 3 of 7</div>
        <h4>Place the Draw token</h4>
        <p>At the start of each age, one player places the hex token on any unclaimed route. This marks the first card to resolve.</p>
        <div className="row">
          <small>Component · Hex Token</small>
          <span className="mini-btn">Next <ArrowR size={10}/></span>
        </div>
      </div>

      <div className="hero-qr">
        <div className="hero-qr-art" aria-hidden="true">
          {Array.from({length: 7}).map((_, r) => (
            <div key={r} className="qr-row">
              {Array.from({length: 7}).map((_, c) => {
                const on = [0,1,2,5,6,8,9,12,15,17,19,22,24,26,30,32,36,38,41,45,46,48].includes(r*7+c);
                return <span key={c} className={on ? 'on' : ''}/>;
              })}
            </div>
          ))}
        </div>
        <div className="hero-qr-cap">
          <div className="hero-qr-k">At the table</div>
          <div className="hero-qr-t">Scan to learn to play</div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const headline = 'Board game rules your table <em>actually reads</em>.';
  const sub = "Sherpa turns your rulebook into an interactive learn-to-play that fits on a QR card. Drop it in the box, stick it on your convention table, share it with playtesters. Rules answer themselves.";

  return (
    <section id="top" className="hero">
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Sherpa · Digital rulebooks for tabletop</span>
            <h1 className="display" dangerouslySetInnerHTML={{__html: headline}}/>
            <p className="lede">{sub}</p>
            <div className="hero-ctas">
              <Link className="btn btn-primary" href="/login?returnUrl=/studio">Digitize your rulebook <ArrowR/></Link>
              <a className="btn btn-ghost on-ink" href="#demo">Play the demo</a>
            </div>
            <div className="hero-meta">
              <div><span className="num">Figma&nbsp;→&nbsp;live</span><span className="lbl">Import a Figma file and publish the same afternoon</span></div>
              <div><span className="num">0</span><span className="lbl">Apps for your players to install</span></div>
              <div><span className="num">Any&nbsp;screen</span><span className="lbl">Phone at the table, tablet at the booth, laptop at home</span></div>
            </div>
          </div>
          <HeroCanvas/>
        </div>
      </div>
    </section>
  );
}

function HowStepVisual({ n }: { n: number }) {
  if (n === 1) {
    return (
      <div className="vis" style={{background:'#fbf9f7'}}>
        <svg viewBox="0 0 300 180" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
          <rect width="300" height="180" fill="#fbf9f7"/>
          <g transform="translate(44,28) rotate(-4)">
            <rect width="110" height="130" rx="3" fill="#fff" stroke="#e7dfd2"/>
            <rect x="10" y="14" width="46" height="4" rx="1" fill="#101314"/>
            <rect x="10" y="22" width="74" height="3" rx="1" fill="#c4bdb0"/>
            <rect x="10" y="36" width="90" height="3" rx="1" fill="#ede8df"/>
            <rect x="10" y="43" width="84" height="3" rx="1" fill="#ede8df"/>
            <rect x="10" y="50" width="68" height="3" rx="1" fill="#ede8df"/>
            <rect x="10" y="66" width="90" height="3" rx="1" fill="#ede8df"/>
            <rect x="10" y="73" width="78" height="3" rx="1" fill="#ede8df"/>
            <text x="10" y="100" fontFamily="ui-monospace,monospace" fontSize="6" fill="#78746c" letterSpacing="0.1em">RULEBOOK.PDF · 18 PAGES</text>
          </g>
          <g transform="translate(160,38) rotate(5)">
            <rect width="110" height="90" rx="4" fill="#e7d7ad" stroke="#8a7658"/>
            <circle cx="30" cy="40" r="6" fill="#c4a46a"/>
            <circle cx="55" cy="45" r="4" fill="#c84a3b"/>
            <circle cx="80" cy="35" r="4" fill="#2f6b8f"/>
            <text x="55" y="78" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="6" fill="#3a2a14" letterSpacing="0.1em">BOARD.JPG</text>
          </g>
          <g transform="translate(220,150)">
            <circle r="14" fill="#101314"/>
            <path d="M0 -6 L-5 -1 M0 -6 L5 -1 M0 -6 L0 6" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
          </g>
        </svg>
      </div>
    );
  }
  if (n === 2) {
    return (
      <div className="vis" style={{background:'#fbf9f7'}}>
        <svg viewBox="0 0 300 180" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
          <rect width="300" height="180" fill="#fbf9f7"/>
          <rect x="24" y="24" width="252" height="132" rx="6" fill="#e7d7ad" stroke="#8a7658" strokeWidth="1.4"/>
          <rect x="30" y="30" width="240" height="120" rx="4" fill="#efe4cc" stroke="#8a7658" strokeDasharray="3 3" opacity="0.6"/>
          <circle cx="70" cy="70" r="11" fill="#c4a46a" stroke="#6b5632" strokeWidth="1"/>
          <path d="M140 62 a8 8 0 1 1 0 -0.1 M140 62 l-6 12 l12 0 Z" fill="#c84a3b" stroke="#6b2a1f" strokeWidth="0.8"/>
          <rect x="200" y="54" width="40" height="28" rx="3" fill="#e7d7ad" stroke="#6b5632"/>
          <rect x="202" y="86" width="30" height="38" rx="2" fill="#2f6b8f" opacity="0.8" stroke="#15374a" strokeWidth="1" transform="rotate(-8, 217, 105)"/>
          <g transform="translate(70, 70)">
            <circle r="16" fill="#5B7AF5" opacity="0.25"/>
            <circle r="10" fill="#5B7AF5" opacity="0.45"/>
            <circle r="5" fill="#5B7AF5" stroke="#fff" strokeWidth="1.5"/>
          </g>
          <g transform="translate(140, 62)">
            <circle r="5" fill="#5B7AF5" stroke="#fff" strokeWidth="1.5"/>
          </g>
          <g transform="translate(220, 68)">
            <circle r="5" fill="#5B7AF5" stroke="#fff" strokeWidth="1.5"/>
          </g>
          <g transform="translate(215, 105)">
            <circle r="9" fill="#fff" stroke="#101314" strokeDasharray="2 2"/>
            <path d="M-4 0 L4 0 M0 -4 L0 4" stroke="#101314" strokeWidth="1.3" strokeLinecap="round"/>
          </g>
        </svg>
      </div>
    );
  }
  return (
    <div className="vis deep">
      <svg viewBox="0 0 300 180" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
        <rect width="300" height="180" fill="#1a2875"/>
        <g transform="translate(50,32)">
          <rect width="120" height="116" rx="8" fill="#fbf7ed" stroke="#3a4aa8" strokeWidth="1"/>
          <text x="60" y="22" textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" fill="#1a2875">Kestrel Pass</text>
          <text x="60" y="34" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="7" fill="#78746c" letterSpacing="0.14em">LEARN TO PLAY</text>
          <g transform="translate(30,44)">
            {Array.from({length:7}).map((_,r) => (
              Array.from({length:7}).map((_,c) => {
                const on = [0,1,2,5,6,8,9,12,15,17,19,22,24,26,30,32,36,38,41,45,46,48].includes(r*7+c);
                return on ? <rect key={`${r}-${c}`} x={c*8} y={r*8} width="7" height="7" fill="#101314"/> : null;
              })
            ))}
          </g>
          <text x="60" y="110" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="7" fill="#1a2875" letterSpacing="0.1em">sherpa.run / kestrel</text>
        </g>
        <g transform="translate(200,52)">
          <rect x="-22" y="-6" width="44" height="82" rx="10" fill="#101314" stroke="#5B7AF5" strokeWidth="1.5"/>
          <rect x="-18" y="2" width="36" height="58" rx="4" fill="#fbf7ed"/>
          <text x="0" y="18" textAnchor="middle" fontFamily="var(--font-display)" fontSize="8" fill="#1a2875">Kestrel</text>
          <rect x="-14" y="22" width="28" height="2" rx="1" fill="#c4bdb0"/>
          <rect x="-14" y="28" width="20" height="2" rx="1" fill="#c4bdb0"/>
          <circle cx="0" cy="44" r="6" fill="#5B7AF5"/>
        </g>
        <path d="M 150 72 Q 172 60 190 68" stroke="#5B7AF5" strokeWidth="1.5" strokeDasharray="3 3" fill="none"/>
        <text x="150" y="162" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="9" fill="rgba(255,255,255,0.55)" letterSpacing="0.14em">PRINT · SHARE · PLAY</text>
      </svg>
    </div>
  );
}

export function How() {
  const steps = [
    { t: "Upload the board and your rulebook.", d: "A top-down photo, a Figma export, or a PDF. Sherpa pulls out the images, components, and rule blocks for you." },
    { t: "Drop hotspots on every piece.", d: "Tap a meeple, a card, a space on the board. Attach the rule text, an animation, a video of how a turn goes. Chain steps into setup, turn, and endgame sequences." },
    { t: "Share it anywhere your players are.", d: "One link, any screen. A QR on the box for the table. A URL in your Kickstarter update. A tablet at your convention booth. The rulebook reflows from phone to TV, landscape, portrait, any size." },
  ];

  return (
    <section id="how" className="section how">
      <div className="wrap">
        <div className="how-head">
          <div><span className="kicker">How it works</span></div>
          <h2 className="display">From <em>rulebook PDF</em> to <em>QR on the box</em>, in an evening.</h2>
        </div>
        <div className="how-steps">
          {steps.map((s, i) => (
            <div className="how-step" key={i}>
              <div className="num">
                {String(i+1).padStart(2,'0')}
                <small>STEP</small>
              </div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
              <HowStepVisual n={i+1}/>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Feats() {
  return (
    <section id="features" className="section feats">
      <div className="wrap">
        <div className="feats-head">
          <span className="kicker">What&apos;s in the box</span>
          <h2 className="display">Everything a designer or publisher needs to teach <em>their</em> game.</h2>
        </div>
        <div className="feats-grid">
          <div className="feat feature span-6">
            <div>
              <span className="k">Multi-modal learning</span>
              <h3>Not everyone learns from a wall of text.</h3>
              <p>Some players read. Some watch. Some need to push the pieces around before a rule lands. Sherpa rulebooks mix <em>text, video, interactive demos, and a searchable index</em> so every player can learn the way that works for them. No more one person reading the rulebook out loud while three people zone out.</p>
            </div>
            <div className="vis">
              <div className="modes">
                <div className="mode" style={{'--mode-c':'#5B7AF5'} as React.CSSProperties}>
                  <svg className="mode-art" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
                    <rect width="200" height="120" fill="#5B7AF5"/>
                    <g opacity="0.28" stroke="#fff" strokeWidth="1.1" fill="none">
                      <line x1="20" y1="30" x2="110" y2="30"/>
                      <line x1="20" y1="42" x2="128" y2="42"/>
                      <line x1="20" y1="54" x2="96" y2="54"/>
                      <line x1="20" y1="72" x2="120" y2="72"/>
                      <line x1="20" y1="84" x2="104" y2="84"/>
                      <line x1="20" y1="96" x2="118" y2="96"/>
                    </g>
                    <g opacity="0.5" fill="#fff">
                      <rect x="140" y="22" width="38" height="54" rx="3"/>
                      <rect x="145" y="28" width="24" height="2.5" rx="1.2" fill="#5B7AF5"/>
                      <rect x="145" y="34" width="28" height="2.5" rx="1.2" fill="#5B7AF5"/>
                      <rect x="145" y="40" width="18" height="2.5" rx="1.2" fill="#5B7AF5"/>
                    </g>
                  </svg>
                  <div className="mode-body">
                    <span className="m-k"><i/>Read</span>
                    <span className="m-t">Text + diagrams</span>
                    <span className="m-d">Rich rule copy, anatomies, flowcharts. For the rules lawyer at the table.</span>
                  </div>
                </div>
                <div className="mode" style={{'--mode-c':'#c84a3b'} as React.CSSProperties}>
                  <svg className="mode-art" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
                    <rect width="200" height="120" fill="#c84a3b"/>
                    <circle cx="100" cy="60" r="44" fill="#fff" opacity="0.14"/>
                    <circle cx="100" cy="60" r="28" fill="#fff" opacity="0.18"/>
                    <polygon points="92,48 92,72 114,60" fill="#fff" opacity="0.95"/>
                  </svg>
                  <div className="mode-body">
                    <span className="m-k"><i/>Watch</span>
                    <span className="m-t">Embedded video</span>
                    <span className="m-d">A 20-second clip of a full combat, a setup timelapse, a worked example.</span>
                  </div>
                </div>
                <div className="mode" style={{'--mode-c':'#c4a46a'} as React.CSSProperties}>
                  <svg className="mode-art" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
                    <rect width="200" height="120" fill="#c4a46a"/>
                    <circle cx="60" cy="60" r="22" fill="#fbf7ed" stroke="#6b5632" strokeWidth="1.4"/>
                    <circle cx="60" cy="60" r="5" fill="#3a2a14"/>
                    <rect x="110" y="40" width="30" height="44" rx="4" fill="#fbf7ed" stroke="#6b5632" strokeWidth="1.4" transform="rotate(-4 125 62)"/>
                    <path d="M82 60 L104 60 M100 56 L104 60 L100 64" stroke="#3a2a14" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                  <div className="mode-body">
                    <span className="m-k"><i/>Try</span>
                    <span className="m-t">Interactive demo</span>
                    <span className="m-d">A live mini-round of the mechanic — drag, tap, resolve, before touching real pieces.</span>
                  </div>
                </div>
                <div className="mode" style={{'--mode-c':'#2f6b8f'} as React.CSSProperties}>
                  <svg className="mode-art" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
                    <rect width="200" height="120" fill="#2f6b8f"/>
                    <g transform="translate(100,60)">
                      <circle r="22" fill="none" stroke="#fff" strokeWidth="3"/>
                      <line x1="18" y1="18" x2="34" y2="34" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                    </g>
                  </svg>
                  <div className="mode-body">
                    <span className="m-k"><i/>Find</span>
                    <span className="m-t">Index + deep links</span>
                    <span className="m-d">Search &ldquo;what does the priest do?priest do?&rdquo; — jumprdquo; and jump straight to the card. Every rule is linkable.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="feat span-3">
            <span className="k">Component hotspots</span>
            <h3>Tap any piece. Get the rule.</h3>
            <p>Photograph your board, cards, and tokens. Drop hotspots on every component. Sherpa handles the positioning math and re-anchors when you swap art for a new print run.</p>
            <div className="vis">
              <svg viewBox="0 0 420 120" style={{width:'100%',height:'100%'}}>
                <rect width="420" height="120" fill="#fbf9f7"/>
                <rect x="20" y="20" width="380" height="80" rx="8" fill="#e7d7ad" stroke="#8a7658"/>
                <circle cx="70" cy="60" r="12" fill="#c4a46a" stroke="#6b5632"/>
                <path d="M140 52 a9 9 0 1 1 0 -0.1 M140 52 l-7 14 l14 0 Z" fill="#c84a3b" stroke="#6b2a1f"/>
                <rect x="200" y="42" width="38" height="36" rx="4" fill="#fbf7ed" stroke="#8a7658"/>
                <rect x="260" y="40" width="34" height="48" rx="3" fill="#2f6b8f" stroke="#15374a" transform="rotate(-6, 277, 64)"/>
                <g transform="translate(217,60)">
                  <circle r="14" fill="#5B7AF5" opacity="0.3"/>
                  <circle r="7" fill="#5B7AF5" stroke="#fff" strokeWidth="1.5"/>
                </g>
                <g transform="translate(350,55)">
                  <circle r="6" fill="#5B7AF5" stroke="#fff" strokeWidth="1.5"/>
                </g>
              </svg>
            </div>
          </div>

          <div className="feat span-3">
            <span className="k">Rule cards</span>
            <h3>Rich rule text, diagrams, a video of the turn.</h3>
            <p>Each hotspot opens a rule card: setup instructions, a looping clip of how a combat resolves, a diagram of card anatomy. Rich text, images, embedded video. Readable across the table.</p>
            <div className="vis">
              <svg viewBox="0 0 420 120" style={{width:'100%',height:'100%'}}>
                <rect width="420" height="120" fill="#fbf9f7"/>
                <rect x="20" y="20" width="120" height="80" rx="10" fill="#fff" stroke="#e7dfd2"/>
                <rect x="36" y="34" width="50" height="6" rx="3" fill="#101314"/>
                <rect x="36" y="46" width="88" height="4" rx="2" fill="#ede8df"/>
                <rect x="36" y="54" width="72" height="4" rx="2" fill="#ede8df"/>
                <rect x="36" y="78" width="38" height="10" rx="5" fill="#101314"/>
                <rect x="150" y="40" width="120" height="60" rx="10" fill="#1a2875"/>
                <rect x="166" y="54" width="50" height="4" rx="2" fill="#ffffff" opacity="0.5"/>
                <rect x="166" y="62" width="80" height="4" rx="2" fill="#ffffff" opacity="0.3"/>
                <polygon points="194,82 206,88 194,94" fill="#5B7AF5"/>
                <rect x="280" y="20" width="120" height="80" rx="10" fill="#e7d7ad"/>
                <text x="340" y="44" textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fill="#3a2a14">Combat</text>
                <rect x="296" y="54" width="88" height="3" rx="2" fill="#3a2a14" opacity="0.5"/>
                <rect x="296" y="62" width="72" height="3" rx="2" fill="#3a2a14" opacity="0.4"/>
              </svg>
            </div>
          </div>

          <div className="feat span-3">
            <span className="k">Guided walkthroughs</span>
            <h3>Walk new players through setup and their first turn.</h3>
            <p>Build a step-by-step walkthrough for setup, teach mode, or a specific mechanic. Branches on player count, variant, and expansion.</p>
            <div className="vis">
              <svg viewBox="0 0 420 120" style={{width:'100%',height:'100%'}}>
                <rect width="420" height="120" fill="#fbf9f7"/>
                <line x1="30" y1="60" x2="390" y2="60" stroke="#ddd5c5" strokeWidth="2"/>
                {[0,1,2,3,4].map((i) => {
                  const cx = 30 + i * 90;
                  const done = i < 2;
                  const active = i === 2;
                  return (
                    <g key={i}>
                      <circle cx={cx} cy="60" r={active ? 12 : 8}
                        fill={active ? "#5B7AF5" : done ? "#101314" : "#fff"}
                        stroke={active ? "#5B7AF5" : "#bbb3a4"} strokeWidth="1.5"/>
                      {done && <path d={`M${cx-3} 60 l2.5 2.5 l5 -5`} stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>}
                      {active && <circle cx={cx} cy="60" r="3.5" fill="#fff"/>}
                    </g>
                  );
                })}
                <text x="30" y="92" fontFamily="ui-monospace,monospace" fontSize="8" fill="#78746c">SEATS</text>
                <text x="120" y="92" fontFamily="ui-monospace,monospace" fontSize="8" fill="#78746c">DECKS</text>
                <text x="210" y="92" fontFamily="ui-monospace,monospace" fontSize="8" fill="#5B7AF5" fontWeight="600">BOARD</text>
                <text x="300" y="92" fontFamily="ui-monospace,monospace" fontSize="8" fill="#bbb3a4">EVENT</text>
                <text x="386" y="92" fontFamily="ui-monospace,monospace" fontSize="8" fill="#bbb3a4" textAnchor="end">READY</text>
              </svg>
            </div>
          </div>

          <div className="feat span-3">
            <span className="k">Localization</span>
            <h3>One rulebook, every language.</h3>
            <p>Edit the rule once, ship it in every language you sell in. Translators get a side-by-side view; art and hotspots stay in sync.</p>
            <div className="vis">
              <svg viewBox="0 0 420 120" style={{width:'100%',height:'100%'}}>
                <rect width="420" height="120" fill="#fbf9f7"/>
                <rect x="20" y="18" width="130" height="84" rx="8" fill="#fff" stroke="#e7dfd2"/>
                <text x="32" y="34" fontFamily="ui-monospace,monospace" fontSize="8" fill="#78746c">SOURCE · EN</text>
                <rect x="32" y="42" width="90" height="5" rx="2" fill="#101314"/>
                <rect x="32" y="52" width="106" height="3" rx="2" fill="#ede8df"/>
                <rect x="32" y="59" width="96" height="3" rx="2" fill="#ede8df"/>
                <g stroke="#bbb3a4" fill="none" strokeWidth="1.5">
                  <path d="M158 40 L188 40" strokeLinecap="round"/>
                  <path d="M158 60 L188 60" strokeLinecap="round"/>
                  <path d="M158 80 L188 80" strokeLinecap="round"/>
                  <path d="M184 36 L188 40 L184 44" strokeLinejoin="round"/>
                  <path d="M184 56 L188 60 L184 64" strokeLinejoin="round"/>
                  <path d="M184 76 L188 80 L184 84" strokeLinejoin="round"/>
                </g>
                {([
                  { y: 24, code: "DE", label: "Deutsch" },
                  { y: 52, code: "FR", label: "Français" },
                  { y: 80, code: "JA", label: "日本語" },
                ] as {y:number;code:string;label:string}[]).map((l, i) => (
                  <g key={i}>
                    <rect x="196" y={l.y} width="200" height="22" rx="6" fill="#fff" stroke="#e7dfd2"/>
                    <rect x="204" y={l.y + 6} width="18" height="10" rx="2" fill="#101314"/>
                    <text x="213" y={l.y + 14} fontFamily="ui-monospace,monospace" fontSize="7" fill="#fff" textAnchor="middle" fontWeight="600">{l.code}</text>
                    <text x="232" y={l.y + 14} fontFamily="var(--font-display)" fontSize="11" fill="#101314">{l.label}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="feat span-2">
            <span className="k">Convention Mode</span>
            <h3>Readable from across the table.</h3>
            <p>Fullscreen, high contrast, repositionable. Caches the whole rulebook for booth tablets at PAX, game cafés, and basements with spotty signal.</p>
          </div>

          <div className="feat span-2">
            <span className="k">QR inserts</span>
            <h3>Print-ready, sized to fit your box.</h3>
            <p>Tabletop-standard insert sizes. Drops straight into the tray, the lid, or a rulebook reference card.</p>
          </div>

          <div className="feat span-2">
            <span className="k">Flat PDF export</span>
            <h3>One-click archival PDF.</h3>
            <p>Export your entire rulebook as a printable flat PDF for publisher submission, retailer sheets, or archival. Your content, your format.</p>
          </div>

          <div className="feat span-6">
            <span className="k">Playtest insights</span>
            <h3>See which rules trip people up before the print run.</h3>
            <p>Every hotspot tracks which rules get re-opened, which videos finish, where new players stall. Catch the confusing one before you send files to the printer.</p>
            <div className="vis">
              <svg viewBox="0 0 520 155" style={{width:'100%',height:'100%'}}>
                <rect width="520" height="155" fill="#fbf9f7"/>
                <text x="24" y="20" fontFamily="ui-monospace,monospace" fontSize="8" fill="#78746c" letterSpacing="0.08em">Rules re-opened on first play</text>
                {([
                  { x: 24,  w: 70, h: 36, label: "Setup",  pct: "1.2×" },
                  { x: 108, w: 70, h: 46, label: "Turn",   pct: "1.6×" },
                  { x: 192, w: 70, h: 80, label: "Combat", pct: "3.2×" },
                  { x: 276, w: 70, h: 54, label: "Trade",  pct: "2.0×" },
                  { x: 360, w: 70, h: 38, label: "Cards",  pct: "1.3×" },
                  { x: 444, w: 70, h: 28, label: "End",    pct: "1.0×" },
                ] as {x:number;w:number;h:number;label:string;pct:string}[]).map((b, i) => (
                  <g key={i}>
                    <rect x={b.x} y={128 - b.h} width={b.w} height={b.h} rx="4" fill={i===2 ? "#c84a3b" : "#e7dfd2"}/>
                    <text x={b.x + b.w/2} y="142" fontFamily="ui-monospace,monospace" fontSize="8" fill="#4a443b" textAnchor="middle" fontWeight="500">{b.label}</text>
                    <text x={b.x + b.w/2} y={128 - b.h - 6} fontFamily="var(--font-display)" fontSize="15" fill={i===2 ? "#c84a3b" : "#101314"} textAnchor="middle">{b.pct}</text>
                  </g>
                ))}
                <line x1="24" y1="128" x2="496" y2="128" stroke="#e7dfd2" strokeWidth="1"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Showcase() {
  const entries = GALLERY_ENTRIES.slice(0, 6);
  return (
    <section id="showcase" className="section showcase">
      <div className="wrap showcase-head">
        <div>
          <span className="kicker">Shipping with Sherpa</span>
          <h2 className="display">Games teaching themselves.</h2>
        </div>
        <Link className="btn btn-ghost" href="/gallery">Browse the gallery <ArrowR/></Link>
      </div>
      <div className="wrap" style={{padding: 0}}>
        <div className="showcase-scroll">
          {entries.map((entry) => (
            <Link key={entry.id} className="sc-card" href={`/gallery/${entry.id}`}>
              <div className="sc-thumb" style={{background: entry.accentColor}}>
                <img
                  src={entry.cardImage}
                  alt={entry.title}
                  loading="lazy"
                  style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
                />
              </div>
              <div className="sc-meta">
                <div className="k">{entry.complexity.toUpperCase()} · {entry.playerCount} PLAYERS</div>
                <h4>{entry.title}</h4>
                <p>{entry.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const items = [
    { q: "Do players need to install anything?", a: "No. We'll never ask them to. Sherpa rulebooks open in the phone's browser when players scan the QR. No app, no login, no account for your players." },
    { q: "Can I use photographs of my prototype, or do I need final art?", a: "Start with a top-down photo of your prototype. When the real art arrives, swap it in and Sherpa re-anchors your hotspots so you don't have to redo the work." },
    { q: "How do I print the QR insert?", a: "Sherpa exports print-ready PDFs at tabletop-standard sizes (poker tuck, ticket, mini-rulebook, and box-lid). Send them straight to your printer or drop them into your KS pledge manager." },
    { q: "Does offline mode work for conventions with bad Wi-Fi?", a: "Yes. Convention Mode caches the entire rulebook on the device, so your booth tablet or a player's phone runs fully offline. Great for PAX, Essen, Gen Con, Airecon, or places with spotty Wi-Fi like game cafés and basements." },
    { q: "Can I support expansions?", a: "Studio plans include expansion-aware publishing: a single rulebook that unlocks new rules, cards, and components as each expansion is added." },
    { q: "What about translations?", a: "Studio plans let you run one source rulebook with multiple languages. The player picks their language on first scan and the rulebook switches." },
    { q: "Who owns the rulebook content?", a: "You do. Your text, your images, your rules. You can export everything at any time, including a flat PDF for archival or publisher submission." },
  ];

  return (
    <section id="faq" className="section faq">
      <div className="wrap faq-grid">
        <div>
          <span className="kicker">Frequently asked</span>
          <h2 className="display">Questions from <em>designers</em> and <em>publishers</em>.</h2>
          <p className="lede" style={{maxWidth: '36ch'}}>Not listed? <a href="mailto:hello@sherpa.games" style={{color:'var(--accent-ink)',fontWeight:600}}>Email us</a>. We&apos;re a small team and we play games too.</p>
        </div>
        <div className="faq-list">
          {items.map((it, i) => (
            <details className="faq-item" key={i}>
              <summary>{it.q}</summary>
              <p>{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTABand() {
  return (
    <section className="cta-band">
      <div className="wrap">
        <h2 className="display">Put a QR on your box <em>this week</em>.</h2>
        <p>Free to start. Free forever for playtesters. First rulebook published in under an evening, or it&apos;s on us.</p>
        <div className="row">
          <Link className="btn btn-accent" href="/login?returnUrl=/studio">Start digitizing <ArrowR/></Link>
          <a className="btn btn-ghost" href="#demo">Try the demo</a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="row">
              <SherpaIcon/>
              <b>Sherpa</b>
            </div>
            <p>Digital rulebooks for tabletop games. Built in Brooklyn · played everywhere.</p>
          </div>
          <div className="foot-col">
            <h5>Product</h5>
            <a href="#features">Features</a>
            <a href="#demo">Live demo</a>
            <a href="#showcase">Showcase</a>
            <a href="#pricing">Pricing</a>
            <a href="#features">Convention Mode</a>
          </div>
          <div className="foot-col">
            <h5>For designers</h5>
            <a href="#">Playtest guide</a>
            <a href="#">QR insert templates</a>
            <a href="#">Kickstarter handbook</a>
            <a href="#">Rulebook audits</a>
          </div>
          <div className="foot-col">
            <h5>For publishers</h5>
            <a href="#">Catalog hosting</a>
            <a href="#">Localization</a>
            <a href="#">Retail program</a>
            <a href="mailto:hello@sherpa.games">Contact sales</a>
          </div>
          <div className="foot-col">
            <h5>Legal</h5>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
            <a href="#">DPA</a>
          </div>
        </div>
        <div className="foot-bot">
          <div>© 2026 Sherpa, Inc.</div>
          <div>Questions? hello@sherpa.games</div>
        </div>
      </div>
    </footer>
  );
}

