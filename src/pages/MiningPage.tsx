import { useSearchParams } from "react-router-dom";
import { DeployMiners } from "../components/DeployMiners";
import "./miners-layout.css";
import { ContractList } from "../components/ContractList";
import { ScrollRegion } from "../components/ScrollRegion";
import {
  ECOSYSTEM_MINER_CONTRACTS,
  TIME_MINER_CONTRACTS,
} from "../config/contracts";
import { TimeMinerCards } from "../components/TimeMinerCards";
import { MinerPortfolio } from "../components/MinerPortfolio";
import { OinkSale, OinkReferral } from "../components/MiningOffers";
import { MinerDonations } from "../components/MinerDonations";

const documentedActions = [
  ["Create", "Commit OINK into one of six time-duration miner contracts."],
  ["Manage", "View, recommit, transfer, hop to a longer duration, or roll over a miner."],
  ["Partition", "Withdraw, transfer or upgrade all or part of a miner, subject to its current contract settings."],
  ["Ecosystem", "Deposit supported PulseChain assets into separately deployed reward vaults."],
] as const;

export function MiningPage() {
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const tab = requestedTab === "deploy" ? "create" : requestedTab === "sale" || requestedTab === "referral" || requestedTab === "contracts" || requestedTab === "donations" ? requestedTab : "positions";
  const setTab = (value: string) => setParams(value === "positions" ? {} : { tab: value === "create" ? "deploy" : value });
  return (
    <main className="app-page oink-mining-page">
      <nav className="miners-tabs" aria-label="Miner sections">{([["positions", "My miners"], ["create", "Deploy miners"], ["sale", "OINK sale"], ["referral", "Referral"], ["donations", "Miner donations"], ["contracts", "Miner contracts"]] as const).map(([id, label]) => <button type="button" key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{label}</button>)}</nav>
      {tab === "positions" && <MinerPortfolio />}
      {tab === "positions" && <p className="miner-original-link">Open Actions on a miner to withdraw, transfer or upgrade the full miner or a portion of its shares.</p>}
      {tab === "create" && <DeployMiners />}
      {tab === "sale" && <OinkSale />}
      {tab === "referral" && <OinkReferral />}
      {tab === "donations" && <MinerDonations />}
      {tab === "contracts" && <div className={"workspace-grid mining-workspace miners-tab-" + tab}>
        <aside className="workspace-rail">
          <section className="professional-card action-card">
            <h2>OINK time miners</h2>
            <p>Use Deploy miners to create a position, or My miners to manage one.</p>
            <button type="button" onClick={() => setTab("create")}>Deploy miners</button>
          </section>

          <section className="professional-card compact-card">
            <span className="section-kicker">Documented surface</span>
            <h2>Mining feature map</h2>
            <div className="mini-feature-list">
              {documentedActions.map(([title, body]) => (
                <div key={title}>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <div className="workspace-main">

          <section className="professional-card contract-section">
            <div className="card-heading-row">
              <div>
                <span className="section-kicker">OINK commitments</span>
                <h2>Time-based miner contracts</h2>
              </div>
              <span className="status-pill status-safe">6 official listings</span>
            </div>
            <p className="section-copy">
              Each duration has its own contract. Check its current pool shares,
              share price and harvest fee below.
            </p>
            <TimeMinerCards />
          </section>

          <section className="professional-card contract-section">
            <div className="card-heading-row">
              <div>
                <span className="section-kicker">PulseChain assets</span>
                <h2>Ecosystem reward vaults</h2>
              </div>
              <span className="status-pill status-safe">{ECOSYSTEM_MINER_CONTRACTS.length} directory listings</span>
            </div>
            <p className="section-copy">
              The official contract directory lists these vaults. Farms also
              checks the current reward registry for new pools and shows which
              deposits, claims and withdrawals each reviewed integration supports.
            </p>
            <ScrollRegion label="Ecosystem miner contract list">
              <ContractList contracts={ECOSYSTEM_MINER_CONTRACTS} compact />
            </ScrollRegion>
          </section>

          <section className="inline-notice notice-wide">
            <strong>Wallet positions are in My miners.</strong> Miner positions
            are read at one block; gross values are not withdrawal quotes.
            Open Actions on a miner to review a transfer, upgrade or withdrawal. <a href="#/farms">Open ecosystem farms and their wallet positions.</a>
          </section>
        </div>
      </div>}
    </main>
  );
}
