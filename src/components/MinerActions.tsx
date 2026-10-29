import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatEther, getAddress, isAddress, parseEther, ZeroAddress } from "ethers";
import { TIME_MINER_CONTRACTS, explorerUrl } from "../config/contracts";
import { displayFarmAmount } from "../lib/farmDisplay";
import { getPublicProvider } from "../lib/chain";
import { previewMiner, type PositionPreview } from "../lib/positionPreviews";
import "./miner-actions.css";
import { PositionTransaction } from "./PositionTransaction";
import { MinerRolloverDialog } from "./MinerRolloverDialog";
import { useWallet } from "./WalletProvider";
import { submitMinerWithdrawal } from "../lib/minerWithdrawalFlow";
import { InfoTooltip } from "./InfoTooltip";
import { isCancelledFeedback, isRecoveryFeedback } from "../lib/transactionFeedback";
import { positionJournalBlocks, readPositionJournal } from "../lib/positionTransactions";

export type MinerActionPosition = { index: number; shares: string; gross: string; deposited: number; maturity: number; mandatoryUntil: number; graceEnd: number; pool: { id: string; label: string; address: string } };
type Action = "upgrade" | "transfer" | "withdraw" | "rollover";
const titles = { upgrade: "Upgrade Miner", transfer: "Transfer Miner", withdraw: "End Miner (Withdraw)", rollover: "Renew Miner (Rollover)" };
const date = (value: number) => new Date(value * 1000).toLocaleString();

export function MinerActions({ row, account, revision, chainId, triggerKind = "menu" }: { row: MinerActionPosition; account: string | null; revision: number; chainId: bigint | null; triggerKind?: "menu" | "rollover" }) {
  const wallet = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [recipient, setRecipient] = useState("");
  const [duration, setDuration] = useState("");
  const [amountMode, setAmountMode] = useState("full");
  const [partialShares, setPartialShares] = useState("");
  const [quote, setQuote] = useState<PositionPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [withdrawStage, setWithdrawStage] = useState<"idle" | "checking" | "wallet" | "pending" | "rejected" | "uncertain">("idle");
  const [withdrawMessage, setWithdrawMessage] = useState("");
  const withdrawalPending = useRef(false);
  const quoteRequest = useRef<{ identity: string; promise: Promise<PositionPreview> } | null>(null);
  const mounted = useRef(false), activeAction = useRef<Action | null>(action);
  activeAction.current = action;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const id = useId();
  const identity = [revision, account, chainId, row.pool.id, row.index, row.shares, row.deposited].join(":");
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const index = TIME_MINER_CONTRACTS.findIndex((v) => v.id === row.pool.id);
  const durations = index < 0 ? [] : TIME_MINER_CONTRACTS.slice(index + 1);
  let portionError = "", selectedShares: string | undefined;
  if (amountMode === "partial") {
    try {
      if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/.test(partialShares)) throw Error("Enter shares with up to 18 decimal places.");
      const chosen = parseEther(partialShares);
      if (chosen <= 0n || chosen > parseEther(row.shares)) throw Error("Choose more than zero and no more than this miner's shares.");
      selectedShares = formatEther(chosen);
    } catch (reason) { portionError = reason instanceof Error ? reason.message : "Enter a valid share amount."; }
  }
  const portionKey = amountMode + ":" + partialShares;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    ++generation.current; quoteRequest.current = null; setAction(null); setMenuOpen(false); setQuote(null); setBusy(false); setError(""); setWithdrawStage("idle"); setWithdrawMessage(""); dialog.current?.close();
    return () => { ++generation.current; };
  }, [identity]);
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [menuOpen]);
  useEffect(() => {
    if (!action || action === "rollover") return;
    dialog.current?.showModal();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("oink-open-request-recovery", close);
    return () => { window.clearInterval(timer); window.removeEventListener("oink-open-request-recovery", close); };
  }, [action]);
  useEffect(() => {
    const reconcile = () => {
      if (!account || withdrawalPending.current) return;
      try {
        if (positionJournalBlocks(readPositionJournal(account, localStorage, {type:"miner",id:row.pool.id,action:{kind:"withdraw",index:row.index}}))) return;
        setWithdrawStage(stage => stage === "pending" || stage === "uncertain" ? "idle" : stage);
        setWithdrawMessage(text => isRecoveryFeedback(text) ? "" : text);
        setError(text => isRecoveryFeedback(text) ? "" : text);
      } catch { /* Unreadable requests stay available for manual recovery. */ }
    };
    const events = ["storage", "oink-position-journal", "oink-protocol-journal", "oink-farm-journal", "oink-positions-changed"];
    events.forEach(event => window.addEventListener(event, reconcile));
    return () => events.forEach(event => window.removeEventListener(event, reconcile));
  }, [identity, account]);
  const close = () => { ++generation.current; quoteRequest.current = null; dialog.current?.close(); setAction(null); setBusy(false); trigger.current?.focus(); };
  const withdrawalUnresolved = ["checking", "wallet", "pending", "uncertain"].includes(withdrawStage);
  const changePortion = (mode: string, shares = partialShares) => {
    if (withdrawalPending.current || withdrawalUnresolved) return;
    ++generation.current; quoteRequest.current = null; setQuote(null); setBusy(false); setError("");
    setWithdrawStage("idle"); setWithdrawMessage(""); setAmountMode(mode); setPartialShares(shares);
  };
  const getWithdrawalQuote = () => {
    const quoteIdentity = identity + ":" + portionKey;
    if (quoteRequest.current?.identity === quoteIdentity) return quoteRequest.current.promise;
    const pending = { identity:quoteIdentity, promise: (async () => {
      if (!account || chainId !== 369n) throw Error("Connect your wallet on PulseChain to check this withdrawal.");
      if (portionError) throw Error(portionError);
      const result = await previewMiner(await getPublicProvider(), row.pool.id, account, { kind: "withdraw", index: row.index, ...(selectedShares ? {shares:selectedShares} : {}) });
      if (!result.execution || BigInt(result.execution.positionShares ?? result.execution.shares) !== parseEther(row.shares)) throw Error("This miner changed. Close this window and refresh your miners.");
      return result;
    })() };
    quoteRequest.current = pending;
    const clear = () => { if (quoteRequest.current === pending) quoteRequest.current = null; };
    void pending.promise.then(clear, clear);
    return pending.promise;
  };
  const loadQuote = async () => {
    if (withdrawalPending.current) return;
    if (!account || chainId !== 369n) { setError("Connect your wallet on PulseChain to check this withdrawal."); return; }
    const request = ++generation.current, startedIdentity = identity;
    setBusy(true); setError(""); setQuote(null); setWithdrawStage("idle"); setWithdrawMessage("");
    try {
      const result = await getWithdrawalQuote();
      if (request === generation.current && startedIdentity === currentIdentity.current) { setQuote(result); setNow(Date.now()); }
    } catch (reason) {
      if (request === generation.current && startedIdentity === currentIdentity.current) setError(reason instanceof Error ? reason.message : "Unable to check this withdrawal.");
    } finally { if (request === generation.current && startedIdentity === currentIdentity.current) setBusy(false); }
  };
  const open = (next: Action) => {
    setNow(Date.now());
    if (next === "withdraw" && withdrawalPending.current) { setMenuOpen(false); setAction(next); return; }
    setMenuOpen(false); setRecipient(""); setDuration(durations[0]?.id ?? ""); setAmountMode("full"); setPartialShares(""); setQuote(null); setError(""); setAction(next);
    setWithdrawStage("idle"); setWithdrawMessage("");
  };
  useEffect(() => {
    if (action !== "withdraw" || portionError || withdrawalUnresolved) return;
    const timer = window.setTimeout(() => void loadQuote(), 250);
    return () => window.clearTimeout(timer);
  }, [action, portionKey, identity]);
  const withdraw = async () => {
    if (withdrawalPending.current || withdrawalUnresolved || portionError || !wallet.provider || !account || chainId !== 369n) return;
    withdrawalPending.current = true; setWithdrawStage("checking"); setWithdrawMessage(""); setError("");
    const request = ++generation.current, started = identity, provider = wallet.provider;
    const current = () => mounted.current && generation.current === request && currentIdentity.current === started;
    // Reopening may show a completed result, but must never revive approval for
    // a request that was cancelled before its wallet prompt started.
    const showingSameMiner = () => mounted.current && currentIdentity.current === started && activeAction.current === "withdraw";
    try {
      // An early click joins the preview already loading and continues once it
      // is ready. Closing the dialog or changing wallets cancels that intent.
      const freshQuote = quote?.execution && quote.simulation.startsWith("Passed") && Date.now() - quote.timestamp * 1000 <= 120000
        ? quote : await getWithdrawalQuote();
      if (!current()) throw Error("Withdrawal cancelled. Click Withdraw to try again.");
      setQuote(freshQuote); setNow(Date.now()); setBusy(false);
      if (!freshQuote.simulation.startsWith("Passed")) throw Error(freshQuote.simulation);
      const outcome = await submitMinerWithdrawal({
        request: { type: "miner", id: row.pool.id, action: { kind: "withdraw", index: row.index, ...(selectedShares ? {shares:selectedShares} : {}) } },
        displayedQuote: freshQuote, provider, rpc: await getPublicProvider(), current,
        onStage: (stage, text) => { if (current()) { setWithdrawStage(stage); setWithdrawMessage(text ?? ""); } },
      });
      if (showingSameMiner()) {
        setWithdrawStage(outcome.state === "pending" ? "pending" : outcome.state === "uncertain" && outcome.hash ? "uncertain" : "rejected");
        setWithdrawMessage(outcome.state === "uncertain" && !outcome.hash ? "Wallet response unavailable. Check your wallet before trying again." : outcome.message);
      }
    } catch (reason) {
      if (showingSameMiner()) {
        const failure = reason as { hash?: string | null; journal?: unknown; walletRequestStarted?: boolean };
        setWithdrawMessage(reason instanceof Error ? reason.message : "Unable to withdraw this miner.");
        if (failure?.hash) setWithdrawStage("uncertain");
        else setWithdrawStage("rejected");
      }
    } finally { withdrawalPending.current = false; if (current()) setBusy(false); }
  };
  let recipientError = "";
  if (recipient) {
    if (!isAddress(recipient)) recipientError = "Enter a valid wallet address.";
    else if (getAddress(recipient) === ZeroAddress || getAddress(recipient) === getAddress(row.pool.address)) recipientError = "Choose a wallet address, not a zero or miner address.";
    else if (account && getAddress(recipient) === getAddress(account)) recipientError = "Choose a different wallet.";
  }
  const expired = !!quote && now - quote.timestamp * 1000 > 120000;
  const pastGracePeriod = Math.floor(now / 1000) > row.graceEnd;
  const fact = (name: string) => quote?.facts.find(([key]) => key === name)?.[1];
  const shownBalance = action === "withdraw" ? fact("Gross OINK value") ?? row.gross : row.gross;
  const checkingWithdrawal = withdrawStage === "checking" || withdrawStage === "wallet";
  const withdrawalError = withdrawStage === "rejected" && !isCancelledFeedback(withdrawMessage) && !isRecoveryFeedback(withdrawMessage) ? withdrawMessage : "";
  return <div className="miner-action-control" ref={root}>
    {triggerKind === "rollover"
      ? <button ref={trigger} className="miner-rollover-badge" type="button" aria-haspopup="dialog" title="Renew this matured miner. Withdrawal is separate and may still have a penalty; check End Miner (Withdraw) for the current fee." onClick={() => open("rollover")}>Roll-Over</button>
      : <button ref={trigger} className="miner-action-trigger" type="button" aria-expanded={menuOpen} aria-controls={id + "-options"} onClick={() => setMenuOpen((value) => !value)}>Actions <span aria-hidden="true">▾</span></button>}
    {menuOpen && <div className="miner-action-options" id={id + "-options"}>
      <button type="button" onClick={() => open("upgrade")}>Upgrade Miner</button>
      <button type="button" onClick={() => open("rollover")}>Renew Miner (Rollover)</button>
      <button type="button" onClick={() => open("transfer")}>Transfer Miner to Another Wallet</button>
      <button type="button" onClick={() => open("withdraw")}>End Miner (Withdraw)</button>
    </div>}
    {action === "rollover" && <MinerRolloverDialog row={row} onClose={close} />}
    {action && action !== "rollover" && createPortal(<dialog ref={dialog} className="miner-action-dialog" aria-labelledby={id + "-title"} onCancel={close} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      <div className="miner-action-symbol" aria-hidden="true">{action === "upgrade" ? "↑" : "!"}</div>
      <h2 id={id + "-title"}>{titles[action]} <InfoTooltip label={"About " + titles[action]}>{action === "withdraw" ? <><p>The gross miner balance comes from your share of the pool. The estimated return subtracts the current early or late exit penalty from the shares you choose to withdraw.</p><p>Mandatory service must finish before any withdrawal. A partial withdrawal keeps the remaining shares on their original schedule; the contract's current settings decide whether portions are allowed.</p></> : action === "transfer" ? <><p>Transfer all or some of your miner shares to another wallet. The recipient keeps the transferred shares' original start time and mandatory service.</p><p>The selected value must meet the contract's current minimum transfer amount. Any remaining shares stay in your wallet's miner; review the recipient carefully before confirming.</p></> : <><p>Upgrade moves all or some of your shares into a longer-duration miner. Served time and mandatory service carry over, unless the source grace period has already ended and the start time resets.</p><p>Remaining shares keep their existing schedule. The new duration's withdrawal and grace rules apply to the transferred amount.</p></>}</InfoTooltip></h2>
      <p className="miner-action-context">{row.pool.label} · #{row.index} · {displayFarmAmount(shownBalance)} OINK</p>
      {action === "upgrade" && <>
        <p>Move your miner to a longer duration. Available routes and lock terms must be checked before transferring.</p>
        <label htmlFor={id + "-duration"}>Select miner duration</label>
        <select id={id + "-duration"} value={duration} onChange={(event) => setDuration(event.target.value)} disabled={!durations.length}>{durations.length ? durations.map((v) => <option key={v.id} value={v.id}>{v.label}</option>) : <option value="">Already the longest duration</option>}</select>
      </>}
      {action === "transfer" && <>
        <p>The recipient will own this miner. Double-check the address; a transfer cannot be undone here.</p>
        <label htmlFor={id + "-recipient"}>Recipient address</label>
        <input id={id + "-recipient"} placeholder="0x…" value={recipient} onChange={(event) => setRecipient(event.target.value)} aria-invalid={!!recipientError} aria-describedby={recipientError ? id + "-recipient-error" : undefined} autoComplete="off" spellCheck={false} />
        {recipientError && <p className="miner-action-error" id={id + "-recipient-error"} role="alert">{recipientError}</p>}
      </>}
      {action === "withdraw" && (pastGracePeriod
        ? <p className="miner-withdraw-warning" role="status"><strong>This miner is past its grace period.</strong> Withdrawing now will apply a late withdrawal penalty to your OINK.</p>
        : <p>Withdraw all or part of this miner to your wallet. Early or late exit penalties may apply.</p>)}
      <label htmlFor={id + "-amount"}>{action === "withdraw" ? "Amount to withdraw" : "Amount to transfer"} <InfoTooltip label="About shares and partial miner actions">Shares measure your portion of the pool; they are not a fixed number of OINK. The percentage shortcuts select that portion of this miner's shares. MAX selects all shares, and the current OINK value is checked before opening your wallet.</InfoTooltip></label>
      <select id={id + "-amount"} value={amountMode} onChange={(event) => changePortion(event.target.value)} disabled={withdrawalUnresolved}><option value="full">Full miner ({displayFarmAmount(row.gross)} OINK)</option><option value="partial">Choose a portion</option></select>
      {amountMode === "partial" && <div className="miner-portion">
        <label htmlFor={id + "-shares"}>Shares to {action === "withdraw" ? "withdraw" : "transfer"}</label>
        <input id={id + "-shares"} inputMode="decimal" value={partialShares} onChange={event => changePortion("partial",event.target.value)} disabled={withdrawalUnresolved} aria-invalid={!!portionError} />
        <div className="miner-portion-shortcuts">{[25,50,75,100].map(percent => <button type="button" key={percent} disabled={withdrawalUnresolved} onClick={() => changePortion("partial",formatEther(parseEther(row.shares) * BigInt(percent) / 100n))}>{percent === 100 ? "MAX" : percent + "%"}</button>)}</div>
        <p>{portionError || (selectedShares ? `Approximately ${displayFarmAmount(formatEther(parseEther(row.gross) * parseEther(selectedShares) / parseEther(row.shares)))} OINK before penalties. The current value is checked before opening your wallet.` : "Choose a portion of your miner.")}</p>
        <p>Remaining shares keep their original start time and mandatory service.</p>
      </div>}
      {action === "withdraw" && <div className="miner-exit-summary" aria-live="polite">
        {busy ? null : error ? !isCancelledFeedback(error) && !isRecoveryFeedback(error) && <p className="miner-action-error" role="alert">{error}</p> : expired && !withdrawalUnresolved ? <p>Estimate expired. Check again for current terms.</p> : quote ? <>
          <div><span>Exit penalty</span><strong>{fact("Modeled exit penalty")?.split(" · ")[0]}</strong></div>
          <div><span>Estimated return</span><strong>{fact("Estimated OINK after penalty") ? displayFarmAmount(fact("Estimated OINK after penalty")!.split(" · ")[0]) : "—"} OINK</strong></div>
          {!quote.simulation.startsWith("Passed") && <p className="miner-action-error">{quote.simulation}</p>}
        </> : null}
        {!busy && !withdrawalUnresolved && (error || expired || withdrawStage === "rejected") && <button type="button" onClick={() => void loadQuote()}>Check again</button>}
      </div>}
      {action !== "withdraw" && <details className="miner-action-details"><summary>Details</summary>
        <dl><dt>Wallet</dt><dd>{account ?? "Not connected"}</dd><dt>Shares</dt><dd>{row.shares}</dd><dt>Maturity</dt><dd>{date(row.maturity)}</dd><dt>Mandatory service ends</dt><dd>{date(row.mandatoryUntil)}</dd><dt>Grace ends</dt><dd>{date(row.graceEnd)}</dd></dl>
        <p>Amounts are gross unless marked as an estimated return. Fees and position indexes can change. Opening this dialog sends no transaction.</p>
        <a href={explorerUrl(row.pool.address)} target="_blank" rel="noreferrer">View OINK contract</a>
      </details>}
      {action === "withdraw" && withdrawalError && <p className="miner-action-error" role="alert">{withdrawalError}</p>}
      <div className="miner-action-dialog-buttons">{account ? action === "withdraw"
        ? <button type="button" disabled={withdrawalUnresolved || !!portionError || !wallet.provider || chainId !== 369n} onClick={() => void withdraw()}>{withdrawStage === "checking" ? "Checking…" : withdrawStage === "wallet" ? "Waiting for wallet…" : withdrawStage === "pending" ? "Submitted" : "Withdraw"}</button>
        : <PositionTransaction label={action === "upgrade" ? "Upgrade miner" : "Transfer miner"} disabled={!!portionError || (action === "upgrade" ? !duration : !recipient || !!recipientError)} request={{type:"miner",id:row.pool.id,action:action === "upgrade" ? {kind:"upgrade",index:row.index,target:duration,...(selectedShares ? {shares:selectedShares} : {})} : {kind:"transfer",index:row.index,recipient,...(selectedShares ? {shares:selectedShares} : {})}}} />
        : <button type="button" disabled>Connect wallet</button>}<button type="button" onClick={close}>{action === "withdraw" && withdrawalUnresolved ? "Close" : "Cancel"}</button></div>
    </dialog>, document.body)}
  </div>;
}
