import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { farmSpecIdentity, getFarmCatalogRevision, getFarmWriteSpec, getFarmWriteSpecs, subscribeFarmCatalog } from "../lib/farmCatalog";
import { refreshDiscoveredFarmCatalog } from "../lib/farmCatalogDiscovery";
import { getPublicProvider } from "../lib/chain";
import { displayFarmAmount } from "../lib/farmDisplay";
import { FARM_RECOVERY_PAGE_SIZE, readFarmRecovery, recoveryPositionIndex, type FarmRecoverySnapshot } from "../lib/farmRecovery";
import { PositionTransaction } from "./PositionTransaction";
import { useWallet } from "./WalletProvider";
import "./farm-recovery.css";

/** Kept outside the complete farm dashboard so reward failures cannot hide recovery. */
export function FarmRecovery() {
  const wallet = useWallet(), id = useId();
  useSyncExternalStore(subscribeFarmCatalog, getFarmCatalogRevision);
  const farms = getFarmWriteSpecs();
  const [farmId, setFarmId] = useState("pls"), [data, setData] = useState<FarmRecoverySnapshot | null>(null);
  const [selected, setSelected] = useState(""), [jump, setJump] = useState("0");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [now, setNow] = useState(Date.now());
  const [discovering, setDiscovering] = useState(false), [discoveryError, setDiscoveryError] = useState("");
  const discoveryController = useRef<AbortController | null>(null);
  const generation = useRef(0), controller = useRef<AbortController | null>(null);
  const spec = getFarmWriteSpec(farmId);
  const identity = `${wallet.account}:${wallet.chainId}:${wallet.revision}:${farmId}:${spec ? farmSpecIdentity(spec) : "unavailable"}`, current = useRef(identity);
  current.current = identity;
  useEffect(() => {
    const reset = () => { ++generation.current; controller.current?.abort(); setData(null); setSelected(""); setJump("0"); setBusy(false); setError(""); };
    reset();
    window.addEventListener("oink-positions-changed", reset);
    return () => { ++generation.current; controller.current?.abort(); window.removeEventListener("oink-positions-changed", reset); };
  }, [identity]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const snapshot = data?.farmId === farmId && data.account.toLowerCase() === wallet.account?.toLowerCase() ? data : null;
  const stale = !!snapshot && (now - snapshot.timestamp * 1000 >= 120000 || snapshot.timestamp * 1000 - now > 30000);
  const position = snapshot?.positions.find(row => row.index.toString() === selected);
  const connected = !!wallet.account && wallet.chainId === 369n && !wallet.busy;
  const refreshFarms = async () => {
    discoveryController.current?.abort();
    const abort = new AbortController(); discoveryController.current = abort;
    setDiscovering(true); setDiscoveryError("");
    try { await refreshDiscoveredFarmCatalog(await getPublicProvider(), abort.signal); }
    catch (reason) { if (!abort.signal.aborted) setDiscoveryError(reason instanceof Error ? reason.message : "New farms could not be checked. Try again."); }
    finally { if (!abort.signal.aborted) setDiscovering(false); }
  };
  useEffect(() => { void refreshFarms(); return () => { discoveryController.current?.abort(); }; }, []);

  const load = async (start: number) => {
    if (!connected || !wallet.account || !getFarmWriteSpec(farmId)) return;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const run = ++generation.current, started = identity;
    setBusy(true); setError(""); setData(null); setSelected("");
    let timer: number | undefined, cancel = () => {};
    try {
      const deadline = new Promise<never>((_, reject) => {
        cancel = () => reject(new Error("Recovery read cancelled."));
        abort.signal.addEventListener("abort", cancel, { once: true });
        timer = window.setTimeout(() => { reject(new Error("Positions are taking too long to load. Try again.")); abort.abort(); }, 45000);
      });
      const value = await Promise.race([getPublicProvider().then(rpc => readFarmRecovery(rpc, farmId, wallet.account!, start, abort.signal)), deadline]);
      if (run === generation.current && started === current.current) { setData(value); setSelected(value.positions[0]?.index.toString() ?? ""); setJump(value.start.toString()); setNow(Date.now()); }
    } catch (reason) {
      if (run === generation.current && started === current.current) setError(reason instanceof Error ? reason.message : "Positions are unavailable. Try again.");
    } finally {
      window.clearTimeout(timer); abort.signal.removeEventListener("abort", cancel);
      if (run === generation.current && started === current.current) setBusy(false);
    }
  };
  const jumpToPosition = () => {
    try { void load(recoveryPositionIndex(jump)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Enter a valid position index."); }
  };

  return <section className="farm-recovery professional-card" aria-labelledby={id + "-heading"}>
    <div className="info-heading"><h2 id={id + "-heading"}>Emergency farm recovery</h2><InfoTooltip label="About emergency farm recovery">Emergency withdrawal closes the entire selected position and forfeits its pending OINK rewards. Accrued funding deductions still apply to the asset returned. It skips normal reward harvesting, which can help when that reward path is failing; use the normal Unstake route when you want to settle rewards too.</InfoTooltip></div>
    <p>Use this when normal farm withdrawals cannot settle rewards. Select a supported farm below to withdraw a full position and forfeit its OINK rewards. Funding fees still apply.</p>
    <div className="farm-recovery-controls">
      <label htmlFor={id + "-farm"}>Farm<select id={id + "-farm"} value={farmId} onChange={event => setFarmId(event.target.value)}>{!spec && <option value={farmId}>Farm unavailable · refresh the list</option>}{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.symbol}{farm.discoveryTemplateId ? " · pool " + farm.poolId : ""}</option>)}</select></label>
      <button type="button" disabled={!connected || !spec || busy} onClick={() => void load(0)}>{busy ? "Reading positions…" : "Load positions"}</button>
      <button type="button" disabled={discovering} onClick={() => void refreshFarms()}>{discovering ? "Checking available farms…" : "Refresh available farms"}</button>
    </div>
    {discoveryError && <p className="farm-action-error" role="alert">{discoveryError}</p>}
    {!wallet.account && <p>Connect your wallet from the header to load its positions.</p>}
    {wallet.account && wallet.chainId !== 369n && <p>Switch your wallet to PulseChain to continue.</p>}
    {error && <p className="farm-action-error" role="alert">{error}</p>}
    {snapshot && <>
      {stale && <p role="status">Snapshot expired. Reload positions before continuing.</p>}
      {!snapshot.count ? <p>No positions in this farm for the connected wallet.</p> : <>
        <label htmlFor={id + "-position"}>Position<select id={id + "-position"} value={selected} onChange={event => { setSelected(event.target.value); }} disabled={busy || stale}>{snapshot.positions.map(row => <option key={row.index} value={row.index}>#{row.index} · {displayFarmAmount(row.amount)} {snapshot.symbol}</option>)}</select></label>
        <p>Showing indexes {snapshot.start}–{snapshot.start + snapshot.positions.length - 1} of {snapshot.count.toLocaleString()} positions. Amounts are recorded stakes before funding fees.</p>
        {snapshot.count > FARM_RECOVERY_PAGE_SIZE && <div className="farm-recovery-pagination"><button type="button" disabled={busy || snapshot.start === 0} onClick={() => void load(Math.max(0, snapshot.start - FARM_RECOVERY_PAGE_SIZE))}>Previous 20</button><button type="button" disabled={busy || snapshot.start + snapshot.positions.length >= snapshot.count} onClick={() => void load(snapshot.start + snapshot.positions.length)}>Next 20</button></div>}
        {position && <div className="farm-recovery-warning"><strong>{displayFarmAmount(position.amount)} {snapshot.symbol} recorded stake · position #{position.index}</strong><p>This closes the entire selected position. All its pending OINK rewards are lost. Current funding fees and the selected position are checked before your wallet opens.</p><PositionTransaction key={`${snapshot.blockHash}:${position.index}`} label="Emergency withdraw" disabled={stale || busy || !connected || BigInt(position.amountRaw) === 0n} request={{ type: "farm", id: farmId, index: position.index, kind: "emergency", destination: "wallet" }} /></div>}
      </>}
    </>}
    {connected && <details className="farm-recovery-jump"><summary>Find a position by index</summary><p>Use its current index if you have many positions. Indexes can change after a withdrawal.</p><div className="farm-recovery-controls"><label htmlFor={id + "-index"}>Position index<input id={id + "-index"} inputMode="numeric" value={jump} onChange={event => setJump(event.target.value)} /></label><button type="button" disabled={busy} onClick={jumpToPosition}>Load from index</button></div></details>}
  </section>;
}
import { InfoTooltip } from "./InfoTooltip";

