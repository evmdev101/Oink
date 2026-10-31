import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatEther, formatUnits, parseEther } from "ethers";
import { useWallet } from "./WalletProvider";
import type { MinerActionPosition } from "./MinerActions";
import { getPublicProvider } from "../lib/chain";
import { displayFarmAmount } from "../lib/farmDisplay";
import { readMinerRolloverOptions } from "../lib/minerRollover";
import { submitMinerRollover } from "../lib/minerRolloverFlow";
import { isCancelledFeedback, isRecoveryFeedback } from "../lib/transactionFeedback";
import { positionJournalBlocks, readPositionJournal } from "../lib/positionTransactions";
import "./miner-rollover.css";

type Options = Awaited<ReturnType<typeof readMinerRolloverOptions>>;
type Stage = "select" | "checking" | "wallet" | "pending" | "rejected" | "uncertain";
const message = (error: unknown) => error instanceof Error ? error.message : "Unable to load rollover terms. Please try again.";
const durationLabel = (label: string) => label.replace(/months?/, "Month").replace(/years?/, "Year");
const amount = (wei: string) => displayFarmAmount(formatEther(wei));

export function MinerRolloverDialog({ row, onClose }: { row: MinerActionPosition; onClose: () => void }) {
  const wallet = useWallet();
  const [options, setOptions] = useState<Options | null>(null);
  const [target, setTarget] = useState(row.pool.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [stage, setStage] = useState<Stage>("select");
  const [statusMessage, setStatusMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useRef(false), pending = useRef(false), generation = useRef(0);
  const id = useId();
  const identity = [wallet.revision, wallet.account, wallet.chainId, row.pool.id, row.index, row.shares, row.deposited, target].join(":");
  const currentIdentity = useRef(identity); currentIdentity.current = identity;
  const selected = options?.options.find(option => option.id === target);
  const expired = !!options && (now - options.timestamp * 1000 > 60000 || now < options.timestamp * 1000 - 30000);

  useEffect(() => {
    mounted.current = true;
    dialog.current?.showModal();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { mounted.current = false; ++generation.current; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const reconcile = () => {
      if (!wallet.account || pending.current) return;
      try {
        if (positionJournalBlocks(readPositionJournal(wallet.account, localStorage, {type:"miner",id:row.pool.id,action:{kind:"rollover",index:row.index,target}}))) return;
        setStage(stage => stage === "pending" || stage === "uncertain" ? "select" : stage);
        setStatusMessage(text => isRecoveryFeedback(text) ? "" : text);
        setError(text => isRecoveryFeedback(text) ? "" : text);
      } catch { /* Unreadable requests stay available for manual recovery. */ }
    };
    const events = ["storage", "oink-position-journal", "oink-protocol-journal", "oink-farm-journal", "oink-positions-changed"];
    events.forEach(event => window.addEventListener(event, reconcile));
    return () => events.forEach(event => window.removeEventListener(event, reconcile));
  }, [wallet.account, wallet.revision]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true); setError(""); setOptions(null);
    if (!wallet.account || wallet.chainId !== 369n) {
      setError("Connect your wallet on PulseChain to load rollover bonuses."); setLoading(false);
      return;
    }
    const account = wallet.account;
    const load = async () => {
      let delay = 45000;
      try {
        const result = await getPublicProvider().then(rpc => readMinerRolloverOptions(rpc, row.pool.id, account, row.index));
        if (!active) return;
        // The card can change while a read is in flight; never renew a different position.
        if (result.source.id !== row.pool.id || result.source.index !== row.index || BigInt(result.source.shares) !== parseEther(row.shares) || BigInt(result.source.deposited) !== BigInt(row.deposited)) throw Error("This miner changed. Reopen it for the current terms.");
        setOptions(result); setNow(Date.now()); setError("");
        setTarget(previous => result.options.some(option => option.id === previous) ? previous : result.options[0]?.id ?? row.pool.id);
      } catch (reason) {
        if (active) setError(message(reason));
        delay = 10000;
      } finally {
        if (active) { setLoading(false); timer = setTimeout(load, delay); }
      }
    };
    void load();
    return () => { active = false; clearTimeout(timer); };
  }, [wallet.account, wallet.chainId, wallet.revision, row.pool.id, row.index, row.shares, row.deposited, refresh]);

  const extend = async () => {
    if (pending.current || loading || expired || !selected?.available || !selected.quote || !wallet.provider || !wallet.account || wallet.chainId !== 369n) return;
    pending.current = true; setError(""); setStatusMessage(""); setStage("checking");
    const started = identity, run = ++generation.current, provider = wallet.provider;
    const current = () => mounted.current && currentIdentity.current === started && generation.current === run;
    try {
      await submitMinerRollover({
        request: { type: "miner", id: row.pool.id, action: { kind: "rollover", index: row.index, target: selected.id } },
        displayedQuote: selected.quote, provider, rpc: await getPublicProvider(), current,
        onStage: (next, text, hash) => {
          if (!current()) return;
          setStage(next === "uncertain" && !hash ? "rejected" : next); setStatusMessage(next === "uncertain" && !hash ? "Wallet response unavailable. Check your wallet before trying again." : text ?? "");
        },
      });
    } catch (reason) {
      if (current()) {
        const failure = reason as { hash?: string | null; journal?: unknown; walletRequestStarted?: boolean };
        if (failure?.hash) {
          setStatusMessage(message(reason)); setStage("uncertain");
        } else { setError(message(reason)); setStage("select"); }
      }
    } finally { pending.current = false; }
  };

  const reset = () => { setStage("select"); setError(""); setStatusMessage(""); setRefresh(value => value + 1); };
  const close = () => { ++generation.current; onClose(); };
  const title = "Roll-over (extend) Miner:";
  const checking = stage === "checking" || stage === "wallet";
  const actionError = stage === "rejected" && !isCancelledFeedback(statusMessage) && !isRecoveryFeedback(statusMessage) ? statusMessage : "";

  return createPortal(<dialog ref={dialog} className="miner-rollover-dialog" aria-labelledby={id + "-title"} onCancel={event => { event.preventDefault(); close(); }}>
    {stage === "select" ? <>
      <div className="miner-rollover-info" aria-hidden="true">i</div>
      <h2 id={id + "-title"}>{title}</h2>
      <p className="miner-rollover-description">Roll over (extend) your existing miner and receive a bonus. Bonus OINK is added to your miner, and its lock restarts for the duration you select.</p>
      <label className="miner-rollover-label" htmlFor={id + "-duration"}>Select Miner Duration</label>
      <select id={id + "-duration"} value={target} disabled={loading || !options?.options.length} onChange={event => setTarget(event.target.value)}>
        {!options && <option value={target}>{loading ? "Loading durations…" : durationLabel(row.pool.label)}</option>}
        {options?.options.map(option => <option key={option.id} value={option.id} disabled={!option.available}>{durationLabel(option.label)}{option.bonusRate != null ? ` (+${formatUnits(option.bonusRate, 2)}% Bonus)` : " · unavailable"}</option>)}
      </select>
      <section className="miner-rollover-bonuses" aria-labelledby={id + "-bonuses"}>
        <h3 id={id + "-bonuses"}>Available Bonuses</h3>
        {loading ? <p role="status"><span className="miner-rollover-small-spinner" aria-hidden="true" /> Loading current bonuses…</p> : options ? <ul>{options.options.map(option => <li key={option.id} aria-description={option.error} data-unavailable={!option.available || undefined}>{durationLabel(option.label)}: {option.available && option.bonusAmount != null ? <><strong>+{amount(option.bonusAmount)} OINK</strong> bonus</> : <span>Unavailable</span>}</li>)}</ul> : <p>Bonuses could not be loaded.</p>}
      </section>
      {!loading && selected && !selected.available && <p className="miner-rollover-error" role="alert">{selected.error ?? "This duration is currently unavailable."}</p>}
      {error && !isCancelledFeedback(error) && !isRecoveryFeedback(error) && <p className="miner-rollover-error" role="alert">{error}</p>}
      <div className="miner-rollover-buttons"><button type="button" className="miner-rollover-confirm" disabled={loading || expired || !selected?.available || !selected.quote || !wallet.provider || wallet.chainId !== 369n} onClick={() => void extend()}>Extend My Miner!</button><button type="button" className="miner-rollover-cancel" onClick={close}>Cancel</button></div>
    </> : <div className="miner-rollover-progress" role="status" aria-live="polite">
      <h2 id={id + "-title"}>{title}</h2>
      <p>You are rolling over your miner into a <strong>{durationLabel(selected?.label ?? row.pool.label)} Miner.</strong></p>
      {selected?.bonusAmount != null && <p>Estimated bonus: <strong>≈{amount(selected.bonusAmount)} OINK</strong> added to your miner.</p>}
      {(stage === "checking" || stage === "wallet") && <div className="miner-rollover-spinner" aria-hidden="true" />}
      {actionError && <p className="miner-rollover-error" role="alert">{actionError}</p>}
      <div className="miner-rollover-buttons">
        {checking || stage === "pending" ? <button type="button" className="miner-rollover-confirm" disabled>{stage === "checking" ? "Checking…" : stage === "wallet" ? "Waiting for wallet…" : "Submitted"}</button> : null}
        {stage === "rejected" && <button type="button" className="miner-rollover-confirm" onClick={reset}>Back to durations</button>}
        <button type="button" className="miner-rollover-confirm" onClick={close}>Close</button>
      </div>
    </div>}
  </dialog>, document.body);
}
