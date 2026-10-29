import { useCallback,useEffect,useState } from "react";
import { readActivity,readTreasuryHoldings,treasuryAccounts,treasuryActivityAssets } from "../lib/treasuryActivity";
import { getPublicProvider } from "../lib/chain";
import { displayFarmAmount } from "../lib/farmDisplay";
import { usePageLoadStatus } from "./PageLoadBoundary";
import { snapshotIsStale } from "../lib/governanceReadSafety";
export function TreasuryActivity(){
  const [holdings,setHoldings]=useState<Awaited<ReturnType<typeof readTreasuryHoldings>>|null>(null),[activity,setActivity]=useState<Awaited<ReturnType<typeof readActivity>>|null>(null),[error,setError]=useState(''),[activityError,setActivityError]=useState(''),[refresh,setRefresh]=useState(0),[end,setEnd]=useState<number|undefined>(),[busy,setBusy]=useState(false);
  const retry = useCallback(()=>{setEnd(undefined);setRefresh(value=>value+1);},[]);
  const [now,setNow] = useState(Date.now());
  useEffect(()=>{const clock=window.setInterval(()=>setNow(Date.now()),15000);return()=>window.clearInterval(clock);},[]);
  const holdingsFresh = holdings !== null && !snapshotIsStale(holdings.timestamp,now) && holdings.timestamp*1000 <= now+30000;
  const holdingsReady = holdingsFresh && holdings.rows.every(owner=>owner.assets.every(asset=>asset.balance !== null));
  const activityReady = activity !== null && !activity.partial;
  usePageLoadStatus("treasury-holdings",holdingsReady,error||null,retry);
  usePageLoadStatus("treasury-activity",activityReady,activityError||null,retry);
  useEffect(()=>{
    let active=true;
    let deadline:number | undefined;
    let timer:number | undefined;
    const load=async()=>{
      setError('');
      let expired=false,delay=60000;
      deadline=window.setTimeout(()=>{expired=true;if(active)setError('Balance reads are delayed. Retrying after the current read finishes.');},45000);
      try {
        const rpc=await getPublicProvider();
        if(!active)return;
        const value=await readTreasuryHoldings(rpc);
        if(!active||expired)return;
        setHoldings(value);setNow(Date.now());
        if(value.rows.some(owner=>owner.assets.some(asset=>asset.balance === null))){setError('Some balances are unavailable. Retrying automatically.');delay=10000;}
      } catch { if(active)setError('Holdings are unavailable. Retrying automatically.');delay=10000; }
      finally {window.clearTimeout(deadline);if(active)timer=window.setTimeout(load,expired?10000:delay);}
    };
    void load();
    return()=>{active=false;window.clearTimeout(deadline);window.clearTimeout(timer);};
  },[refresh]);
  useEffect(()=>{
    let active=true;
    let deadline:number | undefined;
    let timer:number | undefined;
    const load=async()=>{
      setActivityError('');setBusy(true);
      let expired=false,delay=60000;
      deadline=window.setTimeout(()=>{expired=true;if(active)setActivityError('Activity reads are delayed. Waiting for the current read to finish.');},45000);
      try {
        const rpc=await getPublicProvider();
        if(!active)return;
        const value=await readActivity(rpc,end);
        if(!active||expired)return;
        setActivity(value);
        if(value.partial){setActivityError(end==null?'Some activity queries are unavailable. Retrying automatically.':'Some older activity queries are unavailable. Refresh latest to retry.');delay=10000;}
      } catch {if(active)setActivityError(end==null?'Activity is unavailable. Retrying automatically.':'Older activity is unavailable. Refresh latest to retry.');delay=10000;}
      finally {
        window.clearTimeout(deadline);
        if(active){setBusy(false);if(end==null)timer=window.setTimeout(load,expired?10000:delay);}
      }
    };
    void load();
    return()=>{active=false;window.clearTimeout(deadline);window.clearTimeout(timer);};
  },[end,refresh]);
  const owners=treasuryAccounts.map(owner=>holdings?.rows.find(row=>row.address.toLowerCase()===owner.address.toLowerCase())??{...owner,assets:[{symbol:"PLS",address:null,balance:null},...treasuryActivityAssets.map(asset=>({...asset,balance:null}))]});
  return <section className="treasury-activity docs-treasury-activity">
    <header className="card-heading-row"><div className="info-heading"><h2>Treasury &amp; activity</h2><InfoTooltip label="About protocol account balances">These are direct balances in four published protocol accounts. This view does not value their locked miners, NFTs, liquidity positions or every possible token. Overview shows treasury wallet assets, tracked farming positions and protocol-owned liquidity separately to explain their different scopes.</InfoTooltip></div><button disabled={busy} onClick={()=>{setEnd(undefined);setRefresh(v=>v+1);}}>Refresh latest</button></header>
    <p>Read-only balances for four published protocol accounts. This is not a complete asset inventory or a valuation.</p>
    <p className="docs-read-status" role="status">{error}</p>
    <div className="professional-grid two-columns">{owners.map(owner=><article key={owner.address} className="professional-card"><h3>{owner.label}</h3><a href={'https://scan.pulsechain.com/address/'+owner.address} target="_blank" rel="noreferrer">View account ↗</a><dl>{owner.assets.map(asset=><div className="offer-quote" key={asset.symbol}><dt>{asset.symbol}</dt><dd>{asset.balance==null?"—":displayFarmAmount(asset.balance)}</dd></div>)}</dl></article>)}</div>
    <p className="deploy-draft-note docs-treasury-snapshot">{holdings?<>{holdingsFresh?"Updates every minute":"Last loaded balances · current reads are pending"} · Updated <time dateTime={new Date(holdings.timestamp*1000).toISOString()}>{new Date(holdings.timestamp*1000).toLocaleString()}</time> · Block {holdings.block.toLocaleString()}. Locked positions, NFTs, LP holdings and other tokens are not valued here. Zero balances are actual reads; unavailable reads are not shown as zero.</>:"Reading the four published protocol accounts. Missing observations are shown as —."}</p>
    <div className="info-heading"><h2>Recent on-chain activity</h2><InfoTooltip label="About activity coverage">The feed decodes supported miner actions, farm claims and exits, and OINK transfers involving the published accounts. It is not the protocol's entire transaction history. Native PLS transfers and unrelated actions are excluded; failed history queries are marked incomplete. Older events pauses the latest activity view until you refresh.</InfoTooltip></div><p>Decoded time-miner actions, supported farm claims/exits and nonzero OINK transfers involving the accounts above. Native PLS transfers and unrelated protocol actions are not included.</p>
    <p className="deploy-draft-note docs-activity-check">{end==null?"Activity updates every minute.":"Browsing older blocks. Refresh latest to resume live activity updates."}{activity&&<> Last checked through <time dateTime={new Date(activity.toTimestamp*1000).toISOString()}>{new Date(activity.toTimestamp*1000).toLocaleString()}</time>.</>}</p>
    <p className="docs-read-status" role="status">{activityError||(!activity&&busy?"Reading activity…":"")}</p>
    <p className="docs-activity-range">{activity?<>Blocks {activity.from.toLocaleString()}–{activity.to.toLocaleString()}{activity.partial?" · Some queries failed; results are incomplete.":""}</>:"Reading the current block range…"}</p>
    <div className="docs-activity-feed" role="region" aria-label="Treasury activity events" tabIndex={0}>
      {!activity?<p>Loading on-chain activity…</p>:!activity.rows.length?<p>No matching events returned in this range.</p>:<div className="resource-facts">{activity.rows.map(row=><article key={row.key} className="professional-card"><strong>{row.label}</strong><p>{displayFarmAmount(row.amount.split(" ")[0])+" "+row.amount.split(" ").slice(1).join(" ")}</p><a href={"https://scan.pulsechain.com/tx/"+row.hash} target="_blank" rel="noreferrer">Block {row.block.toLocaleString()} · View transaction ↗</a></article>)}</div>}
    </div>
    <button disabled={!activity||activity.from===0||busy} onClick={()=>activity&&setEnd(activity.from-1)}>Older events</button>
  </section>;
}

import { InfoTooltip } from "./InfoTooltip";
