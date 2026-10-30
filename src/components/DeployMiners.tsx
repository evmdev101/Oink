import { useEffect, useState } from "react";
import { isAddress, parseEther } from "ethers";
import { TIME_MINER_CONTRACTS } from "../config/contracts";
import { displayFarmAmount } from "../lib/farmDisplay";
import { PositionTransaction } from "./PositionTransaction";
import { useWallet } from "./WalletProvider";
import { type MinerYield } from "../lib/minerLive";
import { snapshotIsStale } from "../lib/governanceReadSafety";
import { readPublicMinerYields, peekPublicMinerYields, readMinerWalletBalance, peekMinerWalletBalance, type MinerWalletBalance } from "../lib/minerDisplayReads";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { MinerRewardProjection } from "./MinerRewardProjection";
import { usePageLoadStatus } from "./PageLoadBoundary";
import { InfoTooltip } from "./InfoTooltip";

const minerEstimateIsFresh = (estimate: MinerYield | null | undefined, now: number) =>
  estimate != null && Number.isFinite(estimate.timestamp) && now - estimate.timestamp * 1000 < 120000 && estimate.timestamp * 1000 - now <= 30000;

function DeployCard({ miner, balance, estimate, now, loading }: { miner: (typeof TIME_MINER_CONTRACTS)[number]; balance: string | null; estimate:MinerYield|null; now:number; loading:boolean }) {
  const [duration, unit] = miner.label.split(" ");
  const { account, chainId } = useWallet();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("self");
  const [address, setAddress] = useState("");
  const freshEstimate = minerEstimateIsFresh(estimate, now) ? estimate : null;
  let amountError = "";
  if (amount) {
    try { if (!/^\d+(\.\d{1,18})?$/.test(amount) || parseEther(amount) <= 0n) amountError = "Enter an amount greater than zero, up to 18 decimal places."; else if (balance != null && parseEther(amount) > parseEther(balance)) amountError = "Amount exceeds the available OINK balance."; }
    catch { amountError = "Enter a valid OINK amount."; }
  }
  return <article className="deploy-miner-card deploy-design-premium">
    <header className="deploy-card-heading">
      <span className="deploy-yield-badge" data-unavailable={freshEstimate?.apr == null || undefined} title="Annualized current emissions / gross pool value. Not compounded; fees and future changes excluded.">{freshEstimate?.apr!=null?<>{freshEstimate.apr}% <span className="deploy-apr-label">APR</span></>:loading?"Loading APR…":"APR unavailable"}</span>
      <h2><span className="deploy-duration-number">{duration}</span><span className="deploy-duration-unit">{unit}<small>Miner</small></span></h2>
    </header>
    <div className="deploy-yield-row">
      <MinerRewardProjection amount={amount} estimate={freshEstimate} durationDays={MINER_PREVIEW_SPECS.find(spec => spec.id === miner.id)!.durationDays} label={miner.label} now={Math.max(now, (freshEstimate?.timestamp ?? 0) * 1000)} />
      <p className="deploy-wallet-balance">Wallet: {balance == null ? "—" : displayFarmAmount(balance)} OINK</p>
    </div>
    <div className="deploy-miner-form">
      <label htmlFor={miner.id + "-amount"}>OINK amount</label>
      <div className="deploy-amount-row"><input id={miner.id + "-amount"} inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={!!amountError} /><button type="button" disabled={balance == null} onClick={() => setAmount(balance ?? "")}>MAX</button></div>
      {amountError && <p className="deploy-form-error" role="status">{amountError}</p>}
      <label htmlFor={miner.id + "-recipient"}>Create miner for</label>
      <select id={miner.id + "-recipient"} value={recipient} onChange={(event) => setRecipient(event.target.value)}><option value="self">Your wallet</option><option value="other">Another wallet</option></select>
      {recipient === "other" && <label>Recipient address<input placeholder="0x…" value={address} onChange={(event) => setAddress(event.target.value)} aria-invalid={!!address && !isAddress(address)} /></label>}
      {recipient === "other" && address && !isAddress(address) && <p className="deploy-form-error">Enter a valid recipient address.</p>}
      <PositionTransaction label="Deploy miner" request={{type:"miner",id:miner.id,action:{kind:"deploy",amount,recipient:recipient === "self" ? account ?? "" : address}}} disabled={!account || chainId !== 369n || !amount || !!amountError || (recipient === "other" && !isAddress(address))} />
    </div>
  </article>;
}

export function DeployMiners() {
  const { account } = useWallet();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const [read, setRead] = useState<MinerWalletBalance | null>(() => account ? peekMinerWalletBalance(account) : null);
  const [yields,setYields]=useState<Record<string,MinerYield|null>>(() => peekPublicMinerYields()?.yields ?? {});
  const [refresh, setRefresh] = useState(0);
  const [yieldError, setYieldError] = useState("");
  const [loadingYields, setLoadingYields] = useState(true);
  const [balanceError, setBalanceError] = useState("");
  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let readTimer: number | undefined;
    let controller: AbortController | undefined;
    const load = async () => {
      setYieldError(""); setLoadingYields(true);
      let retryDelay = 60000;
      const readController = new AbortController();
      controller = readController;
      const timeout = new Promise<never>((_, reject) => {
        readTimer = window.setTimeout(() => { reject(new Error("Miner rates are taking too long to load. Please retry.")); readController.abort(); }, 60000);
      });
      try {
        const values = await Promise.race([readPublicMinerYields(readController.signal), timeout]);
        if (active) {
          setYields(values.yields); setNow(Date.now());
          if (Object.values(values.yields).some(value => value == null)) { setYieldError("Some miner rates could not be loaded. Retry to load all miner values."); retryDelay = 5000; }
        }
      } catch { if (active) setYieldError("Miner rates could not be loaded. Retry to reconnect."); retryDelay = 5000; }
      finally { window.clearTimeout(readTimer); if (active) { setLoadingYields(false); timer = window.setTimeout(load, retryDelay); } }
    };
    void load();
    return () => { active = false; controller?.abort(); window.clearTimeout(timer); window.clearTimeout(readTimer); };
  }, [refresh]);
  const balance = account && read?.account.toLowerCase() === account.toLowerCase() && !snapshotIsStale(read.timestamp, now) ? read.balance : null;
  const yieldsReady = TIME_MINER_CONTRACTS.every(miner => minerEstimateIsFresh(yields[miner.id], now));
  usePageLoadStatus("deploy-miners", yieldsReady && (!account || balance != null), yieldError || balanceError, () => setRefresh(value => value + 1));
  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let readTimer: number | undefined;
    const controller = new AbortController();
    setRead(account ? peekMinerWalletBalance(account) : null);
    setBalanceError("");
    if (!account) return;
    const load = async () => {
      setBalanceError("");
      let retryDelay = 60000;
      const timeout = new Promise<never>((_, reject) => {
        readTimer = window.setTimeout(() => reject(new Error("Your OINK wallet balance is taking too long to load. Please retry.")), 60000);
      });
      try {
        const value = await Promise.race([readMinerWalletBalance(account, controller.signal), timeout]);
        if (active) setRead(value);
      } catch { if (active) setBalanceError("Your OINK wallet balance could not be loaded. Retry to reconnect."); retryDelay = 5000; }
      finally { window.clearTimeout(readTimer); if (active) timer = window.setTimeout(load, retryDelay); }
    };
    void load();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); window.clearTimeout(readTimer); };
  }, [account, refresh]);
  return <section className="deploy-miners-workspace"><header><h1>Deploy miner <InfoTooltip label="About miner APR and deployment"><p>APR annualizes the pool's current OINK rewards relative to its gross value. It excludes compounding, exit penalties and network fees; future rates and your share of the pool can change.</p><p>Deploying commits your liquid OINK to a time miner. Choosing another wallet makes that wallet the owner. Review the duration and exit rules before confirming.</p></InfoTooltip></h1></header><div className="deploy-miners-grid">{TIME_MINER_CONTRACTS.map((miner) => <DeployCard key={miner.id + (account ?? "")} miner={miner} balance={balance} estimate={yields[miner.id]??null} now={now} loading={loadingYields} />)}</div></section>;
}
