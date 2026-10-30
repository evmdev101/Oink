import { StatTokenLabel } from "./StatTokenLabel";
import { InfoTooltip } from "./InfoTooltip";
import { MiningComparison } from "./MiningComparison";
import { LiveNumber } from "./LiveNumber";
import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { CORE_CONTRACTS, GOVERNANCE_CONTRACTS, TIME_MINER_CONTRACTS, ECOSYSTEM_MINER_CONTRACTS, OINK_TOKEN } from "../config/contracts";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { isNftDashboardPool } from "../config/nftProjects";
import { LINKS } from "../config/links";
import { getPublicProvider } from "../lib/chain";
import { snapshotRunner, snapshotIsStale } from "../lib/governanceReadSafety";
import { tShareAmounts } from "../lib/specialFarms";
import { readMinerYield } from "../lib/minerLive";
import { assetUrl } from "../lib/assets";
import { rewardAllocation, type RewardAllocationRow } from "../lib/rewardAllocation";
import { farmCountFromRegistry } from "../lib/farmRegistryCount";
import { waitForForegroundDisplayReads } from "../lib/displayReadPriority";
import "./participation-snapshot.css";

const metrics = [
  ["Governor proposals", "recorded Governor replacement proposals"],
  ["Senators", "registered senate members"],
  ["Registered pools", "on-chain reward registry"],
  ["Allocated pools", "pools with reward allocation"],
  ["NFT reward pools", "registered linked NFT vaults"],
  ["Miner accounting value", "OINK credit and pending rewards across six pools"],
  ["Governance voting base", "same miner accounting value; not additional OINK"],
  ["Miner shares", "total time-miner shares"],
  ["HEX T-shares", "registered shares, excluding seed"],
  ["OINK in LP", "OINK held by the chart pair"],
];
const metricHelp: Record<string, string> = {
  "Governor proposals": "The recorded count of Governor replacement proposals. Historical or unsuccessful proposals can remain in this count; it is not a count of proposals currently open for voting.",
  "Registered pools": "Every participant in the on-chain reward registry, including time miners, ecosystem farms, linked NFT pools and inactive entries. This is broader than the Listed farms count.",
  "Allocated pools": "Registered pools with a nonzero reward allocation. An allocation gives a pool a share of emissions; it does not mean a connected wallet has deposited there.",
  "Miner accounting value": "The sum of accounting balances across the six time miners, including credited and pending OINK rewards. Accounting credit can exist before tokens are issued, so this can exceed issued OINK held in the miner contracts.",
  "Governance voting base": "The miner accounting value used by the governance system. It overlaps the miner accounting value displayed alongside it and must not be added as another OINK balance. Vote weight also depends on duration and proposal rules.",
  "Miner shares": "Accounting units representing portions of the time-miner pools. Shares are not OINK tokens: the OINK value of a share changes as the pool's accounting balance changes.",
  "HEX T-shares": "HEX shares registered with the OINK reward vault, expressed in T-shares and excluding its initial seed. This is not all HEX staked across the network or the underlying HEX token value.",
};
const address = (records:readonly {id:string;address:string}[],id:string) => records.find(row => row.id === id)!.address;
const compact = (value:string) => new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:2}).format(Number(value));
const palette = ["#7b6cff","#17a7c7","#d74fe6","#ff3d7f","#ff9f32","#0fb15f"] as const;
const num = (value:string | null | undefined) => value == null ? 0 : Number(value);
const pct = (value:number,total:number) => total > 0 ? Math.max(0, value / total * 100) : 0;
type ParticipationData = {values:(string | null)[];block:number;timestamp:number;supply:string|null;supplyMining:string|null;minerBalances:{label:string;balance:string|null}[];allocations:RewardAllocationRow[];allocationRows:RewardAllocationRow[];minerAprs:{label:string;apr:string|null;color:string}[]};
type ParticipationDisplay = ParticipationData & { retained:boolean; oldestTimestamp:number };
// Public display memory only. Freshness is still enforced before every RPC read;
// cached values never authorize transactions or become fresh by being retained.
let retainedParticipation: ParticipationDisplay | null = null;
const coherentSupply = (data:ParticipationData) => data.supply != null && data.supplyMining != null && data.values[9] != null
  && Number.isFinite(num(data.supply)) && num(data.supply) > 0 && num(data.supplyMining) >= 0 && num(data.values[9]) >= 0
  && num(data.supplyMining) + num(data.values[9]) <= num(data.supply);
function retainParticipation(next:ParticipationData, previous:ParticipationDisplay|null):ParticipationDisplay {
  let retained = false;
  const keep = (value:string|null, prior:string|null|undefined) => {
    if (value == null && prior != null) { retained = true; return prior; }
    return value;
  };
  const values = next.values.map((value,index) => keep(value,previous?.values[index]));
  // The supply location chart must stay a coherent trio from one confirmed read.
  const supplySource = coherentSupply(next) ? next : previous && coherentSupply(previous) ? previous : next;
  if (supplySource !== next) { retained = true; values[9] = supplySource.values[9]; }
  const minerSource = next.minerBalances.every(row => row.balance != null) ? next
    : previous?.minerBalances.every(row => row.balance != null) ? previous : next;
  if (minerSource !== next) retained = true;
  const minerAprs = next.minerAprs.map((row,index) => ({...row,apr:keep(row.apr,previous?.minerAprs[index]?.apr)}));
  return {...next,values,supply:supplySource.supply,supplyMining:supplySource.supplyMining,minerBalances:minerSource.minerBalances,minerAprs,retained,
    oldestTimestamp:retained && previous ? Math.min(previous.oldestTimestamp,next.timestamp) : next.timestamp};
}
const farmLogoByName: Record<string,string> = {
  OINK: "img/apple-touch-icon.png",
  PLS: "img/farms/pls.png",
  PLSX: "img/farms/plsx.png",
  INC: "img/farms/inc.png",
  HEX: "img/farms/hex.png",
  PDAI: "img/farms/pdai.png",
  SOLIDX: "img/farms/solidx.png",
  COMMUNITAS: "img/farms/com.png",
  PTGC: "img/farms/ptgc.png",
  UFO: "img/farms/ufo.png",
  HOA: "img/farms/hoa.png",
  ATROPA: "img/farms/atropa.png",
};
function allocationLogo(label:string) {
  const key = label.split(" ")[0]?.toUpperCase() ?? "";
  return farmLogoByName[key] ?? "img/apple-touch-icon.png";
}
function DistributionChart({ title, parts, total, columns = false, available = true }: { title:string; parts:{label:string;value:number;color:string}[]; total:number; columns?:boolean; available?:boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const selected = active == null ? null : parts[active];
  const percent = (value:number) => pct(value, total);
  return <article className="reference-panel distribution-card" aria-busy={!available}>
    <div className="info-heading"><h3>{title}</h3><InfoTooltip label={"About " + title}>{columns ? <><p>Compares the accounting balance assigned to each time-miner duration. It includes miner accounting credit and pending rewards, rather than only issued tokens held at each address.</p><p>The percentages show each duration's share of this accounting total; they are not APR or your personal share.</p></> : <><p>Splits issued OINK supply between tokens held by the six miner contracts, the linked trading pair and all other accounts.</p><p>Unissued mining credit is excluded. “Other accounts” includes wallets and other contracts; it does not mean all those tokens are available for sale.</p></>}</InfoTooltip></div>
    <div className="distribution-summary">
      <span>{selected?.label ?? (columns ? "Miner accounting balance" : "Total OINK supply")}</span>
      <strong><LiveNumber value={available ? selected?.value ?? total : null} format={compact}/><small> OINK</small></strong>
      <span>{selected ? percent(selected.value).toFixed(1) + "%" : columns ? "Share of miner accounting weight" : "Issued tokens only; mining credit is shown separately"}</span>
    </div>
    <div className={columns ? "distribution-columns" : "distribution-stack"} aria-label={title}>
      {parts.map((part, index) => <button type="button" key={part.label}
        disabled={!available} className={active === index ? "is-active" : ""} style={{"--segment":part.color, "--share":available ? percent(part.value) + "%" : "0%"} as React.CSSProperties}
        aria-label={available ? part.label + ": " + compact(String(part.value)) + " OINK, " + percent(part.value).toFixed(1) + "%" : part.label + ": awaiting balances"}
        onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} onClick={() => setActive(active === index ? null : index)}>
        {columns && <><strong>{available ? percent(part.value).toFixed(1) + "%" : "—"}</strong><span className="distribution-column-track"><i /></span><small>{part.label}</small></>}
      </button>)}
    </div>
    <div className="distribution-table">
      {parts.map((part,index) => <button type="button" key={part.label} disabled={!available} className={active === index ? "is-active" : ""}
        onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} onClick={() => setActive(active === index ? null : index)}>
        <span><i style={{background:part.color}} />{part.label}</span><strong><LiveNumber value={available ? part.value : null} format={compact}/><small> OINK</small></strong><em>{available ? percent(part.value).toFixed(1) + "%" : "—"}</em>
      </button>)}
    </div>
  </article>;
}

export function ParticipationSnapshot({ onFarmCount }: { onFarmCount?: (count: number | null) => void } = {}) {
  const [snapshot,setSnapshot] = useState<ParticipationDisplay | null>(() => retainedParticipation);
  const [failed,setFailed] = useState(false);
  const [now,setNow] = useState(Date.now());
  useEffect(() => {
    let active = true;
    let timer:ReturnType<typeof setTimeout>;
    let controller:AbortController;
    let running = false;
    async function load() {
      if (!active || running) return;
      if (document.visibilityState !== "visible") { timer = setTimeout(load,30000); return; }
      running = true;
      let delay = 30000;
      controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(),45000);
      const signal = controller.signal;
      try {
        const read = async () => {
          await waitForForegroundDisplayReads(signal);
          const rpc = await getPublicProvider();
          if (BigInt(await rpc.send("eth_chainId",[])) !== 369n) throw Error("Wrong chain");
          const block = await rpc.getBlock("latest");
          if (!block?.hash || snapshotIsStale(block.timestamp,Date.now()) || block.timestamp * 1000 - Date.now() > 30000) throw Error("Fresh block unavailable");
          const runner = snapshotRunner(rpc,block.number,signal);
          const consensus = new Contract(address(GOVERNANCE_CONTRACTS,"consensus"),["function governorCount() view returns(uint256)","function totalDTXStaked() view returns(uint256)"],runner);
          const senate = new Contract(address(CORE_CONTRACTS,"senate"),["function senatorCount() view returns(uint256)"],runner);
          const chef = new Contract(address(CORE_CONTRACTS,"inflation"),["function poolLength() view returns(uint256)","function poolInfo(uint256) view returns(uint256,uint256,address)","function totalAllocPoint() view returns(uint256)"],runner);
          const pools = (async () => {
            const length = await chef.poolLength();
            if (length > 50n) throw Error("Registry exceeds scan limit");
            return Promise.all(Array.from({length:Number(length)},(_,index) => chef.poolInfo(index)));
          })();
          const miners = TIME_MINER_CONTRACTS.map(row => new Contract(row.address,["function balanceOf() view returns(uint256)","function totalShares() view returns(uint256)"],runner));
          const token = new Contract(OINK_TOKEN,["function balanceOf(address) view returns(uint256)","function totalSupply() view returns(uint256)"],runner);
          const tokenBalances = TIME_MINER_CONTRACTS.map(row => token.balanceOf(row.address) as Promise<bigint>);
          const minerBalances = await Promise.allSettled(miners.map(miner => miner.balanceOf().then(formatEther)));
          const sum = async (method:string) => formatEther((await Promise.all(miners.map(miner => miner[method]()))).reduce((a:bigint,b:bigint) => a + b,0n));
          const supplyMining = await Promise.all(tokenBalances).then(rows => formatEther(rows.reduce((sum, value) => sum + value, 0n))).catch(() => null);
          const hex = new Contract(address(ECOSYSTEM_MINER_CONTRACTS,"t-share"),["function totalTshares() view returns(uint256)"],runner);
          const values = await Promise.allSettled([
            consensus.governorCount().then(String), senate.senatorCount().then(String),
            pools.then(rows => String(rows.length)),
            pools.then(rows => String(rows.filter(row => row[0] > 0n).length)),
            pools.then(rows => String(rows.filter(row => isNftDashboardPool(row[2])).length)),
            sum("balanceOf"), consensus.totalDTXStaked().then(formatEther), sum("totalShares"),
            hex.totalTshares().then((total:bigint) => tShareAmounts(total).registeredPoolShares),
            token.balanceOf(LINKS.dexscreener.split("/").at(-1)!).then(formatEther),
          ]);
          const supply = await token.totalSupply().then(formatEther).catch(() => null);
          const [minerAprs,poolRows] = await Promise.all([
            Promise.allSettled(MINER_PREVIEW_SPECS.map(miner => readMinerYield(miner.id,runner,rpc,block.number,block.timestamp))),
            pools,
          ]);
          const allocation = rewardAllocation(poolRows.map(row => ({ address: String(row[2]), points: BigInt(row[0]) })), await chef.totalAllocPoint());
          signal.throwIfAborted();
          if ((await rpc.getBlock(block.number))?.hash !== block.hash) throw Error("Block changed");
          return {block:block.number,timestamp:block.timestamp,values:values.map(value => value.status === "fulfilled" ? value.value as string : null),supply,supplyMining,allocations:allocation.active,allocationRows:allocation.rows,minerAprs:MINER_PREVIEW_SPECS.map((miner,index)=>({label:miner.label,apr:minerAprs[index].status==="fulfilled"?minerAprs[index].value.apr:null,color:palette[index] ?? palette[0]})),minerBalances:TIME_MINER_CONTRACTS.map((miner,index)=>({label:miner.label,balance:minerBalances[index].status==="fulfilled"?minerBalances[index].value:null}))};
        };
        const result = await Promise.race([read(),new Promise<never>((_,reject) => signal.addEventListener("abort",() => reject(Error("Read timed out")),{once:true}))]);
        if (active) {
          retainedParticipation = retainParticipation(result,retainedParticipation);
          setSnapshot(retainedParticipation); setNow(Date.now()); setFailed(false);
          if (retainedParticipation.retained || result.values.some(value => value == null)) delay = 10000;
        }
      } catch { if (active) setFailed(true); delay = 10000; }
      finally { clearTimeout(deadline); running = false; if (active) timer = setTimeout(load,delay); }
    }
    const refresh = () => { if (!running) { clearTimeout(timer); void load(); } };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange",visible);
    void load();
    const clock = setInterval(() => setNow(Date.now()),15000);
    return () => { active = false; controller?.abort(); clearTimeout(timer); clearInterval(clock); document.removeEventListener("visibilitychange",visible); };
  },[]);
  const fresh = snapshot && !snapshotIsStale(snapshot.timestamp,now);
  const farmCount = snapshot ? farmCountFromRegistry(snapshot.allocationRows) : null;
  useEffect(() => { onFarmCount?.(farmCount); }, [farmCount, onFarmCount]);
  const lockedMining = snapshot ? num(snapshot.supplyMining) : 0;
  const liquidity = snapshot ? num(snapshot.values[9]) : 0;
  const totalSupply = snapshot ? num(snapshot.supply) : 0;
  const supplyAvailable = !!snapshot && coherentSupply(snapshot);
  const minersAvailable = !!snapshot && snapshot.minerBalances.every(row => row.balance != null);
  const liquid = Math.max(0,totalSupply - lockedMining - liquidity);
  const supplyParts = [
    {label:"Miner contracts",value:lockedMining,color:palette[0]},
    {label:"Other accounts",value:liquid,color:palette[1]},
    {label:"Liquidity pair",value:liquidity,color:palette[2]},
  ];
  const minerParts = TIME_MINER_CONTRACTS.map((row,index)=>({label:row.label,value:num(snapshot?.minerBalances[index]?.balance),color:palette[index] ?? palette[0]}));
  const miningRows = MINER_PREVIEW_SPECS.map((row,index)=>({label:row.label,apr:snapshot?.minerAprs[index]?.apr ?? null,balance:snapshot?.minerBalances[index]?.balance ?? null,color:palette[index] ?? palette[0]}));
  return <section className="dashboard-participation" aria-labelledby="participation-heading">
    <div className="dashboard-section-heading">
      <span id="participation-heading" className="page-kicker">Protocol distribution</span>
      <h2>Supply, rewards and miner weight</h2>
    </div>
    <div className="protocol-distribution-grid">
      <article className="reference-panel reward-info-card allocation-wide" aria-busy={!snapshot}>
        <div className="info-heading"><h3>Piggy Bank reward allocation</h3><InfoTooltip label="About Piggy Bank reward allocation"><p>Each percentage is a pool's allocation points divided by total protocol allocation points. It shows how OINK emissions are shared among pools.</p><p>These are protocol reward weights, rather than guaranteed returns or your wallet's share. Your rewards also depend on the pool's balance and your position.</p></InfoTooltip></div>
        <p className="dashboard-context-line">{!snapshot ? "Reading protocol emission allocation…" : fresh && !failed ? "Current protocol emission allocation." : "Last known protocol emission allocation."}</p>
        <div className="allocation-bar" aria-label="Current reward allocation">{snapshot?.allocations.map(row => <div key={row.id} style={{flexGrow:row.percent,background:row.color}} title={`${row.label}: ${row.percent}%`} tabIndex={0} aria-label={`${row.label}: ${row.percent}%`} />)}</div>
        <div className="allocation-viewport" role="region" aria-label="Reward allocation by pool" tabIndex={0}>
          <div className="allocation-breakdown">{snapshot ? snapshot.allocations.map(row=><div key={row.id}><img src={assetUrl(allocationLogo(row.label))} alt="" /><span>{row.label}</span><strong>{row.percent.toLocaleString(undefined,{maximumFractionDigits:4})}%</strong></div>) : ["OINK miners",...ECOSYSTEM_MINER_CONTRACTS.map(row=>row.label + " miners")].map(label=><div key={label}><img src={assetUrl(allocationLogo(label))} alt="" /><span>{label}</span><strong>—</strong></div>)}</div>
          {snapshot && !snapshot.allocations.length && <p>No pools currently have reward allocation.</p>}
        </div>
        <details className="allocation-registry"><summary aria-disabled={!snapshot} onClick={event => { if (!snapshot) event.preventDefault(); }}>{snapshot ? `All ${snapshot.allocationRows.length} registered pools · including inactive pools` : "All registered pools · awaiting registry"}</summary><div className="allocation-breakdown">{snapshot?.allocationRows.map(row => <div key={row.id}><span><a href={LINKS.scan(row.address)} target="_blank" rel="noreferrer">{row.label}</a>{row.points === "0" ? " · inactive" : ""}</span><strong>{row.percent.toLocaleString(undefined,{maximumFractionDigits:4})}%</strong></div>)}</div></details>
      </article>
      <MiningComparison rows={miningRows} />
      <DistributionChart title="OINK supply by location" parts={supplyParts} total={totalSupply} available={supplyAvailable} />
      <DistributionChart title="Miners by lock-up" parts={minerParts} total={minerParts.reduce((sum, part) => sum + part.value, 0)} columns available={minersAvailable} />
    </div>
    <div className="participation-stats">{metrics.map(([label,description],index) => {
      const value = snapshot?.values[index] ?? null;
      return <div className="reference-stat" key={label}>{metricHelp[label] ? <span className="stat-token-label info-label"><StatTokenLabel label={label} /><InfoTooltip label={"About " + label}><p>{metricHelp[label]}</p></InfoTooltip></span> : <StatTokenLabel label={label} />}<strong title={value ?? "Unavailable"}><LiveNumber value={value} format={compact}/></strong><small>{description}</small></div>;
    })}</div>
    <p className="snapshot-note participation-read-status" role="status">{snapshot?.values.some(value => value == null) ? "Some values have not loaded yet. Previously confirmed values stay visible while the connection recovers." : !snapshot ? "Reading public protocol values…" : ""}</p>
  </section>;
}
