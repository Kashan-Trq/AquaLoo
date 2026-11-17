import Link from "next/link";

const flow = [
  { number: "01", title: "Collect", copy: "Capture suitable household greywater before it disappears down the drain.", icon: "↘" },
  { number: "02", title: "Filter", copy: "Move water through a modular physical and carbon filtration train.", icon: "▽" },
  { number: "03", title: "Monitor", copy: "Track quality signals, flow and tank state with connected sensors.", icon: "◌" },
  { number: "04", title: "Reuse", copy: "Route verified non-potable water to appropriate reuse applications.", icon: "↻" },
];

const apkUrl = process.env.NEXT_PUBLIC_APK_URL || "https://github.com/Kashan-Trq/AquaLoo/releases/download/v1.0.0/app-release.apk";

export default function HomePage() {
  return (
    <main className="site-shell">
      <section className="hero-section" id="top">
        <nav className="site-nav" aria-label="Main navigation">
          <Link className="brand brand-light" href="/" aria-label="AquaLoop home"><span className="brand-mark">↻</span><span>AquaLoop</span></Link>
          <div className="nav-links"><a href="#system">The system</a><a href="#proof">Proof</a><a href="#roadmap">Roadmap</a></div>
          <a className="nav-download" href={apkUrl} target="_blank" rel="noreferrer">Download app <span>↗</span></a>
        </nav>

        <div className="hero-grid page-width">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-light">SMART GREYWATER RECOVERY</p>
            <h1>Give the water a home already has a second life.</h1>
            <p className="hero-lede">AquaLoop is a low-cost, sensor-controlled greywater system for measured, non-potable reuse — with the hardware, app and evidence trail to move from bench prototype to field pilot.</p>
            <div className="hero-actions">
              <a className="button button-aqua" href={apkUrl} target="_blank" rel="noreferrer">Download the Android app <span>↓</span></a>
              <a className="button button-outline" href="#system">See how it works <span>→</span></a>
            </div>
            <div className="hero-notes" aria-label="AquaLoop highlights"><span><i /> Working bench prototype</span><span><i /> Local-first control</span><span><i /> Non-potable by design</span></div>
          </div>

          <div className="hero-visual" aria-label="AquaLoop bench prototype and live system preview">
            <div className="visual-image-wrap">
              <img src="/images/bench-prototype.png" alt="AquaLoop bench prototype with filter train, reservoir, flow sensor and controller" />
              <div className="image-label image-label-top">AQUALOOP / BENCH PROTOTYPE</div>
              <div className="image-caption"><strong>Built to be tested in the real world.</strong><span>Filtration · valves · sensors · control</span></div>
            </div>
            <div className="live-card">
              <div className="live-card-head"><span><i /> LIVE SYSTEM VIEW</span><b>DEMO</b></div>
              <div className="live-readings"><div><small>QUALITY SCORE</small><strong>76<span>%</span></strong></div><div><small>TANK LEVEL</small><strong>82<span>%</span></strong></div><div><small>RECOVERED</small><strong>1,420<span>L</span></strong></div></div>
            </div>
          </div>
        </div>
        <div className="hero-footer page-width"><span>AquaLoop / Prototype + software MVP</span><span>01 — 06</span></div>
      </section>

      <section className="intro-section page-width">
        <div className="section-lead"><p className="section-kicker">THE OPPORTUNITY</p><h2>Water stress is a systems problem. We are building a practical loop.</h2></div>
        <div className="intro-copy"><p>Homes and small facilities already use water that could be recovered for toilets, irrigation and other non-potable applications. AquaLoop brings that opportunity into one understandable system: capture, treat, measure and reuse.</p><p className="muted-copy">The goal is not another disconnected sensor dashboard. It is trusted water infrastructure people can see, service and scale.</p></div>
      </section>

      <section className="system-section" id="system"><div className="page-width">
        <div className="section-heading-row"><div><p className="section-kicker">ONE LOOP, FOUR MOMENTS</p><h2>From greywater to useful water.</h2></div><p className="section-side-copy">The mobile app gives people visibility. Local hardware keeps the system observable and usable on site.</p></div>
        <div className="flow-grid">{flow.map((item) => <article className="flow-card" key={item.number}><div className="flow-top"><span>{item.number}</span><b>{item.icon}</b></div><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div>
        <div className="system-rail"><span>RAW GREYWATER</span><i /><span>FILTERED</span><i /><span>MEASURED</span><i /><span>NON-POTABLE REUSE</span></div>
      </div></section>

      <section className="proof-section" id="proof"><div className="page-width proof-grid">
        <div className="proof-image"><img src="/images/bench-prototype.png" alt="AquaLoop filtration and sensor bench prototype" /><span className="proof-stamp">REAL HARDWARE / REAL TESTING</span></div>
        <div className="proof-copy"><p className="section-kicker section-kicker-light">NOT A CONCEPT RENDER</p><h2>The team has already built the sensing, switching, filtration and control stack.</h2><p>Now the next job is disciplined field evidence: repeatable installation, long-run telemetry, service learning and clear non-potable safety boundaries.</p>
          <div className="proof-list"><div><span className="status-dot built" /><strong>Built</strong><p>Filtration train, reservoir, plumbing, valves and controller.</p></div><div><span className="status-dot tested" /><strong>Bench-tested</strong><p>Wet-loop flow, relay switching, electronics and dashboard interface.</p></div><div><span className="status-dot next" /><strong>Next: field pilot</strong><p>Deploy, collect evidence and refine the system around real homes.</p></div></div>
        </div>
      </div></section>

      <section className="roadmap-section page-width" id="roadmap"><div className="roadmap-heading"><p className="section-kicker">THE NEXT SIX MONTHS</p><h2>Turn a working prototype into field evidence.</h2><p>A focused path from assembly to pilot learning, designed for climate-tech programmes, early partners and the first 25 homes.</p></div>
        <div className="roadmap-line"><article><span>01</span><small>MONTHS 1–2</small><h3>Build + assemble</h3><p>Prepare a repeatable pilot unit and installation playbook.</p></article><article><span>02</span><small>MONTHS 3–5</small><h3>Deploy + measure</h3><p>Collect sustained telemetry and learn from real operating conditions.</p></article><article><span>03</span><small>MONTH 6</small><h3>Publish + partner</h3><p>Share results and open the next conversation with NGOs and B2B sites.</p></article></div>
        <div className="ask-card"><div><p className="section-kicker">PILOT SUPPORT</p><strong>$3,500</strong><span>25-home pilot · 6 months</span></div><a className="button button-dark" href={apkUrl} target="_blank" rel="noreferrer">Download the app <span>↓</span></a></div>
      </section>

      <section className="final-cta"><div className="page-width final-cta-inner"><div><p className="eyebrow eyebrow-light">LET’S GIVE WATER A SECOND LIFE</p><h2>AquaLoop is ready for the next proof point.</h2></div><a className="button button-aqua" href={apkUrl} target="_blank" rel="noreferrer">Get the Android MVP <span>↓</span></a></div></section>
      <footer className="site-footer page-width"><Link className="brand" href="/"><span className="brand-mark">↻</span><span>AquaLoop</span></Link><span>Smart greywater recovery / Prototype + software MVP</span><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
