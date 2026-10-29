import { useState } from "react";
import { Link } from "react-router-dom";
import { LiveStats } from "../components/LiveStats";
import { LINKS, OINK_TOKEN } from "../config/links";

function ContractLine() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(OINK_TOKEN);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — the address is still selectable */
    }
  };
  return (
    <div className="oink-contract">
      <div className="oink-contract-label">Contract Address (PulseChain)</div>
      <div className="oink-contract-line">
        <a href={LINKS.scan(OINK_TOKEN)} target="_blank" rel="noreferrer">
          {OINK_TOKEN}
        </a>
        <button
          type="button"
          className={copied ? "copied" : undefined}
          onClick={() => void copy()}
          aria-label="Copy contract address"
        >
          {copied ? "Copied!" : "⧉"}
        </button>
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <main className="oink-wrap">
      <section className="oink-hero">
        <div className="oink-hero-info">
          <div className="eyebrow">PulseChain Memecoin · Chain ID 369</div>
          <h1 className="oink-title">
            Piggy Bank: OINKiest Memecoin with Fat-A💲💲 PulseChain Reserves 🐷
            🏦
          </h1>
          <p className="oink-desc">
            Bitcoin scarcity + degen treasury vibes 🤑🏦 Stacking a piggy bank
            for all! 🐷💸
          </p>
          <div className="oink-cta-row">
            <a
              className="oink-cta"
              href={LINKS.buyOink}
              target="_blank"
              rel="noreferrer"
            >
              Buy OINK on PulseChain
            </a>
            <Link
              className="oink-cta secondary"
              to="/mining?tab=deploy"
            >
              Start Mining OINK for Free
            </Link>
          </div>
          <ContractLine />
        </div>

        <aside className="oink-hero-panel">
          <div className="oink-hero-panel-head">
            <img src="./img/oink.png" alt="Piggy Bank (OINK)" />
          </div>
          <div className="oink-hero-stats">
            <div className="oink-hero-stat">
              <div className="oink-hero-stat-label">Max Supply</div>
              <div className="oink-hero-stat-val">21B OINK</div>
            </div>
            <div className="oink-hero-stat">
              <div className="oink-hero-stat-label">Rewards Hit Every</div>
              <div className="oink-hero-stat-val">10 Seconds</div>
            </div>
            <div className="oink-hero-stat">
              <div className="oink-hero-stat-label">Mining Hardware</div>
              <div className="oink-hero-stat-val">None — Just Tokens</div>
            </div>
            <div className="oink-hero-stat">
              <div className="oink-hero-stat-label">Treasury</div>
              <div className="oink-hero-stat-val">Herd-Controlled</div>
            </div>
          </div>
          <div className="oink-hero-panel-foot">
            🐷 ☠️ OINK Alert: Fly High or Fry, Piggy! ☠️ 🐷
          </div>
        </aside>
      </section>

      <LiveStats />

      <div className="oink-card-grid">
        <article className="oink-card">
          <h3>Stake Your PulseChain Bag for OINK 💎🙌</h3>
          <p>
            The PulseChain crew can mine Piggy Bank (OINK) by staking PLS,
            PLSX, INC, and other PulseChain tokens. Hourly slop fees fatten the
            treasury — pigs gotta eat, fam! 🐽🍽️
          </p>
        </article>
        <article className="oink-card">
          <h3>Bitcoin&rsquo;s Scarcity + BUYBACK Power 🚀</h3>
          <p>
            Piggy Bank fuses Bitcoin&rsquo;s rare vibe with a BUYBACK beast.
            Mining fees fuel a treasury that snaps up OINK and MAKES PIGS FLY!
            🐷✨ (DYOR, no moon guarantees)
          </p>
        </article>
        <article className="oink-card">
          <h3>Strategic Slop Reserves for the Herd 🎉🏦</h3>
          <p>
            Stacked with PulseChain&rsquo;s juiciest reserves, this strategic
            OINKy treasury is herd-controlled! Vote for wild plans or
            bacon-fueled chaos — pigs decide the squeal! 🐽💸
          </p>
        </article>
      </div>

      <div className="oink-alert">
        🐷 ☠️ OINK Alert: Fly High or Fry, Piggy! ☠️ 🐷
      </div>

      <div className="oink-section-label">Dig Into the Trough</div>
      <div className="oink-link-cards">
        <Link className="oink-link-card" to="/faq">
          <strong>Dive Into the FAQ 🐽🔥</strong>
          <span>OINK risks &amp; hype, kept 💯. Know the deal before you
            YOLO.</span>
          <em>OINK Risks &amp; Hype →</em>
        </Link>
        <Link className="oink-link-card" to="/oinkpaper">
          <strong>Grab the OINKpaper 🐷📜</strong>
          <span>Pig out on vibes! The whole pig party on one page.</span>
          <em>Pig Out on Vibes →</em>
        </Link>
        <Link className="oink-link-card" to="/tech">
          <strong>
            Tech Deets 🐽💤
          </strong>
          <span>(WARNING: SNOOZE FEST!) Mining, governance, audits, and every
            smart contract address.</span>
          <em>OINK If You Dare →</em>
        </Link>
      </div>

      <div className="oink-telegram">
        <div>
          <div className="oink-bigline">Join the Pig Pen Chat Barn 🐷</div>
          <p className="oink-desc" style={{ margin: "8px 0 0" }}>
            The herd hangs out on Telegram — governance squeals, live protocol
            feedback, and premium slop memes.
          </p>
        </div>
        <a
          className="oink-cta"
          href={LINKS.telegram}
          target="_blank"
          rel="noreferrer"
        >
          Join the Telegram
        </a>
      </div>
    </main>
  );
}
