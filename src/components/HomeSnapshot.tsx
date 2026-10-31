import { StatTokenLabel } from "./StatTokenLabel";
import { useCallback, useEffect, useState } from "react";
import { Contract, formatEther, formatUnits } from "ethers";
import { OINK_TOKEN, TREASURY_WALLET, TIME_MINER_CONTRACTS } from "../config/contracts";
import { NFT_PROJECTS } from "../config/nftProjects";
import { getPublicProvider } from "../lib/chain";
import { snapshotRunner, snapshotIsStale } from "../lib/governanceReadSafety";
import { displayFarmAmount } from "../lib/farmDisplay";
import { usePageLoadStatus } from "./PageLoadBoundary";
import { LiveNumber } from "./LiveNumber";
import { InfoTooltip } from "./InfoTooltip";
import { beginForegroundDisplayRead } from "../lib/displayReadPriority";
import { readPublicRefreshDisplay, savePublicRefreshDisplay, publicDisplayRecord, publicDisplayAmount } from "../lib/publicRefreshDisplay";
const snapshotHelp: Record<string, string> = {
  "OINK supply": "OINK tokens already issued on-chain. This is different from virtual supply, which also includes protocol accounting credit, and from the amount currently trading in the market.",
  "Treasury OINK": "OINK held directly by the published treasury wallet. Miner balances, other protocol accounts and deployed treasury farming positions are separate categories.",
  "Treasury PLS": "Native PLS held directly by the published treasury wallet. PLS deployed in liquidity or farming positions is shown separately below.",
  "Miner durations": "The six listed OINK time-miner contracts. This counts available lock durations, rather than the number of positions created by users.",
  "Listed farms": "Published ecosystem farm listings plus additional farms identified in the current reward registry, including inactive listings. The full registered-pool count also includes time miners and other protocol participants, so the counts can differ.",
  "NFT projects": "NFT projects linked from this interface. This counts project dashboards, rather than NFTs minted, holders or on-chain reward pools.",
};
type HomePublicSnapshot = { supply:string;oink:string;pls:string;block:number;timestamp:number };
let lastHomeSnapshot: HomePublicSnapshot | null = readPublicRefreshDisplay("home", (value): value is HomePublicSnapshot =>
  publicDisplayRecord(value) && [value.supply, value.oink, value.pls].every(publicDisplayAmount)
  && Number.isSafeInteger(value.block) && value.block > 0 && Number.isFinite(value.timestamp) && value.timestamp > 0);
export function HomeSnapshot({ farmCount }: { farmCount: number | null }) {
  const [data, setData] = useState<HomePublicSnapshot | null>(lastHomeSnapshot);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const retry = useCallback(() => setRefresh(value => value + 1), []);
  usePageLoadStatus("home-snapshot", data != null, failed && !data ? "Public balances are unavailable. Retry to load the home page." : null, retry);
  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let deadline: number | undefined;
    let abort: AbortController | undefined;
    const load = async () => {
      if (document.hidden) { if (active) timer = window.setTimeout(load,25000); return; }
      if (active) setFailed(false);
      const controller = new AbortController();
      abort = controller;
      const releasePriority = beginForegroundDisplayRead(controller.signal);
      try {
        const read = async () => {
          const rpc = await getPublicProvider();
          controller.signal.throwIfAborted();
          if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw new Error("Wrong chain");
          const block = await rpc.getBlock("latest");
          controller.signal.throwIfAborted();
          if (!block?.hash || snapshotIsStale(block.timestamp, Date.now()) || block.timestamp * 1000 > Date.now() + 30000) throw new Error("Current block unavailable");
          const c = new Contract(OINK_TOKEN, ["function totalSupply() view returns(uint256)", "function decimals() view returns(uint8)", "function balanceOf(address) view returns(uint256)"], snapshotRunner(rpc, block.number, controller.signal));
          const [supply, oink, decimals, pls] = await Promise.all([c.totalSupply(), c.balanceOf(TREASURY_WALLET), c.decimals(), rpc.getBalance(TREASURY_WALLET, block.number)]);
          controller.signal.throwIfAborted();
          if ((await rpc.getBlock(block.number))?.hash !== block.hash) throw new Error("Block changed");
          return { supply: formatUnits(supply, decimals), oink: formatUnits(oink, decimals), pls: formatEther(pls), block: block.number, timestamp: block.timestamp };
        };
        const snapshot = await Promise.race([read(), new Promise<never>((_, reject) => {
          deadline = window.setTimeout(() => { controller.abort(); reject(new Error("Snapshot read timed out")); }, 45000);
        })]);
        if (active) { lastHomeSnapshot = snapshot; savePublicRefreshDisplay("home", snapshot, snapshot.timestamp * 1000); setData(snapshot); setFailed(false); }
      } catch { if (active) setFailed(true); }
      finally { releasePriority(); window.clearTimeout(deadline); if (active) timer = window.setTimeout(load, 25000); }
    };
    void load();
    return () => { active = false; abort?.abort(); window.clearTimeout(deadline); window.clearTimeout(timer); };
  }, [refresh]);
  return <section className="snapshot-panel" aria-label="Protocol statistics"><div className="dashboard-stats">{[["OINK supply", data?.supply, "Current total supply"], ["Treasury OINK", data?.oink, "Listed treasury wallet"], ["Treasury PLS", data?.pls, "Listed treasury wallet"], ["Miner durations", String(TIME_MINER_CONTRACTS.length), "Listed time-miner contracts"], ["Listed farms", farmCount == null ? undefined : String(farmCount), "Listed ecosystem farms"], ["NFT projects", String(NFT_PROJECTS.length), "Linked project dashboards"]].map(([label, value, detail]) => <div className="reference-stat" key={label}><span className="stat-token-label info-label"><StatTokenLabel label={label} /><InfoTooltip label={"About " + label}><p>{snapshotHelp[label!]}</p></InfoTooltip></span><strong aria-description={value}><LiveNumber value={value} format={raw => Number(raw) >= 1000000 ? new Intl.NumberFormat("en", { notation:"compact", maximumFractionDigits:2 }).format(Number(raw)) : displayFarmAmount(raw)} placeholder={label === "Listed farms" ? "Loading…" : "—"}/></strong><small>{detail}</small></div>)}</div></section>;
}
