import { createViewSnapshotCache } from "../lib/viewSnapshotCache";
import { beginForegroundDisplayRead } from "../lib/displayReadPriority";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../components/WalletProvider";
import { usePageLoadStatus } from "../components/PageLoadBoundary";
import { readMinerPositions, readEcosystemVaults, peekMinerPositions, peekEcosystemVaults } from "../lib/miningAccounts";
import { readFarmPrices, peekFarmPrices, freshFarmPrice, type FarmPrices } from "../lib/farmPrices";
import { withDiscoveredFarmPrices } from "../lib/farmSnapshot";
import { displayFarmAmount, farmWalletPositions, sumFarmAmounts } from "../lib/farmDisplay";
import { portfolioMarketValue, completePortfolioTotal } from "../lib/portfolioValuation";
import { displayRankValue } from "../lib/farmRankings";
import { snapshotIsStale } from "../lib/governanceReadSafety";
import { isNftDashboardPool } from "../config/nftProjects";
import { PortfolioHistoryPanel, PortfolioHistoryShell } from "../components/PortfolioHistoryPanel";
import { ResourceFooter } from "../components/ResourceFooter";
import { InfoTooltip } from "../components/InfoTooltip";
import "./home-resources.css";
import "./overview-layout.css";
import "./portfolio-detail.css";

type Snapshot = { account:string; miners:Awaited<ReturnType<typeof readMinerPositions>> | null; farms:Awaited<ReturnType<typeof readEcosystemVaults>> | null; prices:FarmPrices };
const portfolioCache = createViewSnapshotCache<Snapshot>();
export function PortfolioPage() {
  const { account, chainId, revision, busy } = useWallet();
  const cacheKey = `${chainId}:${account?.toLowerCase()}:${revision}`;
  const [stored, setStored] = useState<Snapshot | null>(() => account && chainId === 369n ? portfolioCache.get(cacheKey) ?? {account,miners:peekMinerPositions(account),farms:peekEcosystemVaults(account),prices:peekFarmPrices()} : null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(() => !!account && chainId === 369n);
  const [now, setNow] = useState(Date.now());
  const allowed = !!account && chainId === 369n;
  const data = allowed && stored?.account === account ? stored : null;
  const missingValue = "—";
  const amount = (value:string | null | undefined) => value == null ? missingValue : displayFarmAmount(value);
  const usd = (value:bigint | null) => value == null ? missingValue : displayRankValue(value, "rewards");
  useEffect(() => {
    if (!allowed || !account) { setStored(null); setLoading(false); return; }
    let active = true;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]);
    const releasePriority = beginForegroundDisplayRead(signal);
    setLoading(true);
    const bounded = <T,>(promise:Promise<T>) => Promise.race([promise, new Promise<never>((_, reject) => signal.addEventListener("abort", () => reject(new Error("Read timed out")), { once:true }))]);
    // Reveal each section as it arrives instead of waiting on the slowest source.
    const publish = (patch:Partial<Snapshot>) => {
      if (!active) return;
      setStored(current => {
        const next = { ...(current?.account === account ? current : {account,miners:null,farms:null,prices:{}}), ...patch };
        return {...next,prices:next.farms ? withDiscoveredFarmPrices(next.farms,next.prices) : next.prices};
      });
      setNow(Date.now());
    };
    void Promise.allSettled([
      bounded(readMinerPositions(account, signal)).then(value => { publish({miners:value}); return value; }),
      bounded(readEcosystemVaults(signal, account)).then(value => { publish({farms:value}); return value; }),
      bounded(readFarmPrices(signal)).then(value => { publish({prices:value}); return value; }),
    ]).then(([miners, farms, prices]) => {
      if (!active) return;
      const farmSnapshot = farms.status === "fulfilled" ? farms.value : null;
      const quotes = prices.status === "fulfilled" ? prices.value : {};
      const next = { account, miners:miners.status === "fulfilled" ? miners.value : null, farms:farmSnapshot, prices:farmSnapshot ? withDiscoveredFarmPrices(farmSnapshot, quotes) : quotes };
      portfolioCache.set(cacheKey,next);
      setStored(next);
      setLoading(false); setNow(Date.now());
    }).finally(releasePriority);
    return () => { active = false; controller.abort(); };
  }, [account, allowed, revision, refresh, cacheKey]);
  useEffect(() => {
    const timer = window.setInterval(() => setRefresh(value => value + 1), 60000);
    const clock = window.setInterval(() => setNow(Date.now()), 15000);
    const changed = () => setRefresh(value => value + 1);
    window.addEventListener("oink-positions-changed", changed);
    return () => { window.clearInterval(timer); window.clearInterval(clock); window.removeEventListener("oink-positions-changed", changed); };
  }, []);
  usePageLoadStatus("portfolio", !allowed || !!data);
  const miners = data?.miners;
  const farms = data?.farms;
  const minerFresh = !!miners && miners.complete !== false && !snapshotIsStale(miners.timestamp, now);
  const farmFresh = !!farms && farms.complete !== false && !snapshotIsStale(farms.timestamp, now);
  const valueOf = (quantity:string | null, id:string, fresh:boolean) => portfolioMarketValue(quantity, freshFarmPrice(data?.prices[id], now), fresh);
  const positions = miners?.pools.flatMap(pool => pool.rows.map(row => ({ ...row, pool }))) ?? [];
  const minerTotal = miners && miners.complete !== false && miners.pools.every(pool => !pool.error) ? sumFarmAmounts(positions.map(row => row.gross)) : null;
  const walletUsd = valueOf(miners?.walletBalance ?? null, "oink", minerFresh);
  const minerUsd = valueOf(minerTotal, "oink", minerFresh);
  const farmRows = farms?.rows.filter(row => row.id !== "treasury" && row.id !== "t-share" && !isNftDashboardPool(row.address) && (!row.discovery || row.discovery.readSpec)) ?? [];
  const farmValues = farmRows.map(row => valueOf(row.data && !row.data.accountError && row.data.positions ? sumFarmAmounts(row.data.positions.map(position => position.amount)) : null, row.id, farmFresh));
  const farmUsd = farmFresh ? completePortfolioTotal(farmValues) : null;
  const total = completePortfolioTotal([walletUsd, minerUsd, farmUsd]);
  const rewardRows = farms?.rows.filter(row => row.id !== "treasury" && !isNftDashboardPool(row.address) && (!row.discovery || row.discovery.readSpec)) ?? [];
  const rewards = rewardRows.map(row => farmWalletPositions(row));
  const pending = farmFresh && rewards.length && rewards.every(rows => rows != null) ? sumFarmAmounts(rewards.flatMap(rows => rows!.map(row => row.pending))) : null;
  return <main className="app-page overview-page portfolio-detail-page">
      <section className="professional-card portfolio-value-card" aria-busy={busy || loading}><div className="portfolio-value-heading"><span className="section-kicker">Portfolio value</span><InfoTooltip label="About portfolio value"><p>Market estimate before exit penalties and farm funding costs. Includes wallet OINK, time miners and supported farm deposits. Other wallet tokens, NFTs, HEX stakes and pending rewards are excluded. Miner growth is already included.</p><p>The combined total stays unavailable if a required balance or current price is missing. It is not the amount you would necessarily receive by exiting every position.</p></InfoTooltip></div><h2 className="portfolio-value">{total == null ? missingValue : "$" + ((total + 5n * 10n ** 17n) / (10n ** 18n)).toLocaleString("en-US")}</h2>
        <div className="portfolio-value-columns"><div className="portfolio-value-breakdown" tabIndex={0} role="region" aria-label="OINK value breakdown"><div className="portfolio-value-row portfolio-group-total"><strong>OINK</strong><strong>{usd(completePortfolioTotal([walletUsd,minerUsd]))}</strong></div><div className="portfolio-value-row"><span>In wallet</span><span>{usd(walletUsd)}</span></div><div className="portfolio-value-row"><span>In time miners</span><span>{usd(minerUsd)}</span></div><div className="portfolio-value-row"><span className="info-label">Pending farm &amp; HEX rewards <small> · excluded from total</small><InfoTooltip label="About pending farm and HEX rewards"><p>Gross OINK currently recorded as pending by the supported farms and HEX-share vault. Your selected claim destination can reduce the payout or create a locked miner.</p><p>These rewards are shown separately and are excluded from portfolio value to avoid mixing unclaimed rewards with deposited assets.</p></InfoTooltip></span><span>{usd(valueOf(pending,"oink",farmFresh))}</span></div>{rewardRows.filter(row => { const rows = farmWalletPositions(row); return rows && rows.some(p => /[1-9]/.test(p.pending)); }).map(row => { const value = sumFarmAmounts(farmWalletPositions(row)!.map(p => p.pending)); return <div className="portfolio-value-row portfolio-value-child" key={row.id}><span>{amount(value)} OINK from {row.label}</span><span>{usd(valueOf(value,"oink",farmFresh))}</span></div>; })}</div><div className="portfolio-value-breakdown" tabIndex={0} role="region" aria-label="Farm asset value breakdown"><div className="portfolio-value-row portfolio-group-total"><strong>Farm assets</strong><strong>{usd(farmUsd)}</strong></div>{farmRows.map((row,index) => { const rows = farmWalletPositions(row); if (rows?.length === 0) return null; return <div className="portfolio-value-row" key={row.id}><span>{row.label} deposited</span><span>{usd(farmValues[index])}</span></div>; })}{farms?.complete !== false && farmRows.length > 0 && farmRows.every(row => farmWalletPositions(row)?.length === 0) && <p className="portfolio-note">No supported farm deposits.</p>}</div></div>
        <p className="portfolio-note portfolio-value-status" role="status">{!allowed ? busy ? "Checking your wallet connection…" : account ? "Switch to PulseChain using the wallet control above to load your portfolio." : "Connect your wallet above to load your portfolio. Viewing balances does not request a signature." : total == null ? loading ? "Reading balances and current prices…" : "Some balances or current prices are unavailable. The combined value stays unavailable until all three categories can be valued." : ""}</p>
      </section>
      <section className="professional-card overview-section portfolio-positions-panel"><div className="info-heading"><h2>Your portfolio</h2><InfoTooltip label="About your portfolio positions"><p>This view groups the connected wallet's time miners, supported farm positions and registered HEX shares. Position counts are not token balances.</p><p>Manage a position from its miner or farm page, where the review checks current exit, funding and destination rules.</p></InfoTooltip></div><div className="portfolio-stat-strip"><div><span>In time miners</span><strong>{minerFresh ? amount(minerTotal) : missingValue} <small>OINK</small></strong><small>{usd(minerUsd)}</small></div><div><span>Active miners</span><strong>{miners && miners.complete !== false && miners.pools.every(pool => !pool.error) ? positions.length : missingValue}</strong><small>{!miners ? !allowed ? busy ? "Checking your wallet…" : "Connect on PulseChain" : loading ? "Loading miner maturities…" : "Miner maturities unavailable" : `${positions.filter(row => row.maturity <= miners.timestamp).length} loaded miners have matured`}</small></div><div><span>Farm positions</span><strong>{farms && farms.complete !== false && farmRows.every(row => farmWalletPositions(row) != null) ? farmRows.reduce((n,row) => n + (farmWalletPositions(row)?.length ?? 0),0) : missingValue}</strong><small>{usd(farmUsd)}</small></div><div><span>Pending rewards</span><strong>{amount(pending)} <small>OINK</small></strong><small>{usd(valueOf(pending,"oink",farmFresh))}</small></div></div>
      <section className="portfolio-position-section"><div className="portfolio-toolbar"><div className="info-heading"><h2>Time miners</h2><InfoTooltip label="About portfolio time miners"><p>Gross OINK is your miner shares' current accounting value, including accumulated miner growth. Estimated dollar value uses the current OINK quote.</p><p>Maturity is the end of the normal lock period. “In grace” is the post-maturity period before late-exit rules apply. Mandatory service can still prevent an exit; the miner action review checks it.</p></InfoTooltip></div><Link to="/mining">Manage miners →</Link></div><div className="portfolio-table-wrap portfolio-miners-scroll" tabIndex={0} role="region" aria-label="Time miner positions" aria-busy={!miners && loading}><table className="portfolio-table"><thead><tr><th>Miner</th><th><span className="info-label">Gross OINK<InfoTooltip label="About gross OINK"><p>The position's share of its miner pool before any exit penalty. It is not a separate wallet balance or a guaranteed withdrawal amount.</p></InfoTooltip></span></th><th>Estimated value</th><th>Maturity</th><th>Status</th><th><span className="info-label">Exit penalty<InfoTooltip label="About the estimated exit penalty"><p>The current penalty estimate for this miner position. Early and late exits follow different contract rules, and time can change the estimate.</p><p>It is shown separately from gross OINK and is not subtracted from portfolio value. The withdrawal review checks the exact current terms.</p></InfoTooltip></span></th></tr></thead><tbody>{!miners && (loading || !allowed) && Array.from({ length:6 }, (_,index) => <tr className="portfolio-loading-row" key={index} aria-hidden="true">{Array.from({ length:6 }, (_,column) => <td key={column}>—</td>)}</tr>)}{positions.map(row => <tr key={row.pool.id + row.index}><td>{row.pool.label} #{row.index}</td><td>{minerFresh ? amount(row.gross) : missingValue}</td><td>{usd(valueOf(row.gross, "oink", minerFresh))}</td><td>{new Date(row.maturity * 1000).toLocaleDateString()}</td><td>{!minerFresh ? missingValue : row.maturity > miners!.timestamp ? "Active" : row.graceEnd >= miners!.timestamp ? "In grace" : "Past grace"}</td><td>{minerFresh && row.penalty != null ? row.penalty.toFixed(2) + "%" : missingValue}</td></tr>)}</tbody></table></div><p className="portfolio-note portfolio-position-status" role="status">{!allowed ? busy ? "Checking your wallet connection…" : "Connect your wallet on PulseChain to load miner positions." : miners?.pools.some(pool => pool.error) ? "Some miner pools could not load. Retry to see all positions." : !positions.length ? loading ? "Loading miner positions…" : !miners ? "Miner positions are unavailable." : "No time miners in this wallet." : ""}</p></section>
      <section className="portfolio-position-section"><div className="portfolio-toolbar"><div className="info-heading"><h2>Farm positions</h2><InfoTooltip label="About portfolio farm positions"><p>Supported farm deposits held for the connected wallet, valued at current asset prices. Recorded principal is shown before any funding fees still due and any token transfer fees.</p><p>Pending OINK is a separate reward balance, not part of the deposit's estimated value.</p></InfoTooltip></div><Link to="/farms">Manage farms →</Link></div><div className="portfolio-table-wrap portfolio-farms-scroll" tabIndex={0} role="region" aria-label="Farm positions" aria-busy={!farms && loading}><table className="portfolio-table"><thead><tr><th>Farm</th><th><span className="info-label">Recorded deposit<InfoTooltip label="About recorded farm deposits"><p>The amount recorded in the farm contract's position accounting. Funding fees can reduce it, and unusual deposit tokens can apply transfer fees or reflections.</p><p>For those tokens, the recorded amount can differ from what the vault received or what a withdrawal returns.</p></InfoTooltip></span></th><th>Estimated value</th><th>Pending OINK</th></tr></thead><tbody>{!farms && (loading || !allowed) && Array.from({ length:4 }, (_,index) => <tr className="portfolio-loading-row" key={index} aria-hidden="true">{Array.from({ length:4 }, (_,column) => <td key={column}>—</td>)}</tr>)}{farmRows.map((row, index) => {
        const rows = farmWalletPositions(row);
        if (rows?.length === 0) return null;
        return <tr key={row.id}><td>{row.label}</td><td>{farmFresh && rows ? amount(sumFarmAmounts(rows.map(p => p.amount))) + " " + (row.data?.symbol ?? "") : missingValue}</td><td>{usd(farmValues[index])}</td><td>{farmFresh && rows ? amount(sumFarmAmounts(rows.map(p => p.pending))) : missingValue}</td></tr>;
      })}</tbody></table></div><p className="portfolio-note portfolio-position-status" role="status">{!allowed ? busy ? "Checking your wallet connection…" : "Connect your wallet on PulseChain to load farm positions." : !farms ? loading ? "Loading farm positions…" : "Farm positions are unavailable." : farms?.complete !== false && farmRows.length > 0 && farmRows.every(row => farmWalletPositions(row)?.length === 0) ? "No deposits in the supported farms." : ""}</p></section>
      <section className="portfolio-position-section"><div className="portfolio-toolbar"><div className="info-heading"><h2>Registered HEX shares</h2><InfoTooltip label="About your registered HEX shares"><p>HEX staking shares registered with the OINK share-reward vault. Your underlying HEX remains in the original HEX stake and is not included in portfolio value.</p><p>Pending OINK is the vault's gross reward estimate. A claim's destination payout and any lock terms are checked separately.</p></InfoTooltip></div><Link to="/farms">Manage HEX shares →</Link></div>{(() => { const row = farms?.rows.find(row => row.id === "t-share")?.special; return <div className="portfolio-stat-strip"><div><span>Registered shares</span><strong>{farmFresh && !row?.accountError ? amount(row?.registeredShares) : missingValue}</strong></div><div><span>Pending OINK</span><strong>{farmFresh && !row?.accountError ? amount(row?.pending) : missingValue}</strong></div></div>; })()}<p className="portfolio-note">HEX stays in your HEX stakes. The underlying HEX value is not counted in this portfolio.</p></section></section>
      {allowed && account ? <PortfolioHistoryPanel account={account} revision={revision} oinkPrice={freshFarmPrice(data?.prices.oink,now)} /> : <PortfolioHistoryShell pending={busy} />}
    <ResourceFooter />
  </main>;
}


