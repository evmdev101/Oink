import { Link } from "react-router-dom";
import { ResourceFooter } from "../components/ResourceFooter";
import "./home-resources.css";
import "./overview-layout.css";

const paths = [
  { title: "Time miners", input: "OINK → locked miner → OINK", text: "Choose a duration and commit OINK. Your position is represented by shares in that miner pool. Its OINK value changes with the pool balance; growth is not a fixed interest rate.", to: "/mining", action: "Explore miners" },
  { title: "Asset farms", input: "Supported asset → farm position → rewards", text: "Deposit the asset accepted by a farm. Check deposit fees, ongoing funding and reward destinations. The gross reward shown can differ from what reaches your wallet.", to: "/farms", action: "Explore farms" },
  { title: "NFT projects", input: "NFT units → project reward sharing", text: "Some registered pools belong to NFT projects such as DEGEN. Explore them on Farms and use their linked dashboard for NFT balances, minting and reward actions.", to: "/farms", action: "Discover NFT projects" },
];
export function HowItWorksPage() {
  return <main className="app-page overview-page">
    <section className="page-intro"><span className="page-kicker">How it works</span><h1>Your route through OINK.</h1><p>Understand the choices, follow your positions and know what happens when you exit.</p></section>
    <section className="professional-grid three-columns">{paths.map((path, index) => <article className="professional-card" key={path.title}><span className="card-index">0{index + 1}</span><h2>{path.title}</h2><strong>{path.input}</strong><p>{path.text}</p><Link to={path.to}>{path.action} →</Link></article>)}</section>
    <section className="professional-card overview-section"><h2>A miner’s timeline</h2><ol className="overview-steps"><li><h3>Create</h3><p>Choose your duration and amount. Confirm the transaction in your wallet.</p></li><li><h3>Track</h3><p>Follow your balance and maturity. A mandatory service period may prevent an early withdrawal.</p></li><li><h3>Mature</h3><p>Check the grace window. Withdraw under the current terms or roll over into an available duration.</p></li><li><h3>Exit or renew</h3><p>Early or late withdrawal may incur a penalty. Rollover keeps tokens locked and starts a new term; check its current bonus and duration.</p></li></ol><Link to="/portfolio">View your portfolio →</Link></section>
    <section className="professional-grid two-columns overview-section"><article className="professional-card"><h2>Where governance fits</h2><p>Governance can change supported settings and reward allocations. A proposal passing is different from its changes being executed on-chain. The site reads the pool registry to discover additions; unfamiliar contracts can still require an integration.</p><Link to="/governance">Explore governance →</Link></article><article className="professional-card"><h2>Understand the numbers</h2><dl className="overview-glossary"><dt>Gross value</dt><dd>A position’s accounting value before exit costs.</dd><dt>Pending rewards</dt><dd>Rewards recorded for a position, before any payout split or fees.</dd><dt>APR</dt><dd>An annualized estimate using current inputs, not a promised return.</dd><dt>Allocation</dt><dd>A pool’s share of protocol rewards, not your wallet’s earnings.</dd></dl><Link to="/protocol?section=faq">Read more in Docs →</Link></article></section>
    <ResourceFooter />
  </main>;
}
