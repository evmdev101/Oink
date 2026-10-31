import { createViewSnapshotCache } from "../lib/viewSnapshotCache";
import { useEffect, useRef, useState } from "react";
import { HistoryChart, type HistorySeries as Series } from "./PortfolioHistoryChart";
import { readPortfolioHistory, peekPortfolioHistory, type PortfolioHistory } from "../lib/portfolioHistory";
import { cumulativeHistory, type WalletActivity } from "../lib/portfolioHistoryModel";
import { displayFarmAmount, sumFarmAmounts } from "../lib/farmDisplay";
import { portfolioMarketValue } from "../lib/portfolioValuation";
import { displayRankValue } from "../lib/farmRankings";
import { InfoTooltip } from "./InfoTooltip";
import { useDeferredDisplayRead } from "./useDeferredDisplayRead";

const historyViewCache = createViewSnapshotCache<PortfolioHistory>();
export function PortfolioHistoryPanel({ account, revision, oinkPrice }: { account:string; revision:number; oinkPrice:string }) {
  return <PortfolioHistoryContent account={account} revision={revision} oinkPrice={oinkPrice} />;
}

/** The same layout, with no wallet address, private cache lookup or history read. */
export function PortfolioHistoryShell({ pending }: { pending:boolean }) {
  return <PortfolioHistoryContent account={null} revision={0} oinkPrice="0" shellPending={pending} />;
}

function PortfolioHistoryContent({ account, revision, oinkPrice, shellPending = false }: { account:string | null; revision:number; oinkPrice:string; shellPending?:boolean }) {
  const { sectionRef, readReady } = useDeferredDisplayRead();
  const cacheKey = account ? `${account.toLowerCase()}:${revision}` : "";
  const [stored,setStored] = useState<PortfolioHistory | null>(() => account ? historyViewCache.get(cacheKey) ?? peekPortfolioHistory(account) : null);
  const [busy,setBusy] = useState(() => !!account || shellPending);
  const [refresh,setRefresh] = useState(0);
  const [category,setCategory] = useState("all");
  const [page,setPage] = useState(0);
  const browsingHistory = page > 0;
  const activityList = useRef<HTMLUListElement>(null);
  useEffect(() => { if (activityList.current) activityList.current.scrollTop = 0; }, [page, category]);
  const [flow,setFlow] = useState("both");
  const data = account && stored?.account.toLowerCase() === account.toLowerCase() ? stored : null;
  useEffect(() => {
    if (!account) return;
    const changed = () => setRefresh(value => value + 1);
    window.addEventListener("oink-positions-changed",changed);
    return () => window.removeEventListener("oink-positions-changed",changed);
  }, [account]);
  useEffect(() => {
    if (!account) { setBusy(shellPending); return; }
    if (!readReady) return;
    let active = true;
    const controller = new AbortController();
    let timer:number | undefined;
    if (browsingHistory) { setBusy(false); return () => controller.abort(); }
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) { timer = window.setTimeout(load, 60000); return; }
      setBusy(true);
      let delay = 60000;
      try {
        const value = await readPortfolioHistory(account,AbortSignal.any([controller.signal,AbortSignal.timeout(50000)]),progress=>{
          if(active)setStored(progress);
        });
        if (active) { historyViewCache.set(cacheKey,value); setStored(value); }
        if (value.failed > 0) delay = 10000;
      } catch {
        delay = 10000;
      } finally {
        if (active) { setBusy(false); timer = window.setTimeout(load,delay); }
      }
    };
    void load();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [account,revision,refresh,cacheKey,browsingHistory,shellPending,readReady]);
  useEffect(() => { setPage(0); }, [account,revision,refresh]);
  const rows = data?.rows ?? [];
  const partial = !!data && (data.failed > 0 || data.capped > 0 || !!data.loading);
  const available = !!data && (rows.length > 0 || !data.loading && data.failed === 0);
  const total = (field:"deposited" | "withdrawn" | "harvested" | "penalty") => available ? displayFarmAmount(sumFarmAmounts(rows.map(row => row[field]))) : "—";
  const harvestedUsd = available ? portfolioMarketValue(sumFarmAmounts(rows.map(row => row.harvested)),oinkPrice,true) : null;
  const visible = rows.filter(row => category === "all" || row.category === category).slice().reverse();
  const pages = Math.max(1,Math.ceil(visible.length / 16));
  const currentPage = Math.min(page,pages - 1);
  const minerSeries:Series[] = [
    { label:"Miner deposits", color:"var(--accent)", points:cumulativeHistory(rows,"deposited") },
    { label:"Miner withdrawals", color:"#80caff", points:cumulativeHistory(rows,"withdrawn") },
  ].filter((_,index) => flow === "both" || flow === String(index));
  const end = (data?.loadedAt ?? Date.now()) / 1000;
  return <>
    <section ref={sectionRef} className="professional-card overview-section portfolio-history-summary" aria-busy={busy}>
      <div className="portfolio-toolbar"><div className="info-heading"><h2>Your recorded activity</h2><InfoTooltip label="About recorded activity totals"><p>Totals come from the wallet's loaded contract events. Deposits include gifted miners received, while upgrades and extensions are excluded to avoid counting moved principal twice.</p><p>Harvest totals can include rewards sent into miners, rather than paid directly to your wallet. If history is partial, the totals cover only the loaded events.</p></InfoTooltip></div></div>
      <div className="portfolio-stat-strip">{[["OINK deposited",total("deposited")],["OINK withdrawn",total("withdrawn")],["Rewards harvested",total("harvested")],["Miner penalties",total("penalty")]].map(([label,value]) => <div key={label}><span>{label}</span><strong>{value} <small>OINK</small></strong></div>)}</div>
      <p className="portfolio-note">Deposits include gifts received. Upgrades and extensions are excluded from deposit totals to avoid counting moved principal twice. Harvest amounts follow contract events and may be routed into miners; they are not all direct wallet payouts.</p>
    </section>
    <section className="professional-card overview-section portfolio-position-history"><div className="portfolio-toolbar"><div><div className="info-heading"><h2>Position history</h2><InfoTooltip label="About position history"><p>The chart adds recorded OINK miner deposits and withdrawals over time. These are cumulative flows, rather than your portfolio balance, profit or a price history.</p><p>Miner growth, token prices and unrecorded events are not added to these lines.</p></InfoTooltip></div><p className="portfolio-note">OINK deposits and withdrawals over time · cumulative flows, not portfolio balance.</p></div><div className="portfolio-filter-pills" role="group" aria-label="Position history series">{[["both","Both"],["0","Deposits"],["1","Withdrawals"]].map(([id,label]) => <button key={id} type="button" aria-pressed={flow === id} disabled={!account} onClick={() => setFlow(id)}>{label}</button>)}</div></div><div className="portfolio-chart-frame" aria-busy={!data && busy}>{available ? <HistoryChart series={minerSeries} end={end} label="Miner deposit and withdrawal history" /> : <div className="portfolio-chart-empty">{!account ? "Connect your wallet to load miner history." : busy ? "Loading miner history…" : "Miner history unavailable."}</div>}</div></section>
    <section className="professional-card overview-section portfolio-rewards-earned"><div className="info-heading"><h2>Rewards earned</h2><InfoTooltip label="About recorded rewards earned"><p>OINK harvest amounts recorded by the supported farm and HEX-share contracts. Pending rewards and time-miner growth are tracked separately.</p><p>These event totals are not necessarily direct wallet payouts. The dollar estimate uses today's OINK quote, rather than the token price when each harvest occurred.</p></InfoTooltip></div><p className="portfolio-note">Recorded farm and HEX share harvests.<br />Pending rewards and miner growth are tracked separately.</p><div className="portfolio-reward-value"><strong className="portfolio-reward-total">{total("harvested")} <span>OINK</span></strong><small className="portfolio-reward-usd" aria-description="Value at the current OINK price">{harvestedUsd == null ? "USD value unavailable" : displayRankValue(harvestedUsd,"rewards").replace(" USD", "")}</small></div><div className="portfolio-chart-frame" aria-busy={!data && busy}>{available ? <HistoryChart end={end} label="Recorded OINK harvest history" series={[{ label:"Farm harvests",color:"var(--accent)",points:cumulativeHistory(rows.filter(row => row.category === "farms"),"harvested") },{ label:"HEX share harvests",color:"#80caff",points:cumulativeHistory(rows.filter(row => row.category === "hex"),"harvested") }]} /> : <div className="portfolio-chart-empty">{!account ? "Connect your wallet to load reward history." : busy ? "Loading reward history…" : "Reward history unavailable."}</div>}</div></section>
    <section className="professional-card overview-section"><div className="portfolio-toolbar portfolio-activity-heading"><div><div className="info-heading"><h2>Your activity</h2><InfoTooltip label="About your activity feed"><p>Recorded actions for the connected wallet from supported miner, farm and HEX-share contracts. Filters change the displayed records, rather than on-chain activity.</p><p>Open a transaction for its complete details. Older pages pause automatic refresh so the list stays in place while you browse.</p></InfoTooltip></div><p className="portfolio-note">{account ? <>Recorded actions for {account.slice(0,6)}…{account.slice(-4)}, newest first.</> : "Connect your wallet to see your recorded actions, newest first."}</p></div><span className="portfolio-note portfolio-activity-count">Page {currentPage + 1} · {available ? visible.length : "—"} events{partial ? " · partial" : ""}</span></div><div className="portfolio-filter-pills" role="group" aria-label="Activity categories">{[["all","All"],["miners","Miners"],["farms","Farms"],["hex","HEX shares"]].map(([id,label]) => <button type="button" key={id} aria-pressed={category === id} disabled={!account} onClick={() => { setCategory(id); setPage(0); }}>{label}</button>)}</div>
      <ul ref={activityList} className="portfolio-activity-list portfolio-activity-scroll" tabIndex={0} aria-label="Wallet activity" aria-busy={!data && busy}>{!visible.length && <li className="portfolio-activity-empty">{!account ? "Connect your wallet on PulseChain to load activity." : busy ? "Loading activity…" : !available ? "Activity unavailable. Retrying automatically." : "No matching events in the loaded history."}</li>}{visible.slice(currentPage * 16,(currentPage + 1) * 16).map((row:WalletActivity) => <li key={row.key}><div><strong>{row.label}</strong><small>{row.source} · <time dateTime={new Date(row.timestamp * 1000).toISOString()}>{new Date(row.timestamp * 1000).toLocaleString()}</time></small></div><div className="portfolio-activity-amount"><strong>{displayFarmAmount(row.amount)} <small>{row.symbol}</small></strong><a href={"https://scan.pulsechain.com/tx/" + row.hash} target="_blank" rel="noreferrer">View transaction ↗</a></div></li>)}</ul>
      <nav className="portfolio-pagination" aria-label="Activity pages"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>{Array.from({ length:3 }, (_, offset) => {
        const index = Math.max(0,Math.min(currentPage - 1,pages - 3)) + offset;
        return index < pages ? <button className="portfolio-page-number" type="button" key={offset} aria-label={"Page " + (index + 1)} aria-current={index === currentPage ? "page" : undefined} disabled={!account} onClick={() => setPage(index)}>{index + 1}</button> : <span className="portfolio-page-number" key={offset} aria-hidden="true" />;
      })}<button type="button" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>Next</button></nav>
    </section>
  </>;
}

