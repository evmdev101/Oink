import { DistributionClaims } from "../components/DistributionClaims";
import { MaintenanceStatus } from "../components/MaintenanceStatus";
import { useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import { ResourceFooter } from "../components/ResourceFooter";
import { ProtocolFaq } from "../components/ProtocolFaq";
import { FarmRecovery } from "../components/FarmRecovery";
import { ContractList } from "../components/ContractList";
import { ScrollRegion } from "../components/ScrollRegion";
import { CORE_CONTRACTS, GOVERNANCE_CONTRACTS, OFFICIAL_SOURCES, TREASURY_AND_HELPER_CONTRACTS, TIME_MINER_CONTRACTS, ECOSYSTEM_MINER_CONTRACTS } from "../config/contracts";
import { LINKS } from "../config/links";
import { TreasuryActivity } from "../components/TreasuryActivity";
import { InfoTooltip } from "../components/InfoTooltip";
import "./home-resources.css";
import "./overview-layout.css";
import "../components/mining-offers.css";
import "./secondary-page-stability.css";

const sourceCards = [
  { label:"Project website", title:"OINK information site", body:"The project-controlled entry point for the mining application, documentation, audits, and published contract directory.", href:OFFICIAL_SOURCES.website },
  { label:"Contract source", title:"PiggyBank repository", body:"The public Solidity source referenced by the project contract page. Its license applies independently from this interface.", href:OFFICIAL_SOURCES.contractSource },
];
const risks = [
  ["Balances and estimates", "Gross miner values and farm accounting are not cash-out quotes. Estimated growth is not confirmed earnings. Price, emissions, allocation and payout destinations can change."],
  ["Locks and fees", "Mandatory service, maturity, grace periods and penalties must be checked for each miner. Farms can have deposit and ongoing funding costs. Depositing is not necessarily free."],
  ["Permissions and governance", "Voting credit, miner voting power and Senate ballots are different systems. Documentation and Telegram membership do not prove on-chain authority. Do not assume every proposal has a direct Senate veto."],
  ["What this interface can do", "Six time-miner contracts support deployment, transfers, longer-duration upgrades, mature renewals and withdrawals. Full or partial share actions depend on each contract's current settings and lock rules. Treasury-funded miner donations have separate callback creation, funding proposal and activation steps. Reviewed farms support deposits, allowances, claims, full withdrawals and emergency withdrawals that forfeit rewards. Each farm explains its available actions; four legacy token integrations link to the original application because token fees or unpublished implementation code prevent the ordinary local transaction checks. Community maintenance includes buybacks, protocol and PulseX harvests, reward events, allocation updates, fee collection and Senate credit tools. Sale purchases, referral and distribution claims, HEX share registration, voting credit, miner voting and delegation, eleven ordinary proposal families, Senate actions, treasury requests, Governor replacements and NFT allocation have local transaction controls. NFT mining is managed in its linked project dashboard. Action buttons check current terms before opening your wallet for confirmation. Connecting or opening a page never sends a transaction."],
  ["Wallet identity", "Always confirm the full address and selected wallet extension. This interface can restore an already authorized provider session. Disconnect and select the correct wallet if the displayed address is unfamiliar."],
  ["Security and price risk", "Smart-contract defects, malicious approvals, governance changes, RPC failures and loss of token value can cause losses. A successful simulation or historical audit is not a safety guarantee."]
];
export function ProtocolPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const sections = [["guides", "Guides & sources", "whitepaper introduction documents"], ["faq", "FAQ", "questions miners farms rewards penalties"], ["contracts", "Contracts", "addresses blockchain directory"], ["audits", "Audit reports", "security review"], ["risks", "Risks & limitations", "fees wallet safety valuation"], ["treasury", "Treasury & activity", "balances history"], ["recovery", "Farm recovery", "emergency withdrawal"], ["tools", "More OINK tools", "claims distribution maintenance"]];
  const visibleSections = sections.filter(section => section.join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const requested = params.get("section") ?? "guides";
  const tab = ["guides", "faq", "contracts", "audits", "risks", "treasury", "tools", "recovery"].includes(requested) ? requested : "guides";
  const docs = [
    ["OINKpaper", "Project overview in the original language.", LINKS.oinkpaperPdf],
    ["Technical whitepaper", "Detailed protocol design; deployed behavior requires separate verification.", LINKS.whitepaperPdf],
  ];
  return <main className="app-page resources-library">
    <section className="page-intro"><div><span className="page-kicker">OINK Docs</span><h1>Understand the protocol.</h1><p>Guides, source links, contract listings and verification status in one place.</p></div></section>
    <div className="docs-layout"><aside className="docs-sidebar"><label>Find a topic<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Miners, fees, contracts…" /></label><nav className="resources-nav" aria-label="Resource sections">{visibleSections.map(([id, label]) => <button type="button" aria-pressed={tab === id} key={id} onClick={() => setParams({ section: id })}>{label}</button>)}</nav>{!visibleSections.length && <p>No topics match. <button type="button" onClick={() => setSearch("")}>Clear search</button></p>}</aside><div className="docs-content">
    {tab === "recovery" && <FarmRecovery />}
    {tab === "tools" && <><p><Link to="/maintenance">Open protocol maintenance →</Link> · <Link to="/protocol?section=recovery">Emergency farm recovery →</Link></p><DistributionClaims /><MaintenanceStatus /></>}
    {tab === "treasury" && <TreasuryActivity />}
    {tab === "faq" && <ProtocolFaq />}
    {tab === "guides" && <><h2>Start here</h2><p>New to OINK? <Link to="/how-it-works">Start with How it works →</Link></p><div className="professional-grid two-columns">{docs.map(([title, text, url]) => <a className="professional-card source-card" key={title} href={url} target="_blank" rel="noreferrer"><h3>{title}</h3><p>{text}</p><span className="card-link">Open document</span></a>)}</div><section className="content-section"><h2>Original sites &amp; source code</h2><div className="professional-grid two-columns">{sourceCards.map(source => <a className="professional-card source-card" key={source.label} href={source.href} target="_blank" rel="noreferrer"><h3>{source.title}</h3><p>{source.body}</p></a>)}</div></section></>}
    {tab === "contracts" && <><div className="info-heading"><h2>Contract directory</h2><InfoTooltip label="About contract addresses">An address identifies a particular contract on PulseChain. Similar names and token symbols can refer to different contracts, so compare the full address and network. Explorer links let you inspect transactions and published code. A listing or verified source does not guarantee safety or current authority.</InfoTooltip></div><p>Listings are reference addresses, not blanket proof of safety or present authority. Check the live target and its role before use.</p><div className="resource-facts">{[["Core", CORE_CONTRACTS], ["Time miners", TIME_MINER_CONTRACTS], ["Ecosystem farms", ECOSYSTEM_MINER_CONTRACTS], ["Governance", GOVERNANCE_CONTRACTS], ["Treasury, NFTs & helpers", TREASURY_AND_HELPER_CONTRACTS]].map(([title, records]) => <details key={String(title)}><summary>{String(title)}</summary><ScrollRegion label={String(title) + " contracts"}><ContractList contracts={records as typeof CORE_CONTRACTS} compact /></ScrollRegion></details>)}</div></>}
    {tab === "audits" && <><h2>Published audit reports</h2><p>The project links these historical reports, some under the PulseDAO name. Report dates, audited code versions and coverage must be checked in each document. Their applicability to today's deployed contracts has not been established by this content review.</p><div className="professional-grid three-columns">{[["SolidProof", LINKS.audits.solidproof], ["RD Auditors", LINKS.audits.rdAuditors], ["Independent protocol review", LINKS.audits.independent]].map(([title, href]) => <a className="professional-card source-card" key={title} href={href} target="_blank" rel="noreferrer"><h3>{title}</h3><p>Original PDF · historical scope</p><span className="card-link">Read report</span></a>)}</div><p>An audit does not guarantee funds, returns, or the safety of every contract and upgrade.</p></>}
    {tab === "risks" && <><h2>Before you use OINK</h2><div className="resource-facts">{risks.map(([title, text]) => <details key={title}><summary>{title}</summary><p>{text}</p></details>)}</div><p><Link to="/governance">Review governance state</Link></p></>}
    </div></div><ResourceFooter />
  </main>;
}

