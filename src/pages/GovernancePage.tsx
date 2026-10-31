import { GovernanceInformation, useGovernanceMetrics } from "../components/GovernanceInformation";
import { NftAllocationControls } from "../components/NftAllocationControls";
import { RewardMaintenanceControls } from "../components/RewardMaintenanceControls";
import { AdvancedGovernanceControls } from "../components/AdvancedGovernanceControls";
import { readGovernanceSummary, peekGovernanceSummary } from "../lib/governanceSummary";
import { hasGovernanceCoverage, type GovernanceReadScope } from "../lib/governanceSections";
import { peekGovernanceSnapshot } from "../lib/governance";
import { sharedDisplayReads } from "../lib/sharedReadCache";
import { ParticipationActions } from "../components/ParticipationActions";
import { OrdinaryProposalControls } from "../components/OrdinaryProposalControls";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePageLoadStatus } from "../components/PageLoadBoundary";
import { ScrollRegion } from "../components/ScrollRegion";
import { useWallet } from "../components/WalletProvider";
import { OFFICIAL_SOURCES, TIME_MINER_CONTRACTS, explorerUrl } from "../config/contracts";
import { GOVERNANCE_COVERAGE, coverageLabel } from "../config/governanceCoverage";
import { isZeroAddress, loadGovernanceSnapshot, type GovernanceSnapshot } from "../lib/governance";
import { shortAddress } from "../lib/chain";
import "./governance-layout.css";
import { snapshotIsStale } from "../lib/governanceReadSafety";
import { InfoTooltip } from "../components/InfoTooltip";



const governanceSections = [
  ["ordinary", "Ordinary proposals"],
  ["miner-voting", "Miner voting"],
  ["senate", "Treasury & Senate"],
  ["upgrades", "Protocol upgrades"],
  ["nft-allocation", "NFT allocation"],
  ["coverage", "Coverage checklist"],
] as const;

const proposalChannels = [
  "Pool allocation",
  "Voting cost", "Enforcement delay", "Rollover bonus", "Harvest call fee",
  "Reward-event threshold", "New pool", "Vault setting",
  "Governor tax", "Governor transfer or burn", "Reward boost",
];


const formatDate = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const compactToken = (value: string) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(number);
};



function AddressLink({ value }: { value: string }) {
  return <a className="mono-link" href={explorerUrl(value)} target="_blank" rel="noreferrer">{shortAddress(value)}</a>;
}

export function GovernancePage() {
  const wallet = useWallet();
  const location = useLocation();
  const activeSection = governanceSections.some(([id]) => id === location.hash.slice(1)) ? location.hash.slice(1) : "ordinary";
  const [selectedFamily, setSelectedFamily] = useState("Pool allocation");
  const {data: metrics, error: metricsError} = useGovernanceMetrics();
  const scope: GovernanceReadScope = activeSection === "ordinary" ? `ordinary:${selectedFamily}` : activeSection === "senate" ? "treasury" : activeSection === "upgrades" ? "upgrades" : activeSection === "miner-voting" ? "miner-voting" : "base";
  const [loaded, setLoaded] = useState<{scope: GovernanceReadScope; account: string | null; value: GovernanceSnapshot} | null>(null);
  const snapshot = loaded?.scope === scope && loaded.account === wallet.account ? loaded.value : peekGovernanceSnapshot(wallet.account, scope) ?? peekGovernanceSnapshot(wallet.account, "base") ?? (loaded?.account === wallet.account ? loaded.value : null);
  const ordinaryReady = !!snapshot?.coverage.ordinary.includes(selectedFamily);
  const treasuryReady = !!snapshot?.coverage.treasury;
  const upgradesReady = !!snapshot?.coverage.upgrades;
  const upgradeSnapshot = upgradesReady ? snapshot : null;
  const [summary,setSummary] = useState(peekGovernanceSummary);
  const [summaryError,setSummaryError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [progress, setProgress] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const [treasuryPage, setTreasuryPage] = useState(0);
  const [recordFilter, setRecordFilter] = useState("open");
  const historyRows = (snapshot?.history ?? []).filter((row) => row.family === selectedFamily && (recordFilter === "all" || row.valid));
  const treasuryRows = (snapshot?.treasury ?? []).filter((row) => recordFilter === "all" || row.valid);
  const historyIndex = Math.min(historyPage, Math.max(0, Math.ceil(historyRows.length / 20) - 1));
  const treasuryIndex = Math.min(treasuryPage, Math.max(0, Math.ceil(treasuryRows.length / 20) - 1));
  const useSummary = summary && (!snapshot || summary.timestamp >= snapshot.blockTimestamp);
  const summarySettings = useSummary ? summary : snapshot?.settings ?? summary;
  const summaryTimestamp = useSummary ? summary!.timestamp : snapshot?.blockTimestamp ?? summary?.timestamp;
  const summaryStale = summaryTimestamp !== undefined && snapshotIsStale(summaryTimestamp, now);
  const summaryPlaceholder = summaryError ? "Unavailable" : "Loading…";
  const snapshotReady = snapshot !== null;
  const refreshInFlight = useRef(false);
  const lastReadFinished = useRef(0);
  const checkForUpdates = useCallback(() => {
    if (document.visibilityState !== "visible" || refreshInFlight.current || Date.now() - lastReadFinished.current < 60_000) return;
    setRefreshKey(key => key + 1);
  }, []);
  const refreshSnapshot = useCallback(() => { sharedDisplayReads.clear("369:governance"); setRefreshKey((key) => key + 1); }, []);

  usePageLoadStatus("governance", snapshotReady, snapshotReady ? null : error, refreshSnapshot);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let refreshTimer: number | undefined;
    let readTimer: number | undefined;
    refreshInFlight.current = true;
    setRefreshing(true);
    setError(null);
    setProgress(scope === "base" ? "Reading governance settings" : scope.startsWith("ordinary:") ? `Reading ${selectedFamily.toLowerCase()} proposals` : scope === "upgrades" ? "Reading Governor proposals" : "Reading treasury requests and voting power");
    // Base settings and balances publish independently of the selected registry.
    void loadGovernanceSnapshot(() => {}, controller.signal, wallet.account, "base").then(base => {
      if (!active) return;
      setLoaded(current => current?.scope === scope && current.account === wallet.account && hasGovernanceCoverage(current.value.coverage, scope)
        ? current : {scope, account: wallet.account, value: peekGovernanceSnapshot(wallet.account, scope) ?? base});
      setNow(Date.now());
    }).catch(() => { /* The selected read reports the same base failure below. */ });
    setSummaryError(false);
    void readGovernanceSummary(controller.signal).then(value => { if (active) setSummary(value); }).catch(() => { if (active) setSummaryError(true); });
    const timeout = new Promise<never>((_, reject) => {
      readTimer = window.setTimeout(() => {
        reject(new Error("Governance data is taking too long to load. Please retry."));
        controller.abort();
      }, 120_000);
    });
    Promise.race([
      loadGovernanceSnapshot((message) => { if (active) setProgress(message); }, controller.signal, wallet.account, scope),
      timeout,
    ])
      .then((next) => {
        if (!active) return;
        setLoaded({scope, account: wallet.account, value: next});
        setError(null);
        setNow(Date.now());
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Unknown read error");
      })
      .finally(() => {
        window.clearTimeout(readTimer);
        if (!active) return;
        refreshInFlight.current = false;
        lastReadFinished.current = Date.now();
        setRefreshing(false);
        refreshTimer = window.setTimeout(checkForUpdates, 60_000);
      });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(readTimer);
      window.clearTimeout(refreshTimer);
    };
  }, [refreshKey, checkForUpdates, wallet.account, wallet.revision, scope]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 15_000);
    const visible = checkForUpdates;
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [checkForUpdates]);

  useEffect(() => {
    if (!location.hash || !snapshotReady) return;
    const timer = window.setTimeout(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash, snapshotReady]);

  const mappedPositions = useMemo(() => {
    const positions = new Map<string, string>([["0", "Neutral — no proposal selected"]]);
    if (!snapshot) return positions;
    snapshot.upgrades.forEach((proposal) => {
      positions.set(String(proposal.supportPosition), `Support Governor proposal ${proposal.supportPosition} for ${shortAddress(proposal.proposedGovernor)}`);
      positions.set(String(proposal.oppositionPosition), `Oppose Governor proposal ${proposal.supportPosition} for ${shortAddress(proposal.proposedGovernor)}`);
    });
    snapshot.treasury.forEach((request) => {
      positions.set(String(request.supportPosition), `Support treasury withdrawal ${request.id}`);
      positions.set(String(request.oppositionPosition), `Block treasury withdrawal ${request.id}`);
    });
    return positions;
  }, [snapshot]);

  return (
    <main className="app-page governance-page degen-layout">
            <div className="settings-grid">
              <article><span>Voting cost</span><strong>{summarySettings ? `${compactToken(summarySettings.votingCost)} OINK` : summaryPlaceholder}</strong><small>Base voting-credit cost; requirements vary by action</small></article>
              <article><span>Global delay <InfoTooltip label="About the governance global delay">For ordinary proposals, this is added to the proposal's initial voting window before execution becomes eligible. Passing a deadline does not apply a change automatically; someone must submit the eligible action.</InfoTooltip></span><strong>{summarySettings ? `${summarySettings.delaySeconds / 3600} hours` : summaryPlaceholder}</strong><small>Added after requested delay</small></article>
              <article><span>Reward threshold</span><strong>{summarySettings ? `${compactToken(summarySettings.rewardThreshold)} OINK` : summaryPlaceholder}</strong><small>Required before reward event</small></article>
              <article><span>Pulse allocation</span><strong>{summarySettings ? `${summarySettings.pulseAllocation}%` : summaryPlaceholder}</strong><small>Live Farms setting</small></article>
            </div>
            <p className="governance-summary-status" role="status">{summaryStale ? "Showing last loaded settings while current values update." : ""}</p>

      <nav className="governance-subnav" aria-label="Governance sections">
        {governanceSections.map(([id, label]) => <a href={`#/governance#${id}`} aria-current={activeSection === id ? "page" : undefined} key={id}>{label}</a>)}
      </nav>

      <div className="governance-read-status" aria-live="polite">{snapshot && error ? <p role="alert">{error} <button className="secondary-action" type="button" onClick={refreshSnapshot}>Retry</button></p> : <p>{refreshing ? <>{progress}. {scope === "treasury" || scope === "miner-voting" ? "Settings and balances are shown while this registry loads." : ""}</> : ""}</p>}</div>
      <details className="governance-utility-disclosure" open>
        <summary>Governance utility</summary>
      <section className="governance-action-center" aria-label="Governance action center">
        <div>
          <h2>Turn community plans into on-chain actions.</h2>
          <p>Use voting credit for ordinary changes, locked miners for treasury and Governor positions, and the treasury registry to review funding requests before they move.</p>
        </div>
        <div className="governance-action-links">
          <a href="#/governance#ordinary">Create or vote on a proposal</a>
          <a href="#/governance#miner-voting">Use miner voting power</a>
          <a href="#/governance#senate">Review treasury requests</a>
          <a href="#/protocol?section=treasury">See treasury balances</a>
        </div>
      </section>
      </details>
      {(activeSection === "ordinary" || activeSection === "senate") && <div className="record-filter" aria-label="Proposal records"><span>Proposal records</span>{[["open", "Open"], ["all", "All history"]].map(([value, label]) => <button type="button" key={value} aria-pressed={recordFilter === value} onClick={() => { setRecordFilter(value); setHistoryPage(0); setTreasuryPage(0); }}>{label}</button>)}</div>}
      <div className="governance-layout">
        <div className="governance-main">
          <section className="governance-section" hidden={activeSection !== "ordinary"} id="ordinary">
            <div className="governance-section-heading"><div><span className="section-kicker">System 01</span><h2>Ordinary proposals <InfoTooltip label="About ordinary governance proposals">Creating, supporting or opposing an ordinary proposal spends voting credit. A successful vote still needs a separate eligible execution transaction. Opposing a proposal records credit against it; a veto is a separate action with its own conditions.</InfoTooltip></h2><p>Voting-credit decisions for settings, allocations, vault parameters, transfers, burns, and reward events.</p></div></div>

            <p>Governor vault funding setting: {summarySettings ? `${summarySettings.fundingRate}% per hour` : summaryPlaceholder}. Individual vaults may need to synchronize their fees.</p>

            <nav className="proposal-family-tabs" aria-label="Proposal categories">{proposalChannels.map((family) => <button type="button" key={family} aria-pressed={selectedFamily === family} onClick={() => { setSelectedFamily(family); setHistoryPage(0); }}>{family}</button>)}</nav>
          <GovernanceInformation family={selectedFamily} snapshot={snapshot} metrics={metrics} error={metricsError} />
          <ParticipationActions mode="credit" snapshot={snapshot} onConfirmed={refreshSnapshot} />
          <fieldset className="governance-load-fieldset" disabled={!ordinaryReady} aria-busy={!ordinaryReady}><OrdinaryProposalControls key={selectedFamily} family={selectedFamily} metrics={metrics} snapshot={ordinaryReady ? snapshot : null} onConfirmed={refreshSnapshot} /></fieldset>
          {selectedFamily === "Reward boost" && <RewardMaintenanceControls metrics={metrics} snapshot={ordinaryReady ? snapshot : null} onConfirmed={refreshSnapshot} />}


            <div className="professional-card governance-panel">
              <div className="card-heading-row"><div><span className="section-kicker proposal-history-label">Proposal history</span><h3>{selectedFamily} proposals</h3></div><span className="status-pill status-safe">Exact changes</span></div>
              <p>Deadlines combine each proposal’s requested delay with the live global enforcement delay. Values come from public proposal-array getters.</p>
              <p>{ordinaryReady ? `${snapshot!.history.length} ${selectedFamily.toLowerCase()} proposals scanned; ${historyRows.length} match the filter.` : "Loading this proposal category…"}</p>
              <div className="action-pair"><button className="secondary-action" disabled={historyIndex === 0} onClick={() => setHistoryPage(historyIndex - 1)}>Previous proposals</button><span>Page {historyIndex + 1} of {Math.max(1, Math.ceil(historyRows.length / 20))}</span><button className="secondary-action" disabled={(historyIndex + 1) * 20 >= historyRows.length} onClick={() => setHistoryPage(historyIndex + 1)}>Next proposals</button></div>
              <ScrollRegion label="Ordinary proposal history" className="governance-record-viewport">
                <div className="governance-history">
                  {ordinaryReady && historyRows.length === 0 && <p className="empty-state">No {recordFilter === "open" ? "open" : ""} {selectedFamily.toLowerCase()} proposals at this snapshot.</p>}
                  {historyRows.slice(historyIndex * 20, historyIndex * 20 + 20).map((proposal) => (
                    <article className="history-row" key={proposal.key}>
                      <div className="history-title"><span>{proposal.reference}</span><strong>{proposal.change}</strong></div>
                      <dl>
                        <div><dt>Status</dt><dd>{proposal.status}</dd></div>
                        <div><dt>Support credit</dt><dd>{compactToken(proposal.support)} OINK</dd></div>
                        <div><dt>Opposition credit</dt><dd>{compactToken(proposal.opposition)} OINK</dd></div>
                        <div><dt>Voting deadline</dt><dd>{formatDate(proposal.votingDeadline)}</dd></div>
                      </dl>
                      <p>Select this proposal in the action panel above to vote or finalize it in your wallet.</p>
                    </article>
                  ))}
                  {!ordinaryReady && <div className="empty-state">{error ? "Proposal history could not be loaded." : "Loading this proposal category…"}</div>}
                </div>
              </ScrollRegion>
            </div>
            <details className="governance-reference"><summary>Protocol settings and limits</summary>            <div className="professional-card current-configuration">
              <div className="card-heading-row"><div><span className="section-kicker">Current configuration</span><h3>Fees, bonuses, limits, and record counts</h3></div><span className="status-pill status-safe">Deployed values</span></div>
              <div className="configuration-grid"><div><span>Governor inflation share</span><strong>{snapshot ? `${snapshot.settings.governorShare}%` : "—"}</strong></div><div><span>Referral bonus</span><strong>{snapshot ? `${snapshot.settings.referralBonus}%` : "—"}</strong></div>
                <div><span>Vault deposit fee</span><strong>{snapshot ? `${snapshot.settings.depositFee}%` : "—"}</strong></div>
                <div><span>Reward boost</span><strong>{snapshot ? (snapshot.settings.rewardEventActive ? "Active" : "Not active") : "—"}</strong></div>
                <div><span>Maximum NFT allocation</span><strong>{snapshot ? `${snapshot.settings.maxNftAllocation}%` : "—"}</strong></div>
                <div><span>Maximum Pulse pool</span><strong>{snapshot ? `${snapshot.settings.maxPulseAllocation}%` : "—"}</strong></div>
                <div><span>Maximum Pulse total</span><strong>{snapshot ? `${snapshot.settings.maxPulseTotalAllocation}%` : "—"}</strong></div>
              </div>
              <div className="configuration-table-wrap"><table className="governance-table configuration-table"><thead><tr><th>Time miner</th><th>Rollover bonus</th><th>Harvest call fee</th></tr></thead><tbody>{TIME_MINER_CONTRACTS.map((record, index) => {
                const miner = snapshot?.miners.find(row => row.address.toLowerCase() === record.address.toLowerCase());
                return <tr key={`configuration-${record.address}`}><td>{record.label}</td><td>{snapshot ? snapshot.settings.rollBonuses[index]+"%" : "—"}</td><td>{miner ? miner.callFee+"%" : "—"}</td></tr>;
              })}</tbody></table></div>
              <div className="proposal-counts">{proposalChannels.map(family => <span key={family}><strong>{snapshot?.counts[family] ?? "—"}</strong> {family}</span>)}</div>
            </div>

</details>
          </section>

          <section className="governance-section" hidden={activeSection !== "miner-voting"} id="miner-voting">
            <div className="governance-section-heading"><div><span className="section-kicker">System 02</span><h2>Miner voting <InfoTooltip label="About miner voting power">Locked miner shares provide reusable voting power, weighted by the miner's duration. Each miner's whole share balance follows one selected position. Changing that selection does not spend voting credit or withdraw the locked OINK.</InfoTooltip></h2><p>Reusable weighted voting power from locked positions. It is not voting credit and is not consumed when a selection changes.</p></div><span className="status-pill status-safe">Six miners verified</span></div>

            <div className="distinction-grid">
              <article className="professional-card"><span className="card-label">Voting power</span><h3>{snapshot ? `${compactToken(snapshot.totalLocked)} OINK locked` : "Loading total"}</h3><p>Each miner allocates all recorded shares to one semantic consensus position. Time-miner weighting ranges from 20% to 150%.</p></article>
              <article className="professional-card"><span className="card-label">Voting credit</span><h3>{snapshot?.walletCredit ? `${compactToken(snapshot.walletCredit)} OINK` : "Wallet not connected"}</h3><p>Ordinary proposals deduct voting credit. Casting a miner position does not spend this balance.</p></article>
            </div>

            <div className="professional-card governance-panel">
              <div className="card-heading-row"><div><span className="section-kicker">Connected-wallet view</span><h3>Eligible locked-position power</h3></div><span className="status-pill status-locked">No connection request</span></div>
              <p>{snapshot?.walletAddress ? `Showing public records for ${snapshot.walletAddress}.` : "No already-connected wallet was detected. Public miner totals remain visible; personal shares, delegation, and selections are unavailable."}</p>
              <div className="miner-table-wrap"><table className="governance-table"><thead><tr><th>Miner</th><th>Weight</th><th>Share price</th><th>Your shares</th><th>Weighted power</th><th>Selection</th><th>Delegate</th></tr></thead><tbody>{snapshot?.miners.map((miner) => <tr key={miner.address}><td><AddressLink value={miner.address} /><small>{miner.label}</small></td><td>{miner.weight}%</td><td>{Number(miner.pricePerShare).toFixed(4)} OINK</td><td>{miner.walletShares ? compactToken(miner.walletShares) : "Unavailable"}</td><td>{miner.walletWeightedPower ? `${compactToken(miner.walletWeightedPower)} OINK` : "Unavailable"}</td><td>{miner.selectedPosition === undefined ? "Unavailable" : (mappedPositions.get(String(miner.selectedPosition)) || "Unmapped position — action unavailable")}</td><td>{miner.delegate && !isZeroAddress(miner.delegate) ? <AddressLink value={miner.delegate} /> : (miner.delegate ? "None" : "Unavailable")}</td></tr>) ?? TIME_MINER_CONTRACTS.map(miner => <tr key={miner.address} aria-busy="true"><td><AddressLink value={miner.address} /><small>{miner.label}</small></td>{Array.from({length:6},(_,index)=><td key={index}>—</td>)}</tr>)}</tbody></table></div>
              <fieldset className="governance-load-fieldset" disabled={!treasuryReady || !upgradesReady} aria-busy={!treasuryReady || !upgradesReady}><ParticipationActions mode="miner" snapshot={treasuryReady && upgradesReady ? snapshot : null} onConfirmed={refreshSnapshot} /></fieldset>
            </div>
          </section>

          <section className="governance-section" hidden={activeSection !== "senate"} id="senate">
            <div className="governance-section-heading"><div><span className="section-kicker">System 03</span><h2>Treasury &amp; Senate <InfoTooltip label="About treasury requests and Senate vetoes"><p>A treasury request names an asset, amount and recipient. Approval and finalization must satisfy the deployed voting rules; an open request alone does not mean funds will move.</p><p>Senate ballots use one registered member, one vote. A veto needs an absolute majority of the registered membership, not just a majority of ballots cast, plus a separate finalization action.</p></InfoTooltip></h2><p>Treasury requests are community funding actions. The Senate is the one-address-one-vote guardrail that can veto treasury withdrawals and Governor replacement.</p></div><span className="status-pill status-warning">Absolute majority</span></div>

            <div className="senate-metrics">
              <article><span>Registered members</span><strong>{snapshot ? snapshot.senate.count : "—"}</strong></article>
              <article><span>Minimum</span><strong>{snapshot ? snapshot.senate.minimum : "—"}</strong></article>
              <article><span>Maximum</span><strong>{snapshot ? snapshot.senate.maximum : "—"}</strong></article>
              <article><span>Votes required now</span><strong>{snapshot ? (snapshot.senate.count ? snapshot.senate.majority : "Unavailable") : "—"}</strong></article>
              <article><span>Connected wallet</span><strong>{snapshot?.senate.walletIsMember === true ? "Registered" : snapshot?.senate.walletIsMember === false ? "Not registered" : "Not connected"}</strong></article>
            </div>

            <div className="professional-card governance-panel">
              <div className="card-heading-row"><div><span className="section-kicker">On-chain registry</span><h3>Public member list and recorded votes</h3></div><span className="status-pill status-safe">No wallet required</span></div>
              <div className="senate-member-registry" role="region" aria-label="Senate member registry" tabIndex={0}>
              {!snapshot && <p className="empty-state" role="status">Reading Senate membership…</p>}
              {snapshot && snapshot.senate.members.length === 0 && <div className="empty-state prominent-empty"><strong>No registered Senate members</strong><span>The deployed contract reports an empty list. Off-chain nomination lists do not change this status.</span></div>}
              {snapshot?.senate.members.map((member, index) => <article className="member-row" key={member}><AddressLink value={member} /><span>{snapshot.senate.memberVotes === null ? "Ballots unavailable — membership actions cannot be verified" : snapshot.senate.memberVotes[index]?.length ? snapshot.senate.memberVotes[index].map((vote) => mappedPositions.get(vote) || `Unmapped recorded ballot ${vote}`).join("; ") : "No recorded ballots"}</span></article>)}
              </div>
              <AdvancedGovernanceControls active={activeSection === "senate"} section="senate" snapshot={snapshot} onConfirmed={refreshSnapshot} />
              <p className="safety-note">Direct Senate veto wiring is verified only for Governor replacement and treasury withdrawals. Ordinary voting-credit proposals are not presented as direct Senate veto targets.</p>
            </div>

            <AdvancedGovernanceControls section="treasury" snapshot={snapshot} onConfirmed={refreshSnapshot} />
            <div className="professional-card governance-panel">
              <div className="card-heading-row"><div><span className="section-kicker">Treasury veto targets</span><h3>Complete treasury request registry</h3></div><span className="status-pill status-safe">Wallet confirmation</span></div>
              <p>{treasuryReady ? `${snapshot!.treasury.length} requests scanned; ${treasuryRows.length} match the filter.` : error ? "Treasury registry could not be loaded." : "Loading the treasury registry…"}</p>
              <div className="action-pair"><button className="secondary-action" disabled={treasuryIndex === 0} onClick={() => setTreasuryPage(treasuryIndex - 1)}>Previous requests</button><span>Page {treasuryIndex + 1} of {Math.max(1, Math.ceil(treasuryRows.length / 20))}</span><button className="secondary-action" disabled={(treasuryIndex + 1) * 20 >= treasuryRows.length} onClick={() => setTreasuryPage(treasuryIndex + 1)}>Next requests</button></div>
              <p>These are current miner votes. Treasury finalization also uses recorded high-water votes and may close a request without transferring funds. Live checks verify the expected outcome before opening your wallet.</p>
              <div className="treasury-list governance-record-viewport" role="region" aria-label="Treasury request registry" tabIndex={0}>{!treasuryRows.length && <p className="empty-state">{treasuryReady ? "No requests match this filter." : "Reading treasury requests…"}</p>}{treasuryRows.slice(treasuryIndex * 20, treasuryIndex * 20 + 20).map((request) => <article key={request.id}><div><span className="status-pill status-locked">Withdrawal {request.id}</span><strong>{request.valid ? "Open on-chain" : "Closed on-chain"}</strong></div><p>Send {request.amount && request.assetSymbol ? `${compactToken(request.amount)} ${request.assetSymbol}` : `raw amount ${request.amountRaw}`} from token <AddressLink value={request.token} /> to <AddressLink value={request.beneficiary} />.</p><dl><div><dt>Credit support / opposition</dt><dd>{compactToken(request.creditSupport)} / {compactToken(request.creditOpposition)} OINK</dd></div><div><dt>Current miner support / opposition</dt><dd>{compactToken(request.minerSupport)} / {compactToken(request.minerOpposition)} OINK</dd></div><div><dt>Voting deadline</dt><dd>{formatDate(request.votingDeadline)}</dd></div><div><dt>Finalization after</dt><dd>{formatDate(request.finalizationAfter)}</dd></div></dl></article>)}</div>
            </div>
          </section>

          <section className="governance-section" hidden={activeSection !== "upgrades"} id="upgrades">
            <div className="governance-section-heading"><div><span className="section-kicker">System 04</span><h2>Protocol upgrades <InfoTooltip label="About replacing the Governor">Governor replacement changes the contract controlling protocol permissions. First-stage approval, opposition checks and the block-based delay are separate from final enforcement. Check the candidate address and authority transfers before confirming in your wallet.</InfoTooltip></h2><p>Governor replacement has paired miner positions, a first-stage threshold, veto paths, and a later block-based enforcement delay.</p></div><span className="status-pill status-warning">High impact</span></div>

            <div className="professional-card upgrade-card" aria-busy={!upgradesReady}>
              <div className="upgrade-addresses"><div><span>Current Governor</span>{upgradeSnapshot ? <AddressLink value={upgradeSnapshot.settings.currentGovernor} /> : <strong>Loading</strong>}</div><div><span>Proposed Governor</span>{upgradeSnapshot?.upgrades.length ? <AddressLink value={upgradeSnapshot.upgrade.proposedGovernor} /> : <strong>{upgradeSnapshot ? "No proposals" : "Unavailable"}</strong>}</div></div>
              <div className="upgrade-verdict-slot">{upgradeSnapshot && <div className={`upgrade-verdict ${upgradeSnapshot.upgrade.activationPending ? "pending" : "closed"}`}><strong>{upgradeSnapshot.upgrade.activationPending ? "Replacement pending" : upgradeSnapshot.upgrades.some((row) => !row.invalidated) ? "Governor proposals require review" : "No non-invalidated Governor proposals found"}</strong><span>{upgradeSnapshot.upgrade.invalidated ? "The displayed candidate is invalidated on-chain." : "Candidate invalidation is tracked by address, not independently per proposal."} The original interface label is not used as proof of live status.</span></div>}</div>
              <div className="upgrade-grid">
                <article><span>Current power on support</span><strong>{upgradeSnapshot ? `${compactToken(upgradeSnapshot.upgrade.currentSupport)} OINK` : "—"}</strong><small>Reusable miner power can move</small></article>
                <article><span>Current power on opposition</span><strong>{upgradeSnapshot ? `${compactToken(upgradeSnapshot.upgrade.currentOpposition)} OINK` : "—"}</strong><small>Reusable miner power can move</small></article>
                <article><span>Highest support recorded</span><strong>{upgradeSnapshot ? `${compactToken(upgradeSnapshot.upgrade.highestSupport)} OINK` : "—"}</strong><small>Consensus high-water mark</small></article>
                <article><span>Proposed at</span><strong>{upgradeSnapshot?.upgrades.length ? formatDate(upgradeSnapshot.upgrade.proposedAt) : "—"}</strong><small>Selected proposal timestamp</small></article>
                <article><span>First stage</span><strong>{!upgradeSnapshot?.upgrades.length ? "Unavailable" : upgradeSnapshot.upgrade.passedFirstStage ? "Recorded as passed" : "Not passed"}</strong><small>15% locked-power floor; opposition below one third of support</small></article>
                <article><span>Senate veto</span><strong>{upgradeSnapshot ? (upgradeSnapshot.senate.count ? `${upgradeSnapshot.senate.majority} member votes needed` : "Unavailable with zero members") : "Unavailable"}</strong><small>More than half of registered membership</small></article>
                <article><span>Eligible Governor</span><strong>{upgradeSnapshot ? (!isZeroAddress(upgradeSnapshot.upgrade.eligibleGovernor) ? shortAddress(upgradeSnapshot.upgrade.eligibleGovernor) : "None") : "Unavailable"}</strong><small>Governor contract activation state</small></article>
                <article><span>Final delay</span><strong>{upgradeSnapshot ? `${upgradeSnapshot.upgrade.blockDelay.toLocaleString()} blocks` : "—"}</strong><small>Applies after the first stage requests the change</small></article>
                <article><span>Request block</span><strong>{upgradeSnapshot ? upgradeSnapshot.upgrade.requestBlock ? upgradeSnapshot.upgrade.requestBlock.toLocaleString() : "None" : "—"}</strong><small>Active request, when recorded</small></article>
              </div>
              <h3>All discovered Governor proposals ({upgradesReady ? upgradeSnapshot?.upgrades.length : "—"})</h3>
              <ScrollRegion label="Governor proposal registry" className="governance-record-viewport">{upgradeSnapshot?.upgrades.map((proposal) => <article key={proposal.supportPosition}><strong>Proposal {proposal.supportPosition} / opposition {proposal.oppositionPosition}</strong><p><AddressLink value={proposal.proposedGovernor} /> · {formatDate(proposal.proposedAt)} · {proposal.invalidated ? "Candidate invalidated" : proposal.passedFirstStage ? "First stage recorded as passed" : "Candidate not invalidated; execution unverified"}</p><p>Current support {compactToken(proposal.currentSupport)} OINK · opposition {compactToken(proposal.currentOpposition)} OINK</p></article>)}</ScrollRegion>
              <fieldset className="governance-load-fieldset" disabled={!upgradesReady}><AdvancedGovernanceControls section="governor" snapshot={upgradeSnapshot} onConfirmed={refreshSnapshot} /></fieldset><div className="permission-transfer"><strong>If finalized, published source transfers:</strong><span>MasterChef ownership, fee-address authority, developer-address authority, and the old Governor’s OINK balance to the replacement Governor.</span></div>
              <div className="action-pair"><a className="secondary-action" href="#/governance#miner-voting">Vote with your miners</a></div>
              <p className="safety-note">The original page’s 33% / 80% wording does not match the currently verified deployed source. This view uses the deployed 15% first-stage threshold and opposition tests. Proposal, approval, veto and finalization controls are available here with fresh live checks before each wallet confirmation.</p>
            </div>
          </section>

          <section className="governance-section" hidden={activeSection !== "nft-allocation"} id="nft-allocation"><NftAllocationControls active={activeSection === "nft-allocation"} onConfirmed={refreshSnapshot} /></section>
          <section className="governance-section" hidden={activeSection !== "coverage"} id="coverage">
          <section className="professional-card evidence-key">
            <span className="section-kicker">Evidence key</span>
            <dl>
              <div><dt>Live</dt><dd>Read from deployed PulseChain contracts at the displayed block.</dd></div>
              <div><dt>Live checks and wallet confirmation</dt><dd>Available here after checking current terms, simulating the action and receiving your wallet confirmation.</dd></div>
              <div><dt>Published source</dt><dd>Behavior found in verified source; it does not prove an outcome is beneficial.</dd></div>
              <div><dt>Unresolved</dt><dd>Transaction preparation remains disabled until preconditions and effects are tested.</dd></div>
            </dl>
          </section>

          <section className="professional-card preparation-stage">
            <span className="section-kicker">Verified participation</span>
            <h3>Transaction support</h3>
            <p>Ordinary proposals, voting credit, miner participation, Senate actions, treasury requests and Governor replacement have live checks, wallet confirmation and receipt checks.</p>
          </section>

            <div className="governance-section-heading"><div><span className="section-kicker">Implementation audit</span><h2>Coverage checklist</h2><p>Each control is mapped to its contract call, caller authority, governing rule, and current implementation state.</p></div><a className="secondary-action" href={OFFICIAL_SOURCES.contractSource} target="_blank" rel="noreferrer">Published contracts</a></div>
            <div className="coverage-table-wrap"><table className="governance-table coverage-table"><thead><tr><th>Section</th><th>Control</th><th>Contract call</th><th>Permission</th><th>Voting rule or effect</th><th>Status</th></tr></thead><tbody>{GOVERNANCE_COVERAGE.map((item) => <tr key={`${item.section}-${item.control}`}><td>{item.section}</td><td>{item.control}</td><td><code>{item.contractCall}</code></td><td>{item.permission}</td><td>{item.rule}</td><td><span className={`status-pill ${item.status === "live" || item.status === "write" ? "status-safe" : item.status === "source" ? "status-local" : "status-locked"}`}>{coverageLabel[item.status]}</span></td></tr>)}</tbody></table></div>
            <div className="source-links"><a href={OFFICIAL_SOURCES.website} target="_blank" rel="noreferrer">Official information</a><a href={OFFICIAL_SOURCES.contractsPage} target="_blank" rel="noreferrer">Official contract directory</a><a href={`${OFFICIAL_SOURCES.application}senate.html`} target="_blank" rel="noreferrer">Original Senate page</a><a href={OFFICIAL_SOURCES.applicationSource} target="_blank" rel="noreferrer">Original interface source</a></div>
          </section>
        </div>
      </div>
    </main>
  );
}


