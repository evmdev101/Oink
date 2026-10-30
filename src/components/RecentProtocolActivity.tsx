import { useEffect, useState } from "react";
import { getPublicProvider } from "../lib/chain";
import { readActivity, type ActivityRow } from "../lib/treasuryActivity";
import { TIME_MINER_CONTRACTS, GOVERNANCE_CONTRACTS, CORE_CONTRACTS } from "../config/contracts";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { toQuantity } from "ethers";
import { displayFarmAmount } from "../lib/farmDisplay";
import { InfoTooltip } from "./InfoTooltip";
import { useDeferredDisplayRead } from "./useDeferredDisplayRead";

type Entry = ActivityRow & { category:string };
export function RecentProtocolActivity() {
  const { sectionRef, readReady } = useDeferredDisplayRead();
  const [rows, setRows] = useState<Entry[]>([]);
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<{from:number;to:number;timestamp:number}|null>(null);
  const [end, setEnd] = useState<number>();
  const [revision, setRevision] = useState(0);
  const [limit, setLimit] = useState(20);
  useEffect(() => {
    if (!readReady) return;
    let active = true;
    let deadline:number | undefined;
    let refreshTimer:number | undefined;
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) { refreshTimer = window.setTimeout(load, 60000); return; }
      setBusy(true); setError("");
      let timedOut = false;
      let retryDelay = 60000;
      deadline = window.setTimeout(() => {
        timedOut = true;
        if (active) setError(end == null ? "Activity is taking longer than expected. Retrying when the current read finishes." : "Older activity is taking longer than expected. Wait for this read to finish, or select Latest activity.");
      },45000);
      try {
        const rpc = await getPublicProvider();
        const result = await readActivity(rpc,end);
        if (!active || timedOut) return;
        const entries:Entry[] = result.rows.map(row => ({...row,category:TIME_MINER_CONTRACTS.some(record => record.address.toLowerCase() === row.address.toLowerCase()) ? "Miners" : VERIFIED_FARM_WRITES.some(record => record.address.toLowerCase() === row.address.toLowerCase()) ? "Farms" : "Treasury"}));
        let partial = result.partial;
        try {
          const addresses = [...new Set([...GOVERNANCE_CONTRACTS.map(record => record.address), ...CORE_CONTRACTS.filter(record => record.id === "senate").map(record => record.address)])];
          const logs = await rpc.send("eth_getLogs",[{address:addresses,fromBlock:toQuantity(result.from),toBlock:toQuantity(result.to)}]);
          for (const log of logs) if (!log.removed) entries.push({key:log.transactionHash+":"+log.logIndex,hash:log.transactionHash,block:Number(BigInt(log.blockNumber)),index:Number(BigInt(log.logIndex)),address:log.address,label:"Governance event",amount:"",category:"Governance"});
        } catch { partial = true; }
        if (active && !timedOut) {
          setRows(current => [...new Map((end == null ? entries : [...current,...entries]).map(row => [row.key,row])).values()].sort((a,b) => b.block-a.block || b.index-a.index));
          setRange({from:result.from,to:result.to,timestamp:result.toTimestamp});
          if (partial) { setError("Some event queries were unavailable. Results may be incomplete."); retryDelay = 10000; }
        }
      } catch { if(active)setError(end == null ? "Activity unavailable. Retrying automatically." : "Older activity unavailable. Select Latest activity to return to the latest events."); retryDelay = 10000; }
      finally {
        window.clearTimeout(deadline);
        if (active) {
          setBusy(false);
          // Browsing older blocks preserves that history until Refresh is selected.
          // Schedule only after the entire read settles, avoiding overlapping polls.
          if (end == null) refreshTimer = window.setTimeout(load, timedOut ? 10000 : retryDelay);
        }
      }
    };
    void load();
    return () => { active=false;window.clearTimeout(deadline);window.clearTimeout(refreshTimer); };
  },[end,revision,readReady]);
  const filtered = rows.filter(row => filter === "All" || row.category === filter);
  return <section ref={sectionRef} className="reference-panel recent-protocol-activity">
    <header><div className="info-heading"><h2>Recent activity</h2><InfoTooltip label="About recent protocol activity"><p>Recorded events from the listed miner, supported farm, treasury and governance contracts in the loaded block range. This feed covers the protocol, rather than only your wallet.</p><p>Some event types or older blocks may be outside the loaded range. Open a transaction to inspect its exact actions; one transaction can produce several events.</p></InfoTooltip></div></header>
    <div className="activity-filters" role="group" aria-label="Activity category">{["All","Miners","Farms","Treasury","Governance"].map(category => <button type="button" key={category} aria-pressed={filter===category} onClick={() => {setFilter(category);setLimit(20);}}>{category}</button>)}</div>
    <div className="protocol-activity-list" role="region" aria-label="Recent protocol events" aria-busy={busy && !rows.length} tabIndex={0}>
      <p className="protocol-activity-status" role="status">{error || (busy && !rows.length ? "Reading activity…" : !busy && !filtered.length ? "No matching events in the loaded range." : "")}</p>
      {filtered.slice(0,limit).map(row => <a href={`https://scan.pulsechain.com/tx/${row.hash}`} target="_blank" rel="noreferrer" key={row.key}><div><strong>{row.label}</strong><small>{row.category} · Block {row.block.toLocaleString()}</small></div><span>{row.amount ? displayFarmAmount(row.amount.split(" ")[0])+" "+row.amount.split(" ").slice(1).join(" ") : row.address.slice(0,6)+"..."+row.address.slice(-4)} <span aria-hidden="true">↗</span></span></a>)}
    </div>
    <div className="activity-pagination"><button type="button" disabled={filtered.length<=limit} onClick={() => setLimit(value => value+20)}>Show more</button><button type="button" disabled={busy || !range || range.from===0} onClick={() => {if(range) {setEnd(range.from-1);setLimit(value=>value+20);}}}>Load older events</button>{end != null && <button type="button" onClick={() => {setEnd(undefined);setLimit(20);setRevision(value => value+1);}}>Latest activity</button>}</div>
  </section>;
}
