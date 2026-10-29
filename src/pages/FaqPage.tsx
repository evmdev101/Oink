import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LINKS } from "../config/links";

const RISKS: Array<[string, string]> = [
  [
    "🚨 OINK Ain’t an Investment, Fam!",
    "Piggy Bank (OINK) tokens are straight-up utility vibes — use ‘em to govern and play in our ecosystem. No moon promises here! 🌙",
  ],
  [
    "Ownership? Nah",
    "These tokens don’t give you a piece of the pie 🥧 — they’re just your VIP pass to vote and vibe in the protocol. No stonks, just OINKs.",
  ],
  [
    "Regulation? LOL",
    "No financial overlords are babysitting OINK. It’s a wild pig — value might moon or go to zero. Market’s a rollercoaster, fam! 🎢",
  ],
  [
    "Risk Alert! 🚨",
    "OINK’s future? Could be a bacon sizzle or a total fry. Might hit zero faster than your ex blocks you. Know the risks before you jump in! 🐷🔥",
  ],
  [
    "Decentralized AF",
    "We’re 100% decentralized — no suits, no bosses. Founding crew is ghosting post-launch 👻. It’s all on the community now — HODLers run the show!",
  ],
  [
    "Community Rules Everything",
    "The fam’s in charge now — governance, decisions, all of it. You’re the captain of this piggy ship! 🏴‍☠️",
  ],
];

const FAQ: Array<{ q: string; a: ReactNode }> = [
  {
    q: "WTF Is Piggy Bank and What’s It Do? 🐷",
    a: (
      <p>
        Piggy Bank is a memecoin and decentralized protocol on PulseChain,
        built for the LOLS with Bitcoin-style scarcity (but way funnier).
        We’re here to make OINK the dankest token while filling a treasury
        piggy bank to fund public goods, charity, OINK buybacks and based
        vibes — making the pigs fly for the whole herd! OINK OINK,
        motherpiggers! 🐽
      </p>
    ),
  },
  {
    q: "How Do I Earn OINK with PulseChain Tokens? 🤑",
    a: (
      <p>
        Yas, fam! Mine OINK for free using your PLS, PLSX, HEX, INC, or other
        PulseChain tokens in the Mudpit. We’re building a big, degen herd with
        a fairly distributed token — no whales, just diamond hooves! 💎🐾
      </p>
    ),
  },
  {
    q: "What’s OINK Good For? 🤔",
    a: (
      <p>
        OINK tokens are your VIP snout to secure and govern the protocol, plus
        they reward you for being a diamond-hooved HODLer. Stake ‘em, vote
        with ‘em, flex ‘em — it’s all about keeping the network SAFU and vibey
        while making the pigs fly through community initiatives! 🐷
      </p>
    ),
  },
  {
    q: "What’s the Porky Senate? 🏛️",
    a: (
      <p>
        The Porky Senate is a crew of 100 Pork Lords (1 pig = 1 vote) keeping
        whales from yeeting the protocol. They veto governance and treasury
        moves to keep things SAFU and decentralized — think Bitcoin’s
        validating nodes, but with more OINK! 🐽
      </p>
    ),
  },
  {
    q: "How Do I Join the Porky Senate? 🗳️",
    a: (
      <p>
        We’re looking for 50-100 based PulseChain chads to be Pork Lords. Hit
        up your fave X or Telegram influencers to apply — or throw your own
        hoof in if you bring value! Gotta have an X/Telegram account to flex
        your degen cred. 🐷💪
      </p>
    ),
  },
  {
    q: "Why PulseChain Fam for the Porky Senate? 🌐",
    a: (
      <p>
        Snout Senators protect the PulseChain herd and keep token distribution
        fair. Miners might try to hog the slop, but the Porky Senate balances
        it out — rewards for all, not just the big pigs! 🐽❤️
      </p>
    ),
  },
  {
    q: "What’s the Treasury Piggy Bank For? 🏦",
    a: (
      <p>
        The treasury funds public goods, charity, based vibes on PulseChain
        and OINK buybacks to create treasury reserves and make the pigs fly
        (no guarantees tho, DYOR!)! The Porky Senate and HODLers decide how to
        spend it, keeping it community-driven. 🐷❤️
      </p>
    ),
  },
  {
    q: "Where Do Rewards & Treasury Slop Come From? 💰",
    a: (
      <p>
        Straight from the smart contract’s inflation — built-in slop for
        miners and the treasury piggy bank. No middleman, just code! The
        treasury helps make the pigs fly by funding community projects, voted
        on by the Porky Senate. 🐽
      </p>
    ),
  },
  {
    q: "How’s Piggy Bank Like Bitcoin? 🧠",
    a: (
      <p>
        We’re Bitcoin’s funny cousin who learned to meme. Bitcoin’s the OG
        scarce digital gold; we’re the dank memecoin with a treasury twist to
        make the pigs fly through community vibes. Check the sims and diffs
        below! 🐷💛
      </p>
    ),
  },
  {
    q: "Bitcoin x Piggy Bank: The Simils 🐷💛",
    a: (
      <ul className="oink-list">
        <li>
          Bitcoin caps at 21M coins; Piggy Bank caps at <strong>21B OINK</strong>
          {" "}(more zeros, more fun!).
        </li>
        <li>
          Early Bitcoin was free to mine with basic gear; Piggy Bank’s free
          for PulseChain fam using PLS, HEX, etc.
        </li>
        <li>
          Bitcoin halves rewards every 4 years; Piggy Bank drops inflation
          with Reward Boost Events + token burns 🔥.
        </li>
        <li>
          Bitcoin uses validating nodes to stop big miners; Piggy Bank has the
          Porky Senate to keep whales in check 🏛️.
        </li>
        <li>Both can upgrade via consensus — based AF! ✅</li>
      </ul>
    ),
  },
  {
    q: "Bitcoin x Piggy Bank: The Diffs 🤔",
    a: (
      <ul className="oink-list">
        <li>Bitcoin’s a network; Piggy Bank’s a protocol on PulseChain.</li>
        <li>
          Bitcoin miners secure the network; Piggy Bank miners secure, govern,
          and keep it real.
        </li>
        <li>
          Bitcoin supply <em>could</em> change via consensus (boo!); Piggy
          Bank’s supply is FIXED (yay!).
        </li>
        <li>
          Bitcoin blocks take 10 mins; Piggy Bank rewards hit every 10 secs on
          PulseChain ⚡.
        </li>
        <li>Bitcoin kills the planet 🌍💀; Piggy Bank’s green AF 🌿.</li>
        <li>
          Bitcoin mining’s for big boys with fancy gear; Piggy Bank mining’s
          for any pig — just you and a smart contract.
        </li>
        <li>
          Bitcoin’s community has no power; Piggy Bank’s herd runs the
          treasury to make the pigs fly — fund public goods, charity, and
          more! 🏦
        </li>
        <li>
          Bitcoin rewards miners who pollute; Piggy Bank rewards the fam to
          build a better world.
        </li>
        <li>
          Bitcoin’s the safe boomer coin; Piggy Bank’s a risky degen dream —
          might soar or flop! 🐷🔥
        </li>
      </ul>
    ),
  },
  {
    q: "Fees? What Fees? 💸",
    a: (
      <p>
        We got optional deposit and mining fees, turned on by the Porky
        Senate. Deposit fee hits once, mining fee’s ongoing. Fees go to the
        treasury piggy bank to make the pigs fly — think collective slop for
        the herd! Referral fees might also reward you for spreading the OINK
        love. 🐽💰
      </p>
    ),
  },
  {
    q: "Is Piggy Bank Secure, or Am I Gonna Get Rekt? 🔒",
    a: (
      <p>
        Two pro security firms and an indie analyst audited our smart
        contracts — PLS, HEX, PLSX, INC holders, you’re <em>probably</em> SAFU.
        Peer review? Check. But crypto’s the Wild West — bugs, flaws, or
        gremlins could sneak in. No 100% guarantees, fam. HODL at your own
        risk! 🤠
      </p>
    ),
  },
  {
    q: "What’s the Risk, Fam? 🚨",
    a: (
      <p>
        Your principal’s likely SAFU, and you can mine OINK for free (or cheap
        with fees). But OINK itself? Super experimental — it might soar or
        flop to zero! Bugs, tech fails, or regs could wreck us. No guarantees,
        fam — HODL wisely! 🐷🎰
      </p>
    ),
  },
  {
    q: "Can I Make Bank with Piggy Bank? 🤑",
    a: (
      <p>
        This ain’t a money printer, fam! OINK’s a dank digital asset to vibe
        with the protocol and help make the pigs fly through community
        projects. No financial promises — it could flop faster than you can
        say “NGMI.” We’re here for scarcity and community, not Lambos! 🐷🚗
      </p>
    ),
  },
  {
    q: "Should I Buy OINK? 🛒",
    a: (
      <p>
        We’d rather you mine it for FREE with your PulseChain tokens — LFG! If
        you wanna buy, that’s on you. It’s a wild ride — might soar or flop.
        Only risk what you can yeet, fam. We ain’t liable if you get rekt!
        🐷🔥
      </p>
    ),
  },
  {
    q: "What’s the Founding Team Doing Now? 👻",
    a: (
      <p>
        We poured our hearts into this — no shilling, just building a based
        protocol for the herd. This is our GIFT to you! 🎁 Now that it’s live,
        we’re out — fully decentralized, no more work from us. The community
        and Porky Senate are in charge to make the pigs fly! We might drop
        some educational vibes to help you understand the tech, but that’s it.
        No expectations, fam! 🐷🚀
      </p>
    ),
  },
];

export function FaqPage() {
  return (
    <main className="oink-wrap">
      <div className="eyebrow">The Degen Disclaimer &amp; Risks</div>
      <h1 className="oink-title">
        🐷 Piggy Bank (OINK): The Degen Disclaimer &amp; Risks 🐷
      </h1>
      <p className="oink-desc">
        Yo, fam! We’ve got a THICC FAQ to keep it 💯 about the risks of this
        wild ride. We’re all about transparency — don’t YOLO your rent money
        without knowing the deal! We’re also playing nice with the law (gotta
        keep the SEC off our backs 🕴️). This FAQ is our way of saying “we
        care,” while we HODL the line on compliance in this crazy crypto
        jungle. But let’s be real — regs are a mess, so there’s always a lil’
        risk. OINK OINK! 🐽
      </p>
      <div className="oink-notice">
        No tea, no shade: Piggy Bank ain’t tied to Richard Heart or anyone
        else, and we didn’t get paid to shill this. Just a degen gift to the
        PulseChain fam! 🎁
      </div>

      <div className="oink-card-grid">
        {RISKS.map(([title, body]) => (
          <article className="oink-card" key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>

      <div className="oink-notice">
        By grabbing OINK, you’re saying <strong>“I get it, I’m in.”</strong>{" "}
        DYOR, fam — check your risk vibes. Got doubts? Talk to a financial
        wizard or lawyer bro. Don’t say we didn’t warn ya! 🐽
      </div>

      <section className="oink-section">
        <h2 className="oink-title" style={{ fontSize: "clamp(1.5rem, 2vw, 2.2rem)" }}>
          🐷 FAQ: Let’s Get OINKING! 🐷
        </h2>
        <div className="oink-notice">
          <strong>Heads Up, Degens:</strong> This is just info, not financial
          advice. Not a moon ticket either 🚀. Stuff might change, so keep
          your eyes peeled! 👀
        </div>
        {FAQ.map(({ q, a }) => (
          <article className="oink-faq-item" key={q}>
            <h3>{q}</h3>
            {a}
          </article>
        ))}
      </section>

      <div className="oink-telegram">
        <div className="oink-bigline">Still hungry for slop? 🐽</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="oink-cta" to="/oinkpaper">
            Read the Full OINKpaper
          </Link>
          <a
            className="oink-cta secondary"
            href={LINKS.telegram}
            target="_blank"
            rel="noreferrer"
          >
            Join the Telegram
          </a>
        </div>
      </div>
    </main>
  );
}
