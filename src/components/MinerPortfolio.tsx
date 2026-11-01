import { createViewSnapshotCache } from "../lib/viewSnapshotCache";
import { assetUrl } from "../lib/assets";
import { useEffect, useState } from "react";
import { useWallet } from "./WalletProvider";
import { readMinerPositions, peekMinerPositions, subscribeMinerPositions } from "../lib/miningAccounts";
import { sumFarmAmounts, displayFarmAmount } from "../lib/farmDisplay";
import { snapshotIsStale } from "../lib/governanceReadSafety";
import { MinerActions, type MinerActionPosition } from "./MinerActions";
import { MyMiners } from "./MyMiners";
import { formatEther,parseEther } from "ethers";
import { estimateMinerValue } from "../lib/minerLive";
import { MINER_FILTERS, MINER_SORTS, matchesMinerStatus, minerDeadline, minerPenaltyDisplay, minerProgress, selectMiners, type MinerFilterRow, type MinerStatusFilter, type MinerSort } from "../lib/minerFilters";
import { useSavedPreference } from "../lib/useSavedPreference";
import { TIME_MINER_CONTRACTS } from "../config/contracts";
import { usePageLoadStatus } from "./PageLoadBoundary";
import { InfoTooltip } from "./InfoTooltip";
import { freshFarmPrice, peekFarmPrices, readFarmPrices, type FarmPrices } from "../lib/farmPrices";
import { portfolioMarketValue } from "../lib/portfolioValuation";
import { displayRankValue } from "../lib/farmRankings";

function Progress({ label, start, end, time }: { label: string; start: number; end: number; time: number }) {
  const value = minerProgress(start, end, time);
  return <div className="miner-progress"><div><span>{label}</span><strong>{value.toFixed(1)}%</strong></div><progress aria-label={label} max={100} value={value} /><p>{Math.max(0, Math.floor((time - start) / 86400))} / {Math.max(0, (end - start) / 86400).toLocaleString()} days</p></div>;
}
function MinerDate({ timestamp }: { timestamp: number }) {
  const date = new Date(timestamp * 1000);
  return <time dateTime={date.toISOString()} aria-description={date.toLocaleString()}>{date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}<small>{date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</small></time>;
}
function MinerPenalty({ row, time }: { row: MinerActionPosition & { penalty: number | null }; time: number }) {
  const { account, revision, chainId } = useWallet();
  const display = minerPenaltyDisplay(row, time);
  if (display.rollover) return <MinerActions row={row} account={account} revision={revision} chainId={chainId} triggerKind="rollover" />;
  return <span aria-description="Withdrawal penalty at the latest snapshot. Rechecked before withdrawal; mandatory service may still block an exit.">{display.label}</span>;
}
function MinerStatus({ row, time }: { row: MinerFilterRow; time: number }) {
  if (time > row.graceEnd && time > row.mandatoryUntil) return <span className="miner-position-status" aria-hidden="true" />;
  return <span className="miner-position-status">
    {time <= row.graceEnd && <span className="miner-state-badge" data-status={time >= row.maturity ? "mature" : "active"}>{time >= row.maturity ? "Mature · in grace" : matchesMinerStatus(row, "soon", time) ? "Maturing in 7 days" : "Not yet mature"}</span>}
    {time <= row.mandatoryUntil && <span className="miner-state-badge" aria-description={"Mandatory service ends after " + new Date(row.mandatoryUntil * 1000).toLocaleString()}>Mandatory lock</span>}
  </span>;
}
const minerViewCache = createViewSnapshotCache<Awaited<ReturnType<typeof readMinerPositions>>>();
function MinerLoadingCards() {
  return <div className="my-miner-grid miner-loading-grid" aria-hidden="true">{Array.from({ length: 3 }, (_, index) => <article className="my-miner-card miner-loading-card" key={index}>
    <header><h2><span className="miner-loading-bar" /></h2><span className="miner-loading-bar miner-loading-short" /></header>
    <div className="miner-hero-value"><strong><span className="miner-loading-bar" /></strong><span className="miner-token-label">OINK</span></div>
    {["Lock progress", "Mandatory service"].map(label => <div className="miner-progress" key={label}><div><span>{label}</span><span className="miner-loading-bar miner-loading-short" /></div><div className="miner-loading-track" /><p><span className="miner-loading-bar" /></p></div>)}
    <span className="miner-position-status"><span className="miner-loading-bar" /></span>
    <p className="miner-countdown"><span className="miner-loading-bar" /></p>
    <dl className="miner-dates">{["Matures", "Grace ends", "Penalty"].map(label => <div key={label}><dt>{label}</dt><dd><span className="miner-loading-bar" /></dd></div>)}</dl>
    <div className="miner-loading-action"><span className="miner-loading-bar" /></div>
  </article>)}</div>;
}
export function MinerPortfolio() {
  const { account, revision, chainId, busy: walletBusy } = useWallet();
  const cacheKey = `${chainId}:${account?.toLowerCase()}:${revision}`;
  const [stored, setStored] = useState<Awaited<ReturnType<typeof readMinerPositions>> | null>(() => minerViewCache.get(cacheKey) ?? (account && chainId === 369n ? peekMinerPositions(account) : null));
  const snapshot = chainId === 369n && stored?.account.toLowerCase() === account?.toLowerCase() ? stored : null;
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useSavedPreference<"grid" | "list">("oink:miners:view", "grid", ["grid", "list"]);
  const [query, setQuery] = useSavedPreference<string>("oink:miners:search", "");
  const [status, setStatus] = useSavedPreference<MinerStatusFilter>("oink:miners:status", "all", MINER_FILTERS.map(filter => filter.value));
  const [duration, setDuration] = useSavedPreference<string>("oink:miners:duration", "all", ["all", ...TIME_MINER_CONTRACTS.map(miner => miner.id)]);
  const [sort, setSort] = useSavedPreference<MinerSort>("oink:miners:sort", "progress", MINER_SORTS.map(option => option.value));
  const clearFilters = () => { setQuery(""); setStatus("all"); setDuration("all"); setSort("progress"); };
  const [now, setNow] = useState(Date.now());
  const [prices, setPrices] = useState<FarmPrices>(peekFarmPrices);
  useEffect(() => {
    if (!account || chainId !== 369n) return;
    const controller = new AbortController();
    const update = () => {
      void readFarmPrices(controller.signal).then(value => {
        if (!controller.signal.aborted) { setPrices(value); setNow(Date.now()); }
      }).catch(() => { /* Existing quotes expire through freshFarmPrice. */ });
    };
    update();
    const timer = window.setInterval(update, 60000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [account, chainId]);
  useEffect(() => {
    if (!account || chainId !== 369n) { setStored(null); setError(""); setLoading(false); return; }
    let active = true;
    let timer: number | undefined;
    let readTimer: number | undefined;
    let retryDelay = 60000;
    const controller = new AbortController();
    setLoading(true); setError("");
    const unsubscribe = subscribeMinerPositions(account, value => {
      if (!active) return;
      setStored(previous => previous?.account === value.account && previous.complete && !value.complete ? previous : value);
      setNow(Date.now());
    });
    const timeout = new Promise<never>((_, reject) => {
      readTimer = window.setTimeout(() => { reject(new Error("Miner data is taking too long to load. Please retry.")); controller.abort(); }, 60000);
    });
    Promise.race([readMinerPositions(account, controller.signal), timeout]).then((value) => {
      if (active) { minerViewCache.set(cacheKey,value); setStored(value); setNow(Date.now()); }
      if (value.walletBalance == null || value.pools.some(pool => pool.error)) retryDelay = 5000;
    }).catch((reason) => { if (active) { setError(reason instanceof Error ? reason.message : "Miner data unavailable. Retrying automatically."); retryDelay = 5000; } }).finally(() => {
      window.clearTimeout(readTimer);
      if (active) { setLoading(false); timer = window.setTimeout(() => setRefresh((value) => value + 1), retryDelay); }
    });
    return () => { active = false; unsubscribe(); controller.abort(); window.clearTimeout(timer); window.clearTimeout(readTimer); };
  }, [account, refresh, cacheKey, chainId]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000);const refresh=()=>setRefresh(v=>v+1);window.addEventListener("oink-positions-changed",refresh);return () => {window.clearInterval(timer);window.removeEventListener("oink-positions-changed",refresh);}; }, []);
  const positions = snapshot?.pools.flatMap((pool) => pool.rows.map((row) => ({ ...row, pool }))) ?? [];
  const failed = snapshot?.pools.filter((pool) => pool.error) ?? [];
  const complete = !!snapshot?.complete && failed.length === 0;
  const ready = !account || (complete && snapshot.walletBalance != null && !snapshotIsStale(snapshot.timestamp, now));
  const loadError = !account || loading ? null : error || (failed.length ? "Some miner positions could not be loaded. Retry to load all miner values." : snapshot?.walletBalance == null && snapshot ? "Your OINK wallet balance could not be loaded." : snapshot && snapshotIsStale(snapshot.timestamp, now) ? "Miner data is out of date. Retry to load current values." : null);
  usePageLoadStatus("miner-portfolio", ready, loadError, () => setRefresh(value => value + 1));
  const liveGross = (row:typeof positions[number]) => row.pool.yieldEstimate && snapshot && !snapshotIsStale(snapshot.timestamp,now) ? formatEther(estimateMinerValue(parseEther(row.gross),parseEther(row.shares),parseEther(row.pool.totalShares),parseEther(row.pool.yieldEstimate.dailyPool),now/1000-snapshot.timestamp)) : row.gross;
  const total = snapshot?.pools.some((pool) => !pool.loading && !pool.error) ? sumFarmAmounts(positions.map(liveGross)) : null;
  const combined = complete && total != null && snapshot.walletBalance != null ? sumFarmAmounts([total, snapshot.walletBalance]) : null;
  const oinkPrice = freshFarmPrice(prices.oink, now);
  const balanceFresh = !!snapshot && !snapshotIsStale(snapshot.timestamp, now);
  const snapshotTime = snapshot?.timestamp ?? 0;
  const durationPositions = positions.filter(row => duration === "all" || row.pool.id === duration);
  const visible = selectMiners(positions, { query, status, duration, sort, time: snapshotTime, balance: liveGross });
  const awaitingPositions = (!account && walletBusy) || (!!account && chainId === 369n && !positions.length && !snapshot?.complete && !error && !failed.length);
  const readStatus = [error, snapshot && snapshotIsStale(snapshot.timestamp, now) ? "These values are out of date. Wait for updated balances and progress." : "", snapshot && !snapshot.complete ? `Loading remaining miner durations… ${snapshot.pools.filter(pool => !pool.loading).length} of ${TIME_MINER_CONTRACTS.length} loaded.` : awaitingPositions ? "Reading your miner positions…" : "", failed.length ? `Reads unavailable: ${failed.map(pool => pool.label).join(", ")}. Totals are incomplete.` : ""].filter(Boolean).join(" ");
  return <section>
    <div className="miner-wallet-totals">{[["Wallet balance", snapshot?.walletBalance], [complete ? "Total miners" : "Miners subtotal", total], ["Combined balance", combined]].map(([label, value]) => {
      const usd = portfolioMarketValue(value ?? null, oinkPrice, balanceFresh);
      return <div key={label}><span>{label}</span><strong aria-description={value ?? undefined}>{value != null ? displayFarmAmount(value) : account && loading ? "Loading…" : "—"} <small className="miner-summary-token"><span className="miner-summary-pig" aria-hidden="true"><img src={assetUrl("img/oink.png")} alt="" /></span>OINK</small><small className="miner-summary-usd">{usd == null ? "— USD" : displayRankValue(usd, "tvl")}</small></strong></div>;
    })}</div>
    <header className="my-miners-heading"><div><h1>Miners <InfoTooltip label="About miner balances"><p>Miner balances are the gross OINK represented by your shares, before withdrawal penalties. Open End Miner (Withdraw) for a current estimate of what returns to your wallet.</p><p>Wallet balance is liquid OINK. Combined balance adds it to gross miner value. A miners subtotal includes only positions successfully loaded so far; the combined total waits for all durations.</p></InfoTooltip> <small role="status">{snapshot ? (visible.length !== positions.length ? `${visible.length} of ` : "") + positions.length + (complete ? " miners" : " known miners") : ""}</small></h1><p>Time-locked OINK positions</p></div><div className="miner-view-controls"><button aria-pressed={view === "grid"} onClick={() => setView("grid")}>Grid</button><button aria-pressed={view === "list"} onClick={() => setView("list")}>List</button></div></header>
    <div className="miners-toolbar" role="search" aria-label="Find miners">
      <label>Search miners<input type="search" placeholder="Duration, miner # or contract address" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label>Duration<select value={duration} onChange={event => setDuration(event.target.value)}><option value="all">All durations{snapshot ? ` (${positions.length})` : ""}</option>{TIME_MINER_CONTRACTS.map(miner => <option key={miner.id} value={miner.id}>{miner.label}{snapshot ? ` (${positions.filter(row => row.pool.id === miner.id).length})` : ""}</option>)}</select></label>
      <label>Status<select value={status} aria-description={MINER_FILTERS.find(filter => filter.value === status)?.description} onChange={event => setStatus(event.target.value as MinerStatusFilter)}>{MINER_FILTERS.map(filter => <option key={filter.value} value={filter.value}>{filter.label}{snapshot ? ` (${durationPositions.filter(row => matchesMinerStatus(row, filter.value, snapshotTime)).length})` : ""}</option>)}</select></label>
      <label>Sort by<select value={sort} onChange={event => setSort(event.target.value as MinerSort)}>{MINER_SORTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <button type="button" onClick={clearFilters}>Clear filters</button>
    </div>
    <div className="miner-deadline-shortcuts" role="group" aria-label="Miner deadlines at latest snapshot">
      {([
        ["mature", "Mature"], ["grace-soon", "Grace ending in 48h"], ["overdue", "Overdue"]
      ] as const).map(([value, label]) => <button type="button" key={value} disabled={!snapshot} aria-pressed={status === value} aria-description={MINER_FILTERS.find(filter => filter.value === value)?.description} onClick={() => { setQuery(""); setStatus(status === value ? "all" : value); setSort("grace"); }}>{label} <strong>{snapshot ? durationPositions.filter(row => matchesMinerStatus(row, value, snapshotTime)).length : "—"}</strong></button>)}
      <InfoTooltip label="About maturity, grace and mandatory service"><p>Maturity marks the end of the miner's nominal term. Its grace period follows maturity; withdrawing within that window has no early or late exit penalty, provided mandatory service has ended.</p><p>Mandatory service is a separate withdrawal lock. After grace, a late penalty can apply. Rollover recommits a mature miner and restarts its term; it does not pay liquid OINK to your wallet.</p></InfoTooltip>
    </div>
    <p className="miner-read-status" role={error ? "alert" : "status"} tabIndex={readStatus ? 0 : undefined}>{readStatus}</p>
    <div className={"miner-positions-content miner-positions-" + view} role="region" aria-label="Your miner positions" aria-busy={awaitingPositions}>
    {awaitingPositions && view === "grid" && <MinerLoadingCards />}
    {!positions.length && !awaitingPositions && <div className="miners-empty"><h2>{!account ? "Connect your wallet to see your miners" : loading ? "Reading your miners…" : complete ? "No miners found" : "No positions available"}</h2><p>{!account ? "Use Connect wallet in the navbar. Reading positions requires no signature or transaction." : "Only successfully read positions are included. Explore duration contracts under Deploy miners."}</p></div>}
    {positions.length > 0 && !visible.length && <div className="miners-empty" role="status"><h2>No matching miners</h2><p>Try a different search, duration, or status.</p><button type="button" onClick={clearFilters}>Show all miners</button></div>}
    {view === "list" && (visible.length > 0 || awaitingPositions) && <div className="miner-table-scroll" role="region" aria-label="Miner positions, scroll horizontally on smaller screens" tabIndex={0}>
      <table className="miner-table"><caption className="miner-table-caption">Your miners · dates in your local timezone · penalties and rollover status at latest snapshot</caption><thead><tr><th scope="col">Miner</th><th scope="col">Balance · OINK</th><th scope="col">Maturity</th><th scope="col">Grace ends</th><th scope="col">Penalty</th><th scope="col">Manage</th></tr></thead>
        <tbody>{awaitingPositions && Array.from({ length: 3 }, (_, index) => <tr className="miner-loading-table-row" aria-hidden="true" key={"loading-" + index}>{Array.from({ length: 6 }, (_, column) => <td key={column}><span className="miner-loading-bar" /></td>)}</tr>)}{visible.map(row => <tr key={row.pool.id + ":" + row.index}>
          <th scope="row"><strong>{row.pool.label} <small>#{row.index}</small></strong><MinerStatus row={row} time={snapshotTime} /><span className="miner-countdown">{minerDeadline(row, snapshotTime, now / 1000)}</span></th>
          <td className="miner-table-balance" aria-description={liveGross(row)}>{displayFarmAmount(liveGross(row))}</td>
          <td><MinerDate timestamp={row.maturity} /></td><td><MinerDate timestamp={row.graceEnd} /></td>
          <td><MinerPenalty row={row} time={snapshotTime} /></td>
          <td><div className="miner-table-actions"><MinerActions row={row} account={account} revision={revision} chainId={chainId} /></div></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {view === "grid" && !awaitingPositions && <div className="my-miner-grid">{visible.map((row) => <article className="my-miner-card" key={row.pool.id + ":" + row.index}>
      <header><h2>{row.pool.label}</h2><span>#{row.index}</span></header>
      <div className="miner-hero-value"><strong aria-description={liveGross(row)}>{displayFarmAmount(liveGross(row))}</strong><span className="miner-token-label"><span className="miner-token-pig" aria-hidden="true"><img src={assetUrl("img/oink.png")} alt="" /></span>OINK</span></div>
      <Progress label="Lock progress" start={row.deposited} end={row.maturity} time={snapshot!.timestamp} />
      <Progress label="Mandatory service" start={row.deposited} end={row.mandatoryUntil} time={snapshot!.timestamp} />
      <MinerStatus row={row} time={snapshotTime} />
      <p className="miner-countdown">{minerDeadline(row, snapshotTime, now / 1000)}</p>
      <dl className="miner-dates">
        <div><dt>{snapshotTime >= row.maturity ? "Matured" : "Matures"}</dt><dd><MinerDate timestamp={row.maturity} /></dd></div>
        <div><dt>{snapshotTime > row.graceEnd ? "Grace ended" : "Grace ends"}</dt><dd><MinerDate timestamp={row.graceEnd} /></dd></div>
        <div className="miner-penalty"><dt>Penalty</dt><dd><MinerPenalty row={row} time={snapshotTime} /></dd></div>
      </dl>
      <MinerActions row={row} account={account} revision={revision} chainId={chainId} />

    </article>)}</div>}
    </div>
    <details className="miner-public-lookup"><summary>Look up another public wallet</summary><MyMiners /></details>
  </section>;
}
