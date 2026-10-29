import { useEffect, useState } from "react";
import { LINKS } from "../config/links";

const SECTIONS: Array<[string, string]> = [
  ["mining", "Mining Features"],
  ["governance", "Governance Features"],
  ["security", "Security & Audits"],
  ["contracts", "Smart Contracts"],
];

const MINING_FEATURES: Array<[string, string]> = [
  [
    "Creating a New Miner",
    "Users can commit their Piggy Bank (OINK) tokens into a “virtual miner”. The tokens are burned and committed for a certain period of time. Longer lock-ups give higher rewards and more voting power inside the network. The long term miners are effectively rewarded with OINK tokens for securing and governing the protocol.",
  ],
  [
    "Lock-up Conditions & Emergency End",
    "If you emergency end your miner prematurely, a penalty will be deducted. Penalties decrease linearly from the beginning until maturation and range from 25% to 82%. Once your miner matures, it can be withdrawn in full. It can also be rolled over (extended), for which the governing contract pays you a bonus. If you do not withdraw within the grace period, your miner will continue to earn rewards, but the penalty will be re-introduced. You can always re-commit (reset timer) and avoid the penalty.",
  ],
  [
    "Hop Active Miner (Extend Duration)",
    "You can always “hop” your active miner into a longer duration; you will earn higher rewards and receive more voting power. Your rewards earned, as well as the time already served, will be transferred.",
  ],
  [
    "Miner Rollover (Bonus for Extending)",
    "Once your miner matures, you can roll it over (extend) and receive a bonus for doing so. Bonus is paid from the governing contract. Bonuses are determined through the Piggy Bank protocol governance.",
  ],
  [
    "Gift Miner (Create to Another Wallet)",
    "You can create a miner for another wallet. This can be used to give a miner to another user, or to create a miner for a cold wallet address. There is an additional option that allows you to set a mandatory time lock (during which the miner can not be prematurely ended).",
  ],
  [
    "Transfer Miner",
    "Miners can be transferred to another wallet.",
  ],
  [
    "Miner Divisibility",
    "Majority of the features support the partitioning of miners. For example, you can withdraw, transfer, hop, or roll over just a portion of the miner.",
  ],
  [
    "Pulse Ecosystem Mining",
    "You can mine rewards using PulseChain (PLS), PulseX (PLSX), Incentive (INC), HEX, and many other PulseChain ecosystem tokens. The reward allocations are managed by the decentralized governance.",
  ],
  [
    "NFT Mining",
    "Piggy Bank system allows mining rewards using NFTs. There is an in-built decentralized governance process that allows any NFT collection to be given allocation for Piggy Bank (OINK) mining rewards.",
  ],
];

const GOVERNANCE_FEATURES: Array<[string, string]> = [
  [
    "Voting Power",
    "The protocol has no admin keys. Mining with your OINK not only earns rewards, but also gives voting power within the network. Longer duration miners grant more voting power per token, creating a system with aligned incentives, wherein long-term miners govern the protocol. The system has an extremely modular design, allowing for secure modifications and upgrades. Proposals for upgrades are enforced in a decentralized manner, through on-chain voting. There are no admin keys, no intermediaries and no central parties required.",
  ],
  [
    "The Senate",
    "In Piggy Bank there is an inherent risk that big token holders would accumulate a large position in the protocol and effectively take over. To combat this issue, Piggy Bank incorporates the concept of a “senate” — just like Bitcoin incorporates validating nodes to keep miners in check. The senate consists of regular users, where one person equals one vote. The senate has the power to veto all governance and treasury proposals. Senators can add new members to the senate and further decentralize the protocol, and can expel members too. Each senate member receives 1% of total published tokens in the form of voting credit, used for regulating the system and its proposals. Senators are rewarded for securing the network with the capability of minting 0.01% of total published tokens each, with the combined reward for all senators capped at 1% — low on purpose, because senators should serve the community, not chase bags.",
  ],
  [
    "Voting Credit",
    "To create proposals, one must commit and burn a minimum threshold of Piggy Bank credit. After the proposal is initiated, there is a period of time during which other participants commit their voting credit to vote for or against the proposal. If the votes in favor exceed those against, the proposal can then be enforced. However, if at any time the votes against exceed the votes in favor, the proposal is rejected. The proposer can add a delay period to first accumulate votes in favor — akin to a bidding mechanism for accepting proposals.",
  ],
  [
    "Basic Settings",
    "Basic settings can be configured to set: 1) Cost to vote — the minimum voting credit required to initiate a proposal (filters low-quality proposals and prevents spam); 2) Delay Before Enforce — the time from proposal initiation until it can be enforced; 3) Rollover Bonuses — the bonus amount for each miner duration option; 4) Deposit and Funding Fee on PulseChain ecosystem mining.",
  ],
  [
    "Delegate Voting Power",
    "You can delegate your voting power to another wallet. The delegatee only receives the ability to cast votes using your voting power.",
  ],
  [
    "Reward Boost Events",
    "Reward boost events can be scheduled through the Piggy Bank portal. Frequency of the reward boost events is determined by the token threshold (a required threshold of tokens must be collected before a reward boost event can be triggered).",
  ],
  [
    "Mining Reward Allocation",
    "Mining reward allocations can be managed through the governance. Piggy Bank determines the amount of rewards allocated to the PulseChain ecosystem.",
  ],
  [
    "Governor Tax",
    "The governing contract collects penalties from prematurely-ended miners, as well as a portion of inflation. This mechanism sets the percentage of inflation (the “tax”) the governing contract receives — capped at 10%. Tokens received by the governing contract can only be burned through governance or deposited into the treasury wallet, and must be sacrificed (burned) to initiate a reward boost event.",
  ],
  [
    "Token Burns",
    "Token burns can be scheduled through the Piggy Bank. Tokens are burned from the governing contract.",
  ],
  [
    "Protocol Treasury",
    "The treasury is a decentralized fund (a “piggy bank”) controlled by the community through the Piggy Bank protocol. It is funded through the governor tax built into the contract through inflation (OINK tokens), as well as through mining fees contributed by miners. It can support grants to contributors, other aligned protocols, OINK buybacks to create treasury reserves, philanthropy like longevity research, and any other purpose approved by the community — all under rules defined in the smart contract, ensuring fair, decentralized and transparent use.",
  ],
  [
    "Rewards for Contributors & Influencers",
    "Piggy Bank protocol allows users to request rewards for their positive contributions to the community. Believe you are worthy? Simply request tokens through the governance. Other users vote FOR or AGAINST, and if your proposal achieves the necessary support, the grant is paid out — to your wallet OR as a locked miner inside the network. A FULLY transparent process for rewarding influencers: no more undisclosed promotions, all actions publicly visible on the blockchain.",
  ],
  [
    "Buy-Back & Burn",
    "The Buy-Back contract plays a vital role in supporting the long-term sustainability of the Piggy Bank ecosystem. This contract swaps PLS tokens into Piggy Bank tokens and sends the tokens to the treasury, creating OINK treasury reserves.",
  ],
  [
    "Live Telegram Feedback",
    "As users interact with the governance contracts, the actions are instantly broadcasted to the Telegram live chat. This has no effect on the decisions, but it notifies the users and gives the option to discuss the proposals off-chain via chat on Telegram.",
  ],
];

type AddressGroup = { title: string; rows: Array<[string, string]> };

const CONTRACT_GROUPS: AddressGroup[] = [
  {
    title: "Core Contracts",
    rows: [
      ["Piggy Bank (OINK) Token", "0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38"],
      ["Governing Contract", "0x331146b366c0Cd2AcA542ce71E5D6fb66bf07D16"],
      ["Inflation", "0x486fEa20eA242456b450B005ED7D019E3E984f28"],
      ["Senate", "0x147B43930283d1DDe43d805B7f17E4604b7ca493"],
    ],
  },
  {
    title: "Distribution Contracts (Merkle Tree)",
    rows: [
      ["For Contributors", "0xE87C806f8AFA1cE543ab3C44D1c4b130B83574CE"],
      ["For Rewards", "0x51Aeb56C05a2BD781207B63D395475b7185c5fd7"],
    ],
  },
  {
    title: "Time-Based Mining",
    rows: [
      ["1 Month", "0x39b3E852D6fFA1aF6694Ef87C062450de6778da8"],
      ["3 Month", "0x9013B1067C52E897E713044dE36c56BfdA8Ec9B4"],
      ["6 Month", "0xb180450f064E79adBFD71Bc2fB086F9CD0Af0D67"],
      ["1 Year", "0xc0483f1b0dcf601888fFD0d3A44b7124e80DB7D1"],
      ["3 Year", "0x15b51Ece819f3B51ce814de67bB2419660701a3c"],
      ["5 Year", "0xf3E82f4123d4262a2baEC25b03652f3932A91739"],
    ],
  },
  {
    title: "PulseChain Ecosystem Rewards",
    rows: [
      ["PLS Miner", "0xE145932f6b010B0166aA6860D56b2730744B7d6f"],
      ["PLSX Miner", "0x16233F6d7398f134EbCec11101e792c03ED296a4"],
      ["INC Miner", "0x852443CB5b5f5B10e514CA74104bBF2Cd6CeF868"],
      ["HEX Miner", "0x164D4C1fDd74A5b7256Fd9Eca958c9ff70617c03"],
      ["T-Share Miner", "0x6b465C480CD590852f90c8f1b41Ab22922a1BF85"],
      ["HOA Miner", "0x9E70665aDee807f262Ae59Dc1f8D4Dd878320C21"],
      ["pDAI Miner", "0xc13b8974CD5caa67D7e539D2654C872b5AcA5105"],
      ["ATROPA Miner", "0x7c61919AccF037975bbD3a91b0F5811c640018b1"],
      ["SolidX Miner", "0x2057dd1687eafCD809386a41012748AC509df542"],
      ["Treasury Miner", "0x96185280d32184C847580c35eaB77affaC835d98"],
      ["pUSDT Miner", "0xed1b56c799d28a988bd79bbf2f7e238c2ba15c21"],
      ["pUSDC Miner", "0xf46810ce204a9a85a673ea9bbcc1bf5481ee1328"],
      ["PDRIP Miner", "0xc49EF441FFb79108047E4dF812F375A7E48FD3De"],
      ["EMIT Miner", "0x1aB20028a50477e11bC4066047D8942De1375eF7"],
      ["Communitas Miner", "0x4441c3bDB96139A45dF653Ec0432d076631A6D9F"],
      ["pTGC Miner", "0xa620473a3eb138c43e1f7065bda0ded0e039d8fd"],
      ["UFO Miner", "0xce34298e7456fd748e432e02cc4f107ac864c739"],
    ],
  },
  {
    title: "Protocol Settings",
    rows: [
      ["Consensus Contract", "0x7917e04Eb4463CF80Cc00040BA0f1fF125926eF3"],
      ["Reward Boost", "0xc77c66913B5f60522Ccb98857228511930da7403"],
      ["Basic Settings", "0x5DebADaf41ED55270e0F9944FD389745e73d29B9"],
      ["Allocation Settings", "0x0dc0Fabe4c9d57cCaD055b4cD627D0d24fA3C98E"],
      ["Voting Credit", "0xCF14DbcfFA6E99A444539aBbc9aE273a7bb5d75A"],
      ["Referral Rewards", "0xf69357627d6dcc463ac30273Aae13fDB49B07C15"],
      ["Referral Rewards (old)", "0x066F0a45801bcbc5232b11ed4b97c39E1369fe59"],
    ],
  },
  {
    title: "Treasury",
    rows: [
      ["Treasury Wallet", "0x3a4DA32dc29b146F26D8527e37FeaAe45fBebe69"],
      ["Treasury Miner", "0x4807bdD7039a1fc236c14dc60D73a64eEa450731"],
      ["NFT Wallet", "0x26E6e614C46dA4c459d0dB2121A986672F603c00"],
    ],
  },
  {
    title: "NFTs",
    rows: [
      ["NFT Mining Module", "0x140f16365d05DcC84Fa489194CD022d5CBee4cb2"],
      ["NFT Allocation", "0xD8508461e8134e25dc630871566B1551e797E1a7"],
    ],
  },
  {
    title: "Helper Contracts",
    rows: [
      ["Buy-Back", "0xa36d037B01C148025C54e4f86C0032F05a93D4Ce"],
      ["Proxy Voting", "0x003F5d5bB97028AF17B0925B08cb184a74F9030f"],
      ["Contract Sync", "0x506D24B519AC4Af9724Cc5F9eaf006e987e753d6"],
    ],
  },
  {
    title: "Farming Contracts",
    rows: [
      ["PulseX Staking", "0xc6E9924Ea3141b5555b18b82f7Bd66f9BB084C2D"],
      [
        "Swap PLSX for INC and provide Liquidity",
        "0xA6B1e4Fc9ECd29E9438421A32023E0b8d677D6fc",
      ],
      ["Unwrap PLSX/INC Liquidity", "0x14B9C777B078F8AB5F26B72d3007932a7e207e0E"],
      ["OINK Treasury Locked Mining", "0x4807bdD7039a1fc236c14dc60D73a64eEa450731"],
      ["Earn Protocol Staking", "0xc6E9924Ea3141b5555b18b82f7Bd66f9BB084C2D"],
      [
        "INC Printer Staking (stake PRINT)",
        "0x5C30303F7F9640E268d3CE5844E7E360009AC03C",
      ],
      [
        "INC Printer Staking (sell PRINT for INC)",
        "0x026822796CAa38971523f2D8C4384F76b7C7b1B9",
      ],
      [
        "INC Printer Staking (sell PRINT rewards for DEGEN and burn it)",
        "0xE142C8cC17D9279A1aA01A0f8420A63E22F9782f",
      ],
      ["Actuator Staking (HTT5000)", "0xbB3822Dc9c033D48b04Af93D4bF75f0A10ddda9d"],
      ["Actuator Staking (HTT7000)", "0x8B21bCBB2c67aa0aF2d8712853dCe80334621bE0"],
      ["Actuator Staking (HTT3000)", "0x599FE019e2e1dc71Dd11bc647AD53a4ac53a3b42"],
      [
        "Wrap PLS and Send to INC Printer Staking",
        "0xE479772CBA63913d8101DE4D198E974C1c19f686",
      ],
      [
        "Actuator Staking (HTT5000); sells rewards for PLSX",
        "0x488C81D85501769CF4Ca79ED657aF0633607ab1e",
      ],
      [
        "Actuator Staking (HTT7000); sells rewards for eHEX",
        "0xD3270DC3361f34a1cb0c4cd2b0b352adB64D4498",
      ],
      [
        "Actuator Staking (HTT3000); sells rewards for OINK and burns it",
        "0xCd026f1b1F8b04f045d13af21877Db98033FF84e",
      ],
      [
        "EMIT Stake (OINK/DEGEN); rewards buy OINK",
        "0x6A15f253F73E98558A619CFbd1b8c5bc9A9107eF",
      ],
    ],
  },
];

export function TechPage() {
  const [active, setActive] = useState("mining");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-120px 0px -70% 0px" },
    );
    SECTIONS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="oink-wrap">
      <div className="eyebrow">Tech Deets — OINK If You Dare 🐽💤</div>
      <h1 className="oink-title">Piggy Bank Features</h1>
      <div className="oink-notice">
        <strong>Important Notice:</strong> The protocol has initially been
        developed and branded as &ldquo;PulseDAO&rdquo;, but the protocol has
        been renamed into &ldquo;Piggy Bank (OINK)&rdquo;. Some of the
        graphics, audits and similar still contain the old
        &ldquo;PulseDAO&rdquo; branding. The technology has stayed the same,
        only the name has changed.
      </div>
      <div className="oink-cta-row">
        <a
          className="oink-cta secondary"
          href={LINKS.whitepaperPdf}
          target="_blank"
          rel="noreferrer"
        >
          Read the Full Whitepaper 📄
        </a>
      </div>

      <div className="oink-grid">
        <nav className="oink-rail" aria-label="Tech sections">
          {SECTIONS.map(([id, label]) => (
            <button
              key={id}
              className={`oink-rail-btn${active === id ? " active" : ""}`}
              onClick={() => jump(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="oink-content">
          <section id="mining" className="oink-section" style={{ marginBottom: 8 }}>
            <h2 className="oink-section-label">Mining Features</h2>
            {MINING_FEATURES.map(([title, body], index) => (
              <article
                className="oink-card"
                key={title}
                style={index > 0 ? { marginTop: 14 } : undefined}
              >
                <span className="oink-step-num">{index + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </section>

          <section id="governance" className="oink-section" style={{ marginBottom: 8 }}>
            <h2 className="oink-section-label">Governance Features</h2>
            <div className="oink-notice">
              Piggy Bank has three types of voting: <strong>voting power</strong>,{" "}
              <strong>the senate</strong> and <strong>voting credit</strong>.
              Voting power is used for making important updates to the
              protocol, while voting credit is used for decisions on
              already-integrated processes such as basic settings, reward
              boost events, mining reward allocations, token burns and
              governor tax. All miners receive voting power — long term
              lock-up gives more. The senate further decentralizes the network
              and prevents big token holders from gaining control. The whole
              system can be altered through voting power over time, in a
              decentralized and permissionless manner. Without admin keys and
              without central authority — the power is in the sole hands of
              the community.
            </div>
            {GOVERNANCE_FEATURES.map(([title, body], index) => (
              <article
                className="oink-card"
                key={title}
                style={index > 0 ? { marginTop: 14 } : undefined}
              >
                <span className="oink-step-num">{index + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </section>

          <section id="security" className="oink-section" style={{ marginBottom: 8 }}>
            <h2 className="oink-section-label">Security &amp; Audits</h2>
            <article className="oink-card">
              <p>
                Piggy Bank protocol consists of multiple smart contracts. The
                entire protocol has been reviewed by an independent security
                analyst. The smart contracts where users deposit their tokens
                (PLS, PLSX, HEX, INC, …) and require a higher level of
                security assurance have been audited by 2 professional
                security auditing firms. You can view the Piggy Bank source
                code on{" "}
                <a href={LINKS.github} target="_blank" rel="noreferrer">
                  GitHub
                </a>
                .
              </p>
              <ul className="oink-list">
                <li>
                  <a
                    href={LINKS.audits.solidproof}
                    target="_blank"
                    rel="noreferrer"
                  >
                    #1 Security Audit by SolidProof
                  </a>
                </li>
                <li>
                  <a
                    href={LINKS.audits.rdAuditors}
                    target="_blank"
                    rel="noreferrer"
                  >
                    #2 Security Audit by RD Auditors
                  </a>
                </li>
                <li>
                  <a
                    href={LINKS.audits.independent}
                    target="_blank"
                    rel="noreferrer"
                  >
                    #3 Extensive Protocol Review by an Independent Security
                    Researcher
                  </a>
                </li>
              </ul>
            </article>
          </section>

          <section id="contracts" className="oink-section" style={{ marginBottom: 8 }}>
            <h2 className="oink-section-label">
              Piggy Bank Protocol: Smart Contracts
            </h2>
            {CONTRACT_GROUPS.map(({ title, rows }, index) => (
              <article
                className="oink-card oink-addr-group"
                key={title}
                style={index > 0 ? { marginTop: 14 } : undefined}
              >
                <h3>{title}</h3>
                {rows.map(([name, address]) => (
                  <div className="oink-addr-row" key={`${name}-${address}`}>
                    <span>{name}</span>
                    <a
                      href={LINKS.scan(address)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {address}
                    </a>
                  </div>
                ))}
              </article>
            ))}
          </section>

          <div className="oink-telegram">
            <div>
              <div className="oink-bigline">
                Have a question? Have a suggestion? 🐽
              </div>
              <p className="oink-desc" style={{ margin: "8px 0 0" }}>
                Share your idea with the herd on Telegram.
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
        </div>
      </div>
    </main>
  );
}
