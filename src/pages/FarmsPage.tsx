import { isNftDashboardPool } from "../components/NftDashboardCard";
import { HexShareManager } from "../components/HexShareManager";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FarmInsightPopover, FarmShareHistory } from "../components/FarmInsights";
import { FarmExitPreview } from "../components/PositionActionPreview";
import { FarmDepositActions } from "../components/FarmDepositActions";
import { useWallet } from "../components/WalletProvider";
import { getFarmWriteSpec, replaceDiscoveredFarmSpecs } from "../lib/farmCatalog";
import { DiscoveredPoolCard } from "../components/DiscoveredPoolCard";
import { loadFarmSnapshot, peekFarmSnapshot, type FarmSnapshot, type FarmDisplaySnapshot } from "../lib/farmSnapshot";
import { displayFarmAmount, sumFarmAmounts, summarizeFarmWallet, farmWalletPositions } from "../lib/farmDisplay";
import { farmAgeLabel, readFarmCreation } from "../lib/farmAge";
import { decimalAmount, projectedReward } from "../lib/farmInsights";
import { snapshotIsStale } from "../lib/governanceReadSafety";
import { beginForegroundDisplayRead } from "../lib/displayReadPriority";
import { ECOSYSTEM_MINER_CONTRACTS, explorerUrl } from "../config/contracts";
import "./farms-layout.css";
import { freshFarmPrice, displayFee, type FarmPrices } from "../lib/farmPrices";
import { farmRankings, displayRankValue, focusRankedFarm, type FarmRankMetrics, type FarmRankKey } from "../lib/farmRankings";
import { assetUrl } from "../lib/assets";
import { LINKS } from "../config/links";
import { useSavedPreference } from "../lib/useSavedPreference";
import { compareFarms, FARM_SORTS, farmStakedValue, type FarmSort } from "../lib/farmPortfolio";
import { farmQuickAmount, type FarmQuickBalance } from "../lib/farmQuickAmounts";
import { LegacyFarmNotice } from "../components/LegacyFarmNotice";
import { legacyFarmSupport } from "../config/legacyFarmSupport";
import { InfoTooltip } from "../components/InfoTooltip";

type Snapshot = FarmSnapshot;
type Farm = Omit<Snapshot["rows"][number], "error"> & { error: string | null };
type FarmIconName = "star" | "grid" | "list" | "lock" | "search";
const LOCKED_REASON = "Use Claim on an individual farm position. Batch claims are not enabled.";
const LOGOS: Record<string, string> = { "t-share": "hex", communitas: "com" };

function FarmIcon({ name }: { name: FarmIconName }) {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "star" && <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />}
    {name === "grid" && <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>}
    {name === "list" && <path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01" />}
    {name === "lock" && <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>}
    {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>}
  </svg>;
}
function FarmLogo({ id, logoId }: { id: string; logoId?: string }) {
  const asset = logoId ?? id;
  return <img className="bfc-token-logo" src={assetUrl(asset === "treasury" || asset.startsWith("registry-") ? "img/apple-touch-icon.png" : "img/farms/" + (LOGOS[asset] ?? asset) + ".png")} alt="" loading="lazy" />;
}
function Metric({ label, value, detail, exact, accent = false }: { label: ReactNode; value: ReactNode; detail: ReactNode; exact?: string; accent?: boolean }) {
  return <div className="bfc-stat-cell"><span className="bfc-stat-label">{label}</span><strong className={"bfc-stat-val" + (accent ? " bfc-stat-accent" : "")} title={exact}>{value}</strong><span className="bfc-stat-sub">{detail}</span></div>;
}
function FarmEmissionSplit({ rows, loading }: { rows: Farm[]; loading: boolean }) {
  // Keep the known pool rows in their directory order while their reads arrive.
  const emissionRows = rows.map((row) => {
    const estimate = row.data?.yieldEstimate ?? row.special?.yieldEstimate ?? null;
    const allocation = estimate ? Number(estimate.allocation) : null;
    return {
      id: row.id,
      label: row.label,
      logoId: row.discovery?.logoId,
      pool: row.data?.pool ?? row.special?.pool ?? row.discovery?.poolId ?? "",
      symbol: row.data?.symbol ?? (row.id === "t-share" ? "T-Shares" : row.label),
      balance: row.data?.balance ?? row.special?.totalShares ?? null,
      daily: estimate?.dailyPool ?? null,
      allocation: allocation != null && Number.isFinite(allocation) && allocation >= 0 ? allocation : null,
    };
  });
  const hasAllocation = emissionRows.some(row => row.allocation != null);
  const totalAllocation = emissionRows.reduce((sum, row) => sum + (row.allocation ?? 0), 0);
  const topAllocation = Math.max(1, ...emissionRows.map((row) => row.allocation ?? 0));
  return <section className="farm-emission-split" aria-labelledby="farm-emission-title">
    <header>
      <div>
        <h2 id="farm-emission-title">Emission split <InfoTooltip label="About farm emission split">Allocation is each pool's share of protocol rewards at the displayed block. It describes rewards for the whole pool; your earnings also depend on your position's share and the payout destination you choose.</InfoTooltip></h2>
        <p>OINK farm rewards are divided by live pool allocation. Longer bars receive a larger share of each farm emission cycle.</p>
      </div>
      <div className="farm-emission-total"><strong>{hasAllocation ? totalAllocation.toFixed(1) + "%" : "—"}</strong><span>loaded allocation</span></div>
    </header>
    <div className="farm-emission-list" role="region" aria-label="Pool emission split, scroll for more pools" tabIndex={0}>
      {emissionRows.map((row) => <article className="farm-emission-row" key={row.id}>
        <div className="farm-emission-label"><FarmLogo id={row.id} logoId={row.logoId} /><strong>{row.label}</strong>{row.pool && <span>#{row.pool}</span>}</div>
        <div className="farm-emission-bar" aria-label={row.label + (row.allocation == null ? " allocation unavailable" : " allocation " + row.allocation.toFixed(1) + "%")}><span style={{ width: (row.allocation == null || row.allocation === 0 ? 0 : Math.max(5, row.allocation / topAllocation * 100)) + "%" }} /></div>
        <strong className="farm-emission-percent">{row.allocation == null ? "—" : row.allocation.toFixed(1) + "%"}</strong>
        <dl>
          <div><dt>Pool balance</dt><dd title={row.balance ?? undefined}>{row.balance == null ? "—" : displayFarmAmount(row.balance)} {row.symbol}</dd></div>
          <div><dt>Daily rewards</dt><dd title={row.daily ?? undefined}>{row.daily == null ? "—" : displayFarmAmount(row.daily)} OINK</dd></div>
        </dl>
      </article>)}
      {!emissionRows.length && <p className="farm-emission-empty">{loading ? "Loading emission split…" : "Emission allocation unavailable from the current farm reads."}</p>}
    </div>
  </section>;
}
function FarmAge({ row }: { row: Farm }) {
  const [creation, setCreation] = useState<{ timestamp: string | null; block: number | null } | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setCreation(null);
    readFarmCreation(row.address, controller.signal)
      .then(value => { if (active) setCreation(value ? { timestamp: value.timestamp, block: value.block } : null); })
      .catch(() => { if (active) setCreation(null); });
    return () => { active = false; controller.abort(); };
  }, [row.address]);
  const label = creation?.timestamp ? farmAgeLabel(creation.timestamp) : null;
  const block = creation?.block ?? null;
  const verifiedAt = row.discovery?.writeSpec?.verifiedAt;
  if (label) return <span className="bfc-age" title={block ? "Creation block " + block.toLocaleString() : undefined}>{label}</span>;
  if (verifiedAt) return <span className="bfc-age">Registry verified {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(verifiedAt))}</span>;
  return <span className="bfc-age">Original farm · pool #{row.data?.pool ?? row.special?.pool ?? row.discovery?.poolId ?? "..."}</span>;
}
function FarmCard({ row, hasWallet, loading, favorite, onFavorite, onConfirmed, timestamp, snapshotAccount, prices, metrics, highlighted }: {
  metrics: FarmRankMetrics; highlighted: boolean;
  prices: FarmPrices; timestamp: number | null; snapshotAccount: string | null; row: Farm; hasWallet: boolean; loading: boolean; favorite: boolean; onFavorite: () => void; onConfirmed: () => void;
}) {
  const wallet = useWallet();
  const [maxRequest, setMaxRequest] = useState<{value:string;account:string;revision:number}>();
  const [showPositions, setShowPositions] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const data = row.data;
  const nativeAsset = row.id === "pls" || row.discovery?.readSpec?.tokenAddress === null;
  const positions = data && !data.accountError ? data.positions : null;
  const staked = positions ? sumFarmAmounts(positions.map((position) => position.amount)) : null;
  const pending = positions ? sumFarmAmounts(positions.map((position) => position.pending)) : null;
  const assetQuote = prices[row.id as keyof FarmPrices];
  const liveAssetPrice = freshFarmPrice(assetQuote);
  const liveRewardPrice = freshFarmPrice(prices.oink);
  const freshSnapshot = timestamp != null && Date.now() >= timestamp * 1000 && !snapshotIsStale(timestamp, Date.now());
  const usdValue = (amount: string | null, price: string) => {
    const tokens = freshSnapshot ? decimalAmount(amount) : null;
    const quote = decimalAmount(price);
    return tokens != null && quote != null && quote > 0n
      ? displayRankValue(tokens * quote / 10n ** 18n, "rewards")
      : "— USD";
  };
  const poolRewardsUsd = usdValue(data?.rewardCredit ?? null, liveRewardPrice);
  const effectiveAssetPrice = liveAssetPrice;
  const effectiveRewardPrice = liveRewardPrice;
  const insightValues = { estimate: timestamp && Date.now() - timestamp * 1000 <= 120000 ? data?.yieldEstimate ?? null : null, stake: staked, pool: data?.balance ?? "0", symbol: data?.symbol ?? row.label, assetPrice:effectiveAssetPrice, rewardPrice:effectiveRewardPrice };
  const writeSpec = getFarmWriteSpec(row.id);
  const legacySupport = legacyFarmSupport(row.id);
  const observedSpec = row.discovery?.readSpec ?? writeSpec;
  const balanceSnapshot: FarmQuickBalance | undefined = data?.walletBalance != null && timestamp != null && snapshotAccount && observedSpec
    ? {balance:data.walletBalance,account:snapshotAccount,timestamp,farmAddress:row.address,tokenAddress:data.tokenAddress,decimals:observedSpec.decimals} : undefined;
  const canMax = farmQuickAmount(100,balanceSnapshot,wallet,writeSpec) != null;
  const unavailable = hasWallet ? loading ? "Reading wallet…" : "Read unavailable" : "Connect your wallet";
  return <article id={"farm-card-" + row.id} tabIndex={-1} className={"browse-farm-card" + (highlighted ? " farm-rank-target" : "")} aria-labelledby={"farm-" + row.id}>
    <div className="bfc-head">
      <FarmLogo id={row.id} logoId={row.discovery?.logoId} />
      <div className="bfc-identity"><h2 className="bfc-name" id={"farm-" + row.id}>{row.label} <button className="farm-copy-icon" type="button" title={copied ? "Copied!" : "Copy contract address"} aria-label={copied ? row.label + " contract address copied" : "Copy " + row.label + " contract address"} onClick={() => { navigator.clipboard.writeText(row.address).then(() => setCopied(true)).catch(() => setCopied(false)); }}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{copied ? <path d="m5 12 4 4L19 6" /> : <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4" /></>}</svg></button></h2><span className="bfc-sub">{nativeAsset ? "Native asset" : row.id === "t-share" ? "HEX T-Share" : row.id === "treasury" ? "Protocol-owned" : "Single asset"} <span>· Earn OINK</span></span><FarmAge row={row} /></div>
      <button type="button" className={"farm-icon-button" + (favorite ? " is-active" : "")} aria-label={(favorite ? "Unfavorite " : "Favorite ") + row.label} aria-pressed={favorite} onClick={onFavorite}><FarmIcon name="star" /></button>
    </div>
    <div className="bfc-card-tools"><a className="bfc-contract-btn" href={explorerUrl(row.address)} target="_blank" rel="noreferrer">View contract <span aria-hidden="true">↗</span></a></div>
    {row.discovery && <p className="farm-discovery-note">{row.discovery.allocPoint === "0" ? "No rewards allocated yet" : "Added from the OINK pool registry"}</p>}
    <div className="bfc-stats-grid bfc-stats-top">
      <Metric label="APR" value={<FarmInsightPopover mode="apr" values={insightValues} />} detail={effectiveAssetPrice && effectiveRewardPrice ? null : "Awaiting market prices"} />
      <div className="bfc-stat-cell bfc-fees"><span className="bfc-stat-label">Fees <InfoTooltip label="About farm fees">The deposit fee is deducted once when you stake. Funding charges accrue in whole hours and reduce the asset recorded in your position when collected. Each collection is capped at 20% of that position. Current fee settings are checked before your wallet opens.</InfoTooltip></span><dl><div><dt title="One-time fee deducted when depositing">Deposit</dt><dd>{data ? displayFee(data.fee) + "%" : "—"}</dd></div><div><dt title="Ongoing funding deducted from your staked asset">Funding / hour</dt><dd>{data ? displayFee(data.funding) + "%" : "—"}</dd></div></dl></div>
    </div>
    <div className="bfc-stats-grid bfc-main-stats">
      <Metric label="Balance" value={<>{data?.walletBalance != null ? displayFarmAmount(data.walletBalance) : "—"} <button className="farm-inline-control" type="button" aria-label={"Use maximum " + row.label + " wallet balance"} disabled={!canMax} title={nativeAsset ? "Enter PLS manually to leave gas for this and future transactions." : "Fill the exact wallet balance; no approval or transaction is sent."} onClick={() => setMaxRequest({ value:data!.walletBalance!, account:wallet.account!, revision:(maxRequest?.revision ?? 0) + 1 })}>[MAX]</button></>} exact={data?.walletBalance ?? undefined} detail={data?.walletBalance != null ? data.symbol + " in wallet" : unavailable} />
      <Metric label="Remaining rewards" value={data ? displayFarmAmount(data.rewardCredit) : "—"} exact={data?.rewardCredit} detail={<span className="bfc-token-caption"><img src={assetUrl("img/apple-touch-icon.png")} alt="OINK" /> {poolRewardsUsd}</span>} />
      <Metric label={<><span>{legacySupport ? "Recorded stake" : "Staked"}</span> <button type="button" className="farm-inline-control" aria-expanded={showPositions} aria-controls={"positions-" + row.id} onClick={() => setShowPositions((value) => !value)}>{showPositions ? "[-]" : "[+]"}</button></>} value={<>{staked != null ? displayFarmAmount(staked) : "—"}<FarmExitPreview farmId={row.id} positions={positions} kind="withdraw" compact /></>} exact={staked ?? undefined} detail={<span className="bfc-staked-detail"><span>{positions ? usdValue(staked, liveAssetPrice) : unavailable}</span><FarmShareHistory account={wallet.account} farm={row.id} stake={staked} pool={data?.balance ?? "0"} timestamp={timestamp} verified={!!data?.yieldEstimate} /></span>} />
      <Metric label="Rewards" value={<><img src={assetUrl("img/apple-touch-icon.png")} alt="OINK" /><span>{pending != null ? displayFarmAmount(pending) : "—"} OINK</span><FarmInsightPopover mode="rewards" values={insightValues} /></>} exact={pending ?? undefined} detail={pending != null ? <span className="bfc-rewards-usd">{usdValue(pending, liveRewardPrice)}</span> : unavailable} />
    </div>

    {showPositions && <section className="farm-card-positions" id={"positions-" + row.id}>
      <div className="bfc-stats-grid">
        <Metric label={<><FarmLogo id={row.id} logoId={row.discovery?.logoId} /> {data?.symbol ?? row.label}</>} value={staked == null ? "—" : displayFarmAmount(staked)} detail="Recorded stake · single asset" />
        <Metric label={<><img src={assetUrl("img/apple-touch-icon.png")} alt="" /> OINK</>} value={pending == null ? "—" : displayFarmAmount(pending)} detail="Gross pending rewards" />
      </div>
    </section>}
    <FarmDepositActions farmId={row.id} onConfirmed={onConfirmed} maxRequest={maxRequest} balanceSnapshot={balanceSnapshot}
      claimControl={<FarmExitPreview farmId={row.id} positions={positions} kind="claim" />}
      unstakeControl={<FarmExitPreview farmId={row.id} positions={positions} kind="withdraw" />} />
    {legacySupport && !writeSpec ? <LegacyFarmNotice farmId={row.id} /> : !row.discovery && !writeSpec && <div className="farm-original-actions"><span>Local transactions for this farm are not enabled yet.</span></div>}
    <div className="bfc-footer">
      <div><span>Pool balance</span><strong title={data?.balance}>{data ? displayFarmAmount(data.balance) : "—"}</strong><span>{data?.symbol ?? row.label}</span></div>
      <div><span>TVL</span><strong>{metrics.tvl == null ? loading ? "Loading…" : "—" : displayRankValue(metrics.tvl, "tvl")}</strong><span className="bfc-pool-id">{data ? "#" + data.pool : loading ? "Loading" : "No data"}</span></div>
    </div>
  </article>;
}

function FarmCardRouter(props: Parameters<typeof FarmCard>[0]) {
  if (props.row.discovery && (!props.row.data || !props.row.discovery.readSpec)) return <DiscoveredPoolCard pool={props.row.discovery} error={props.row.error} favorite={props.favorite} onFavorite={props.onFavorite} highlighted={props.highlighted} />;
  return ["t-share","treasury"].includes(props.row.id) ? <SpecialFarmCard {...props} /> : <FarmCard {...props} />;
}
function SpecialFarmCard({row,prices,metrics,timestamp,loading,hasWallet,favorite,onFavorite,highlighted}:Parameters<typeof FarmCard>[0]) {
  const data=row.special;
  const isShares=row.id==="t-share";
  const fresh=timestamp!=null && Date.now()>=timestamp*1000 && Date.now()-timestamp*1000<=120000;
  const emission=fresh?data?.yieldEstimate:null;
  const daily=emission?.dailyPool;
  const rewardPrice=freshFarmPrice(prices.oink);
  const usd=(value:string|undefined|null)=>{
    const amount=decimalAmount(value??null),price=decimalAmount(rewardPrice);
    return amount!=null&&price!=null&&price>0n?displayRankValue(amount*price/10n**18n,"rewards"):"— USD";
  };
  const perShare=daily&&data?.totalShares?projectedReward(daily,"1",data.totalShares,1n):null;
  const projectionValues={estimate:emission??null,stake:data?.registeredShares??null,pool:data?.totalShares??"0",symbol:"T-Shares",assetPrice:"",rewardPrice};
  const empty=loading?"Loading…":hasWallet?"Unavailable":"Connect wallet";
  return <article id={"farm-card-"+row.id} tabIndex={-1} className={"browse-farm-card"+(highlighted?" farm-rank-target":"")} aria-labelledby={"farm-"+row.id}>
    <div className="bfc-head"><FarmLogo id={row.id}/><div className="bfc-identity"><h2 className="bfc-name" id={"farm-"+row.id}>{row.label}</h2><span className="bfc-sub">{isShares?"HEX share rewards":"Protocol treasury"} · Earn OINK</span><FarmAge row={row} /></div><button type="button" className="farm-icon-button" aria-label={(favorite?"Unfavorite ":"Favorite ")+row.label} aria-pressed={favorite} onClick={onFavorite}><FarmIcon name="star"/></button></div>
    <div className="bfc-card-tools"><a className="bfc-contract-btn" href={explorerUrl(row.address)} target="_blank" rel="noreferrer">View contract ↗</a></div>
    <div className="bfc-stats-grid bfc-stats-top">
      <Metric label={isShares?"Daily / T-Share":"Daily rewards"} value={(isShares?perShare:daily)!=null?displayFarmAmount((isShares?perShare:daily)!)+" OINK":"—"} detail={usd(isShares?perShare:daily)} />
      <Metric label="Allocation" value={emission?emission.allocation+"%":"—"} detail="Pool reward share" />
    </div>
    <div className="bfc-stats-grid bfc-main-stats">
      <Metric label={isShares?"Registered pool shares":"Pending treasury rewards"} value={data?displayFarmAmount(isShares?data.registeredPoolShares!:data.rewardCredit)+(isShares?"":" OINK"):"—"} detail={isShares?"T-Shares · held in HEX":usd(data?.rewardCredit)} />
      <Metric label="Annual rewards" value={metrics.rewards==null?"—":displayRankValue(metrics.rewards,"rewards")} detail="Gross pool emissions" />
      {isShares ? <>
        <Metric label="Your registered shares" value={data?.registeredShares!=null?displayFarmAmount(data.registeredShares):"—"} detail={data?.registeredShares!=null?"T-Shares":empty} />
        <Metric label="Your rewards" value={<>{data?.pending!=null?displayFarmAmount(data.pending)+" OINK":"—"}<FarmInsightPopover mode="rewards" values={projectionValues}/></>} detail={data?.pending!=null?usd(data.pending):empty} accent />
      </> : <>
        <Metric label="Reward destination" value="Treasury" detail={data?<a href={explorerUrl(data.treasury)} target="_blank" rel="noreferrer">View treasury ↗</a>:"Loading…"}/>
        <Metric label="Wallet deposits" value="Not applicable" detail="Protocol-owned reward stream"/>
      </>}
    </div>
    {isShares && <div className="farm-original-actions"><button type="button" onClick={() => document.getElementById("hex-share-tools")?.scrollIntoView({behavior:"smooth",block:"start"})}>HEX share rewards</button></div>}
    <div className="bfc-footer"><div><span>{isShares?"HEX remains in your stakes":"Rewards go to the protocol"}</span></div><span className="bfc-pool-id">{data?"#"+data.pool:"—"}</span></div>
  </article>;
}

export function FarmsPage() {
  const wallet = useWallet();
  const account = wallet.account ?? "";
  const [loaded, setLoaded] = useState<FarmDisplaySnapshot | null>(() => peekFarmSnapshot(account));
  const storedSnapshot = loaded?.snapshot ?? null;
  const snapshot = (storedSnapshot?.account ?? "").toLowerCase() === account.toLowerCase() ? storedSnapshot : null;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const prices = loaded?.prices ?? {};
  useEffect(()=>{const changed=()=>setRefresh(v=>v+1);window.addEventListener("oink-positions-changed",changed);return()=>window.removeEventListener("oink-positions-changed",changed);},[]);
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useSavedPreference<string>("oink:farms:search", "");
  const [stakedOnly, setStakedOnly] = useSavedPreference<boolean>("oink:farms:staked", false);
  const [favoritesOnly, setFavoritesOnly] = useSavedPreference<boolean>("oink:farms:favorites-only", false);
  const [reward, setReward] = useSavedPreference<string>("oink:farms:reward", "all", ["all", "oink"]);
  const [view, setView] = useSavedPreference<"grid" | "list">("oink:farms:view", "grid", ["grid", "list"]);
  const [sort, setSort] = useSavedPreference<FarmSort>("oink:farms:sort", "default", FARM_SORTS);
  const [farmJump, setFarmJump] = useState<{ id: string } | null>(null);
  useEffect(() => {
    if (!farmJump) return;
    focusRankedFarm(farmJump.id);
    const timer = window.setTimeout(() => setFarmJump(null), 1800);
    return () => window.clearTimeout(timer);
  }, [farmJump]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem("oink-farm-favorites") ?? "[]"); return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []; }
    catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem("oink-farm-favorites", JSON.stringify(favorites)); } catch { /* Favorites still work for this visit when browser storage is unavailable. */ } }, [favorites]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let timer: number | undefined;
    setLoading(true);
    setError("");
    let retryDelay = 60000;
    const releasePriority = beginForegroundDisplayRead(controller.signal);
    const publish = (result: FarmDisplaySnapshot) => {
      if (active) {
        setLoaded(result);
        // Prices fetched during this read must not be compared with the mount-time clock.
        setNow(result.loadedAt);
      }
    };
    loadFarmSnapshot(account, controller.signal, publish).then((result) => {
      if (active) {
        replaceDiscoveredFarmSpecs(result.snapshot.registry?.partial ? [] : result.snapshot.rows.flatMap(row => row.data && !row.error && row.discovery?.writeSpec ? [row.discovery.writeSpec] : []));
        publish(result);
      }
    }).catch((reason) => {
      if (active) { replaceDiscoveredFarmSpecs([]); setError(String(reason.message ?? reason)); retryDelay = 5000; }
    }).finally(() => {
      releasePriority();
      if (active) { setLoading(false); timer = window.setTimeout(() => setRefresh((r) => r + 1), retryDelay); }
    });
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [refresh, account, wallet.chainId]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(timer); }, []);
  const rows: Farm[] = snapshot?.rows ?? ECOSYSTEM_MINER_CONTRACTS.map((record) => ({ ...record, data: null, special:null, error: null, loading: true }));
  const farmRows = rows.filter(row => !isNftDashboardPool(row.address));
  const integratedRows = farmRows.filter(row => !row.discovery || row.discovery.readSpec);
  const awaitingCount = farmRows.length - integratedRows.length;
  const depositFarmCount = integratedRows.filter(row => !["t-share", "treasury"].includes(row.id)).length;
  const coveragePending = !snapshot?.complete || rows.some(row => row.loading);
  const coverageIncomplete = coveragePending || !!snapshot?.discoveryError || !!snapshot?.registry?.partial;
  const displayNow = Math.max(now, loaded?.loadedAt ?? 0);
  const rankings = farmRankings(rows, prices, snapshot?.timestamp ?? null, displayNow);
  const freshWallet = !!account && !!snapshot && now >= snapshot.timestamp * 1000 && !snapshotIsStale(snapshot.timestamp, now);
  const stakedValue = account ? farmStakedValue(integratedRows, prices, snapshot?.timestamp ?? null, displayNow) : null;
  const visible = farmRows.filter((row) => {
    const match = (row.label + " OINK " + (row.data?.symbol ?? "") + " " + row.address + " " + (row.data?.tokenAddress ?? "") + " #" + (row.special?.pool ?? row.data?.pool ?? row.discovery?.poolId ?? "")).toLowerCase().includes(search.toLowerCase().trim());
    return match && (!favoritesOnly || favorites.includes(row.id)) && (!stakedOnly || (account && !!farmWalletPositions(row)?.length));
  }).sort((a, b) => compareFarms(a, b, sort, rankings.metrics, favorites, freshWallet));
  const totals = account && snapshot?.account === account ? summarizeFarmWallet(integratedRows) : null;
  const pendingByFarm = account ? rows.flatMap((row) => {
    const walletPositions=farmWalletPositions(row);
    if (!walletPositions) return [];
    const pending = sumFarmAmounts(walletPositions.map((position) => position.pending));
    return /[1-9]/.test(pending) ? [{ id: row.id, label: row.label, pending }] : [];
  }) : [];
  const clearFilters = () => { setSearch(""); setStakedOnly(false); setFavoritesOnly(false); setReward("all"); setSort("default"); };
  const goToFarm = (id: string) => { clearFilters(); setFarmJump({ id }); };
  const rankColumns: { key: FarmRankKey; title: string; description: string }[] = [
    { key: "apr", title: "Highest APR", description: "Gross annual return at current market prices" },
    { key: "tvl", title: "Highest TVL", description: "Pool asset balance valued at current market prices" },
    { key: "rewards", title: "Highest Rewards", description: "Annual gross pool emissions valued in USD, not remaining or wallet rewards" },
  ];
  const stale = snapshot && snapshotIsStale(snapshot.timestamp, now);
  const readStatus = [error ? "Farm data unavailable. Retrying automatically." : stale ? "Farm data is out of date. Wait for updated values before relying on them." : "", loaded?.priceError, snapshot?.discoveryError ?? (snapshot?.registry?.partial ? "Some registered pools could not be checked. Retrying automatically." : "")].filter(Boolean).join(" ");

  return <main className="app-page oink-farms-page">
    <div className="farms-tvl"><span>{coveragePending ? "Value loaded so far" : !coverageIncomplete && rankings.tvl.length === depositFarmCount ? "Total Value Locked" : "Priced Value Locked"}</span><strong>{rankings.totalTvl == null ? loading ? "Loading…" : "Unavailable" : displayRankValue(rankings.totalTvl, "tvl")}</strong></div>
    <section className="farm-rankings" aria-label="Top farms">
      <div className="farm-rank-grid">{rankColumns.map(({ key, title, description }) => <section className="farm-rank-column" key={key} aria-labelledby={"rank-" + key}>
        <h2 id={"rank-" + key} title={description}>{title}</h2>
        <ol className="farm-rank-list">{Array.from({ length: 3 }, (_, index) => { const entry = rankings[key][index]; return entry ? <li key={index}>
          <button type="button" className="farm-rank-row" title={"Go to " + entry.label + " farm · " + description} aria-label={"Go to " + entry.label + " farm, " + title + " rank " + (index + 1) + ", " + displayRankValue(entry.value, key)} onClick={() => goToFarm(entry.id)}>
            <span className="farm-rank-pos">{index + 1}</span><span className="farm-rank-identity"><FarmLogo id={entry.id} logoId={rows.find(row => row.id === entry.id)?.discovery?.logoId} /><span className="farm-rank-name">{entry.label}<small>#{entry.pool}</small></span></span><strong className="farm-rank-value">{displayRankValue(entry.value, key)}</strong>
          </button>
        </li> : <li key={index} aria-hidden="true"><div className="farm-rank-row farm-rank-placeholder"><span className="farm-loading-bar farm-loading-rank" /><span className="farm-rank-identity"><span className="farm-loading-logo" /><span className="farm-loading-bar" /></span><span className="farm-loading-bar farm-loading-value" /></div></li>; })}</ol>
        <p className="farm-rank-empty" role="status">{!rankings[key].length ? loading ? "Loading rankings…" : "Live ranking data unavailable" : ""}</p>
      </section>)}</div>
    </section>
    <section className="farms-shell" aria-label="OINK farms">
      <header className="farms-topbar">
        <div className="farms-brand"><img src={assetUrl("img/apple-touch-icon.png")} alt="" /><h1>OINK Farms</h1><span className="farms-count">{integratedRows.length} farms{awaitingCount > 0 ? " · " + awaitingCount + " pools awaiting integration" : ""}</span></div>
        <div className="farms-view-controls"><div className="farms-view-toggle" role="group" aria-label="Farm layout"><button type="button" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><FarmIcon name="grid" /></button><button type="button" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><FarmIcon name="list" /></button></div></div>
      </header>
      <div className="farms-staked-row"><button type="button" className="farms-staked-toggle" aria-pressed={stakedOnly} onClick={() => setStakedOnly((value) => !value)}><span aria-hidden="true" />Staked</button></div>
      <div className="farms-toolbar">
        <label className="farms-search"><span>Search farms</span><input type="search" placeholder="Token, farm # or address" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="farms-reward"><span>Reward token</span><select value={reward} onChange={(event) => setReward(event.target.value)}><option value="all">All rewards</option><option value="oink">OINK</option></select></label>
        <label className="farms-sort"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value as FarmSort)}><option value="default">Default order</option><option value="name">Name: A–Z</option><option value="fee">Lowest deposit fee</option><option value="apr">Highest APR</option><option value="tvl">Highest TVL</option><option value="pending">Your rewards: highest</option></select></label>
        <button type="button" className="farms-favorites-toggle" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}><FarmIcon name="star" />Favorites</button>
        <button type="button" className="farms-clear-filters" onClick={clearFilters}>Clear filters</button>
      </div>
      <div className="farms-summary">
        <div className="farms-summary-metrics"><div title="Recorded wallet deposits at current market prices, before accrued funding. Excludes HEX T-Shares and protocol treasury assets."><span>{coverageIncomplete || stakedValue?.partial ? "Staked subtotal" : "Total staked"}</span><strong>{stakedValue?.value != null ? displayRankValue(stakedValue.value, "tvl") : "— USD"}</strong><small className="farms-summary-note">{coverageIncomplete || stakedValue?.partial ? coveragePending ? "Loading remaining farms…" : "Incomplete reads or pricing" : ""}</small></div><div><span>{coverageIncomplete || totals?.partial ? "Pending subtotal" : "Pending rewards"}</span><strong title={totals?.grossPending ?? undefined}>{totals?.grossPending != null ? displayFarmAmount(totals.grossPending) : "—"} <small>OINK</small></strong><small className="farms-summary-note" /></div></div>
        <div className="farms-summary-bottom">
          <div className="farms-reward-breakdown"><span className="farms-reward-heading">Pending OINK by farm</span>
            <div className="farms-reward-content"><div className="farms-reward-chips">{pendingByFarm.map((farm) => <span className="farms-reward-chip" key={farm.id} title={farm.label + ": " + farm.pending + " gross OINK"}><FarmLogo id={farm.id} logoId={rows.find(row => row.id === farm.id)?.discovery?.logoId} /><strong>{displayFarmAmount(farm.pending)}</strong><span>{farm.label}</span></span>)}</div>
            {!pendingByFarm.length && <p>{!account ? "Connect your wallet to see rewards" : totals?.grossPending == null ? loading ? "Reading rewards…" : "Rewards unavailable" : "No pending rewards in available reads"}</p>}</div>
          </div>
          <div className="farms-summary-actions"><strong>{totals ? totals.positionCount + (coverageIncomplete || totals.partial ? " known positions" : " positions found") : "Positions not loaded"}</strong><button type="button" className="farm-claim-all" disabled title={LOCKED_REASON}><FarmIcon name="lock" /> Claim all</button></div></div>
      </div>
      <div className={"farms-read-status" + (readStatus ? " is-warning" : "")} role="status" tabIndex={readStatus ? 0 : undefined}>{readStatus}</div>
      <div className={"browse-farms-grid" + (view === "list" ? " farms-list-view" : "")}>{visible.map((row) => <FarmCardRouter key={row.id} row={row} metrics={rankings.metrics[row.id]} highlighted={farmJump?.id === row.id} prices={prices} timestamp={snapshot?.timestamp ?? null} snapshotAccount={snapshot?.account ?? null} hasWallet={!!account} loading={loading && row.loading} favorite={favorites.includes(row.id)} onFavorite={() => setFavorites((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} onConfirmed={() => setRefresh((value) => value + 1)} />)}</div>
{!visible.length && <div className="farms-empty" role="status"><FarmIcon name={favoritesOnly ? "star" : "search"} /><h2>{stakedOnly && !account ? "Connect your wallet to find your farms" : favoritesOnly && !favorites.length ? "Your favorite farms belong here" : "No matching farms"}</h2><p>{stakedOnly ? account ? loading ? "Reading wallet positions. Matching farms will appear when the scan completes." : "No positions matched in the available reads. Unavailable vaults are not counted as empty." : "Use Connect wallet in the navbar to see your farms." : favoritesOnly && !favorites.length ? "Select the star on a farm card to save it in this browser." : "Try a different search or filter."}</p><button type="button" onClick={clearFilters}>Show all farms</button></div>}
    </section>
    <FarmEmissionSplit rows={integratedRows} loading={loading} />
    <p className="original-tools-note">New pools are checked automatically on each refresh. <Link to="/protocol?section=tools">Farm recovery &amp; more OINK tools →</Link></p>
  <section id="hex-share-tools" style={{scrollMarginTop:100}}><HexShareManager /></section></main>;
}

