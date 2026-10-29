import { LINKS } from "../config/links";

const COMPARE: Array<[string, string, string]> = [
  ["Max Supply", "21 Million", "21 Billion (more zeros, more fun)"],
  ["Mining Hardware", "Expensive ASICs", "None — just your tokens!"],
  ["Energy Use", "Kills polar bears 🐻‍❄️", "Green AF ✅"],
  ["Transaction Speed", "10 minutes", "Seconds ⚡"],
  ["Meme Potential", "Meh 🥱", "PIGS FLY 🚀"],
  ["Treasury", "None", "Community-controlled 💰"],
  ["Governance", "Miners rule", "HODLers + Senate 🏛️"],
];

const QUICK_HITS: Array<[string, string]> = [
  [
    "What’s Piggy Bank?",
    "A Bitcoin-like protocol on PulseChain with a community treasury and governance. OINK = vibes + power.",
  ],
  [
    "How do I mine OINK?",
    "Use PLS, PLSX, HEX, INC and other pulsechain tokens. Lock OINK for rewards. HODL or get rekt.",
  ],
  [
    "What’s the treasury for?",
    "Community votes on public goods, dApps, charity, or OINK buybacks to “make pigs fly” (no price promises).",
  ],
  [
    "How’s it different from Bitcoin?",
    "Same scarcity vibes, but faster, greener, and with a treasury + governance. Bitcoin’s the GOAT; we’re the PIG.",
  ],
  [
    "Is it safe?",
    "Audited, but experimental. Could crash. Only risk what you can lose.",
  ],
  [
    "What’s the Senate?",
    "Based degens with equal votes to keep whales in check. Apply if you’re a PulseChain chad.",
  ],
  [
    "Will OINK moon?",
    "No promises. It’s a tool for community building, not a Lambo printer. HODL responsibly.",
  ],
];

export function OinkpaperPage() {
  return (
    <main className="oink-wrap">
      <div className="eyebrow">The OINKpaper</div>
      <h1 className="oink-title">
        🐷 OINK OINK, HODLERS! WELCOME TO THE PIG PARTY! 🐷
      </h1>
      <div className="oink-cta-row">
        <a
          className="oink-cta secondary"
          href={LINKS.oinkpaperPdf}
          target="_blank"
          rel="noreferrer"
        >
          Grab the Original PDF 📜
        </a>
      </div>

      <section className="oink-section">
        <h2 className="oink-section-label">🐽 WTF Is Piggy Bank? 🐽</h2>
        <div className="oink-card">
          <p>
            Piggy Bank (ticker: OINK) isn’t just another memecoin — it’s the
            dankest protocol on PulseChain, blending Bitcoin’s hardcore
            scarcity with a community treasury that’s got more vibes than a
            TikTok dance trend. Think Bitcoin, but greener, funnier, and with
            a piggy bank that you control.
          </p>
          <ul className="oink-list">
            <li>
              <strong>Like Bitcoin, but better:</strong> Fixed 21 BILLION OINK
              supply (because bigger numbers = more fun). No central suits, no
              whale overlords, just pure decentralized chaos.
            </li>
            <li>
              <strong>Eco-friendly flex:</strong> No energy-hogging mining
              rigs. Mine OINK with your existing PLS, PLSX, HEX, INC and other
              pulsechain tokens. Save the planet, make pigs fly.
            </li>
            <li>
              <strong>Community piggy bank:</strong> Fees and penalties fill a
              treasury controlled by you via governance. Vote to fund dope
              dApps, memes, charity, or even buy back OINK and make pigs fly
              (no promises of mooning, tho — DYOR).
            </li>
            <li>
              <strong>Governance that slaps:</strong> Long-term HODLers and a
              Senate of based chads keep whales in check. This is democracy,
              blockchain style.
            </li>
          </ul>
        </div>
      </section>

      <section className="oink-section">
        <h2 className="oink-section-label">Why Piggy Bank Is the GOAT</h2>
        <div className="oink-card">
          <p>
            We yoinked Bitcoin’s best parts — scarcity, decentralization,
            trustlessness — and added a spicy twist: a treasury and governance
            that let the community run the show.
          </p>
          <ul className="oink-list">
            <li>
              <strong>Bitcoin’s problem:</strong> Miners and whales can get
              too thicc. Piggy Bank’s Senate (one person, one vote) vetoes any
              whale nonsense. No Moby Dick vibes here.
            </li>
            <li>
              <strong>Treasury vibes:</strong> Unlike Bitcoin’s “just HODL”
              energy, our treasury funds public goods, dApps, or OINK buybacks
              to juice the ecosystem (not a promise of profits — chill, SEC).
            </li>
            <li>
              <strong>Meme-powered:</strong> Bitcoin’s meme game is weak.
              OINK’s meme potential? Over 9000.
            </li>
          </ul>
          <div className="oink-table-wrap">
            <table className="oink-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Bitcoin</th>
                  <th>Piggy Bank</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([feature, bitcoin, piggy]) => (
                  <tr key={feature}>
                    <td>{feature}</td>
                    <td>{bitcoin}</td>
                    <td>{piggy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="oink-section">
        <h2 className="oink-section-label">How It Works: Piggy Bank 101</h2>
        <div className="oink-card-grid" style={{ marginBottom: 14 }}>
          <article className="oink-card">
            <span className="oink-step-num">1</span>
            <h3>Mine OINK, Get Swole</h3>
            <p>
              Use PLS, PLSX, HEX, INC and other pulsechain tokens to mine
              OINK. No fancy hardware, just diamond hands. Lock OINK in
              time-locked miners for rewards. Longer locks = bigger rewards +
              more governance power. Early exit? Penalties up to 82%. HODL or
              NGMI.
            </p>
          </article>
          <article className="oink-card">
            <span className="oink-step-num">2</span>
            <h3>Treasury: The Piggy Bank</h3>
            <p>
              Fees and penalties flow into the community treasury. Vote to
              spend it on public goods (bridges, not scams), dope dApps,
              charity (tax write-offs, but cooler), or OINK buybacks to “make
              pigs fly” (no price guarantees, fam). Anyone can propose ideas —
              permissionless and based.
            </p>
          </article>
          <article className="oink-card">
            <span className="oink-step-num">3</span>
            <h3>Governance: You’re the Boss</h3>
            <p>
              <strong>Voting Power:</strong> long-term miners get more say.
              Lock longer, flex harder. <strong>The Senate:</strong> regular
              degens with equal votes (1 person = 1 vote) keep whales from
              yeeting the protocol. <strong>Voting Credit:</strong> burn OINK
              to propose changes. Community votes, majority wins.
            </p>
          </article>
          <article className="oink-card">
            <span className="oink-step-num">4</span>
            <h3>Reward Boost Events: FOMO Time</h3>
            <p>
              Penalties from paper hands + inflation = juicy reward surges.
              After the party, inflation drops, and some tokens get burned to
              make OINK scarcer. Number go up? Maybe.
            </p>
          </article>
          <article className="oink-card">
            <span className="oink-step-num">5</span>
            <h3>Inflation: Controlled Chaos</h3>
            <p>
              Starts at 50,000 OINK every 10 minutes (1000x Bitcoin’s vibe).
              Reward Boost Events lower inflation over time, keeping the
              protocol spicy but sustainable.
            </p>
          </article>
        </div>
      </section>

      <div className="oink-card-grid cols-2">
        <article className="oink-card">
          <h2>Mining: HODL to Win</h2>
          <ul className="oink-list">
            <li>
              <strong>Time-Locked Miners:</strong> Lock OINK for 1–5 years.
              Longer = more OINK rewards + governance clout.
            </li>
            <li>
              <strong>Hop Miners:</strong> Upgrade to longer locks for bigger
              gains.
            </li>
            <li>
              <strong>Rollover Bonuses:</strong> HODL past maturity for extra
              tendies.
            </li>
            <li>
              <strong>Gift Miners:</strong> Send OINK miners to frens or cold
              storage.
            </li>
            <li>
              <strong>Penalties for Paper Hands:</strong> Early exit? Lose
              25–82%. Diamond hands only.
            </li>
          </ul>
        </article>
        <article className="oink-card">
          <h2>Governance: Degen Democracy</h2>
          <ul className="oink-list">
            <li>
              <strong>Voting Power:</strong> Proportional to lock time.
              HODLers run the show.
            </li>
            <li>
              <strong>Senate:</strong> Equal votes for regular chads. Vetoes
              whale shenanigans.
            </li>
            <li>
              <strong>Voting Credit:</strong> Burn OINK to propose changes.
              Community decides.
            </li>
            <li>
              <strong>Treasury Proposals:</strong> Fund grants, buybacks, or
              memes. You vote, it happens.
            </li>
            <li>
              <strong>Live Feedback:</strong> Governance actions hit Telegram
              for real-time degen debates.
            </li>
          </ul>
        </article>
      </div>

      <section className="oink-section">
        <h2 className="oink-section-label">
          The Vision: Pigs Fly, Community Thrives
        </h2>
        <div className="oink-card">
          <p>
            Piggy Bank isn’t just a token — it’s a movement. We’re building a
            decentralized playground where:
          </p>
          <ul className="oink-list">
            <li>The treasury funds innovation, memes, and good vibes.</li>
            <li>Governance gives power to HODLers and degens, not suits.</li>
            <li>
              OINK buybacks (if you vote for ‘em) could make pigs soar (no
              promises, just vibes).
            </li>
            <li>
              Bitcoin showed the way; we’re adding rocket fuel and a sense of
              humor.
            </li>
          </ul>
        </div>
      </section>

      <section className="oink-section">
        <h2 className="oink-section-label">Risks: The Lawyer Part</h2>
        <div className="oink-card">
          <ul className="oink-list">
            <li>
              <strong>Volatility:</strong> OINK could go to zero. Don’t YOLO
              your rent money.
            </li>
            <li>
              <strong>No Guarantees:</strong> Buybacks and treasury use are
              community-driven, not a promise of profits.
            </li>
            <li>
              <strong>Experimental:</strong> This is a wild ride. Audited
              contracts, but no warranties.
            </li>
            <li>
              <strong>Not Financial Advice:</strong> We’re degens, not CFAs.
              DYOR.
            </li>
          </ul>
        </div>
        <div className="oink-notice" style={{ marginTop: 14 }}>
          <strong>Disclaimer:</strong> OINK is a utility token for governance
          and mining, not an investment. No CEO, no office, no one to sue.
          This is a decentralized Wendy’s, sir.
        </div>
      </section>

      <section className="oink-section">
        <h2 className="oink-section-label">FAQ: Quick Hits</h2>
        {QUICK_HITS.map(([q, a]) => (
          <article className="oink-faq-item" key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </article>
        ))}
      </section>

      <section className="oink-section">
        <h2 className="oink-section-label">
          The Piggy Promise: No Rugs, Just Hugs
        </h2>
        <div className="oink-card">
          <p>
            Piggy Bank is live, complete, and fully decentralized. No team, no
            CEOs, no BS. The founding crew built this as a gift to PulseChain
            and peaced out. The community’s in charge now.
          </p>
          <ul className="oink-list">
            <li>
              <strong>Distribution:</strong> Mine OINK with PulseChain tokens.
              Fair, wide, and degen-friendly.
            </li>
            <li>
              <strong>Endgame:</strong> A self-sustaining protocol where
              HODLers and the Senate build the future.
            </li>
          </ul>
        </div>
      </section>

      <div className="oink-signoff">
        OINK OINK, MOTHERPIGGERS! LET’S MAKE PIGS FLY! 🐷🚀
      </div>
    </main>
  );
}
