import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ZeroAddress } from "ethers";
import { assertCurrentFarmSpec, farmSpecIdentity, getFarmCatalogRevision, getFarmWriteSpec, subscribeFarmCatalog } from "../lib/farmCatalog";
import { getPublicProvider } from "../lib/chain";
import { FARM_CHAIN_ID, parseFarmDepositAmount, prepareFarmTransaction, requestReviewedFarmTransaction, type FarmWriteKind } from "../lib/farmTransactions";
import { journalBlocks, readFarmJournal, writeFarmJournal, type FarmJournalEntry } from "../lib/farmTransactionJournal";
import { useWallet } from "./WalletProvider";
import "./farm-transactions.css";
import { assertNoPendingFarm, positionLock } from "../lib/positionTransactions";
import { useReferralSelection } from "./ReferralNotice";
import { FARM_QUICK_PERCENTAGES, farmQuickAmount, type FarmQuickBalance } from "../lib/farmQuickAmounts";
import { InfoTooltip } from "./InfoTooltip";
import { isCancelledFeedback, isRecoveryFeedback, isRoutineRecoveryResult } from "../lib/transactionFeedback";
import { listPendingTransactions as listRecoverableRequests } from "../lib/pendingTransactions";

function messageOf(reason: unknown) {
  const error = reason as { shortMessage?: string; message?: string; code?: number } | null;
  return error?.code === 4001 ? "You cancelled the wallet request." : error?.shortMessage || error?.message || "The operation could not be completed.";
}

export function FarmDepositActions({ farmId, onConfirmed, claimControl, unstakeControl, maxRequest, balanceSnapshot }: { farmId: string; onConfirmed: () => void; claimControl?: ReactNode; unstakeControl?: ReactNode; maxRequest?: { account: string; revision: number }; balanceSnapshot?: FarmQuickBalance }) {
  const wallet = useWallet();
  const referralSelection=useReferralSelection();
  useSyncExternalStore(subscribeFarmCatalog, getFarmCatalogRevision);
  const spec = getFarmWriteSpec(farmId);
  const specIdentity = spec ? farmSpecIdentity(spec) : "";
  const [amount, setAmount] = useState("");
  const consumedMaxRequest = useRef("");
  const [busy, setBusy] = useState("");
  const [busyKind, setBusyKind] = useState<FarmWriteKind | null>(null);
  const [error, setError] = useState("");
  const [journal, setJournal] = useState<FarmJournalEntry | null>(null);
  const [journalError, setJournalError] = useState("");
  const [journalReady, setJournalReady] = useState("");
  const generation = useRef(0);
  const busyLock = useRef(false);
  const mounted = useRef(false);
  const currentSession = useRef(wallet.revision);
  const currentAccount = useRef(wallet.account);
  currentSession.current = wallet.revision;
  currentAccount.current = wallet.account;
  const inputIdentity = JSON.stringify([amount,referralSelection.referral,referralSelection.error,specIdentity,String(wallet.chainId)]);
  const currentInputs = useRef(inputIdentity), currentProvider = useRef(wallet.provider);
  currentInputs.current = inputIdentity; currentProvider.current = wallet.provider;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; ++generation.current; }; }, []);
  useEffect(() => { ++generation.current; }, [wallet.revision,inputIdentity]);
  const journalIdentity = wallet.account ? wallet.account.toLowerCase() + ":" + farmId : "";
  useEffect(() => {
    setError(""); setJournal(null); setJournalError(""); setJournalReady("");
    if (!wallet.account) return;
    const account = wallet.account;
    const reload = () => {
      try { const entry = readFarmJournal(account, farmId); setJournal(entry); if (entry && !journalBlocks(entry)) setError(""); setJournalError(""); setJournalReady(account.toLowerCase() + ":" + farmId); }
      catch (reason) { setJournalError(messageOf(reason)); setJournalReady(""); }
    };
    reload();
    window.addEventListener("storage", reload);
    window.addEventListener("oink-farm-journal", reload);
    return () => { window.removeEventListener("storage", reload); window.removeEventListener("oink-farm-journal", reload); };
  }, [wallet.account, farmId]);
  useEffect(() => {
    if (!wallet.account) return;
    const account = wallet.account;
    const settled = () => {
      try { if (listRecoverableRequests(account).length === 0) setError(current => isRecoveryFeedback(current) ? "" : current); }
      catch { /* Unreadable requests stay guarded and available for recovery. */ }
    };
    const events = ["oink-position-journal", "oink-protocol-journal", "oink-farm-journal", "oink-positions-changed", "storage"];
    events.forEach(event => window.addEventListener(event, settled));
    return () => events.forEach(event => window.removeEventListener(event, settled));
  }, [wallet.account]);

  const connected = !!wallet.account && wallet.chainId === FARM_CHAIN_ID && !!wallet.provider;
  let validAmount = false;
  if (spec) { try { parseFarmDepositAmount(amount, spec.decimals); validAmount = true; } catch { /* Input is validated again during review. */ } }
  const submitted = journal?.review.account.toLowerCase() === wallet.account?.toLowerCase() ? journal : null;
  const transactionPending = journalBlocks(submitted);
  const canPrepare = !!spec && connected && journalReady === journalIdentity && !journalError && !referralSelection.error && !busy && !transactionPending;
  const canFill = connected && !busy && !transactionPending && !journalError;
  const quickAmounts = FARM_QUICK_PERCENTAGES.map(percent => ({percent,value:canFill ? farmQuickAmount(percent,balanceSnapshot,wallet,spec) : null}));
  const fillAmount = (percent: number) => {
    if (!canFill) return;
    const value = farmQuickAmount(percent,balanceSnapshot,wallet,spec,Date.now());
    if (value != null) { setAmount(value); setError(""); }
  };
  useEffect(() => {
    if (!maxRequest) return;
    const requestKey = maxRequest.account.toLowerCase() + ":" + maxRequest.revision;
    if (consumedMaxRequest.current === requestKey) return;
    consumedMaxRequest.current = requestKey;
    if (wallet.account?.toLowerCase() !== maxRequest.account.toLowerCase() || !canFill) return;
    const value = farmQuickAmount(100,balanceSnapshot,wallet,spec,Date.now());
    if (value != null) { setAmount(value); setError(""); }
  }, [maxRequest, balanceSnapshot, wallet.account, wallet.chainId, spec, canFill]);

  // Persist independently of the card's lifecycle: filtering, route changes and
  // account changes must not discard a wallet response or unlock a pending call.
  const record = (entry: FarmJournalEntry) => {
    let failure = "";
    try { writeFarmJournal(entry); window.dispatchEvent(new Event("oink-farm-journal")); }
    catch (reason) { failure = messageOf(reason); }
    if (mounted.current && currentAccount.current?.toLowerCase() === entry.review.account.toLowerCase()) {
      setJournal(entry); setJournalError(failure);
    }
    return failure;
  };
  const requireClearJournal = (account: string) => {
    assertNoPendingFarm(account, farmId);
    if (journalBlocks(readFarmJournal(account, farmId))) throw new Error("An earlier wallet request is unresolved. Check its receipt or wallet activity before a new review.");
  };

  const prepare = async (kind: FarmWriteKind) => {
    if (!spec || !wallet.account || !wallet.provider || !canPrepare || busyLock.current || (kind !== "reset-approval" && !validAmount)) return;
    if (!navigator.locks) { setError("This browser cannot coordinate wallet requests between tabs."); return; }
    busyLock.current = true;
    const run = ++generation.current, revision = wallet.revision;
    const account = wallet.account, provider = wallet.provider, selectedInputs = inputIdentity;
    const current = () => mounted.current && run === generation.current && currentSession.current === revision && currentInputs.current === selectedInputs && currentProvider.current === provider && currentAccount.current?.toLowerCase() === account.toLowerCase();
    setError(""); setBusyKind(kind); setBusy("Checking live contract state…");
    try {
      requireClearJournal(account);
      const rpc = await getPublicProvider();
      const activeReview = await prepareFarmTransaction(rpc,spec,account,amount,kind,Date.now(),referralSelection.referral??ZeroAddress);
      assertCurrentFarmSpec(activeReview.spec);
      if (!current()) return;
      setBusy("Rechecking, then waiting for your wallet…");
      await navigator.locks.request(positionLock(account)+":farm-deposit:"+farmId,{ifAvailable:true},async acquired=>{
        if (!acquired) throw Error("A wallet request is open in another tab. Check wallet activity first.");
        if (!current()) return;
        assertCurrentFarmSpec(activeReview.spec); requireClearJournal(account);
        const starting:FarmJournalEntry={hash:null,review:activeReview,state:"requesting",updatedAt:Date.now(),message:"Wallet request started. Check wallet activity before starting another."};
        const storageFailure=record(starting);
        if(storageFailure)throw Error(storageFailure);
        let returnedHash:string|null=null;
        try {
          const hash=await requestReviewedFarmTransaction(activeReview,provider,rpc,current);returnedHash=hash;
          const failure=record({...starting,hash,state:"pending",updatedAt:Date.now(),message:"Submitted. Check its receipt in your wallet; do not resubmit."});
          if(failure)throw Error(failure+" Save this transaction hash: "+hash);
        } catch(reason) {
          const rejected=returnedHash===null&&(reason as {code?:number})?.code===4001;
          const beforeWallet=returnedHash===null&&(reason as {walletRequestStarted?:boolean})?.walletRequestStarted===false;
          const outcome={...starting,hash:returnedHash,state:rejected||beforeWallet?"acknowledged" as const:"uncertain" as const,updatedAt:Date.now(),message:messageOf(reason)+(beforeWallet?" No transaction was requested.":rejected?" No automatic retry was made.":" Check wallet activity; no automatic retry was made.")};
          const failure=record(outcome);
          if(failure)throw Error(outcome.message+" Status could not be saved. "+(returnedHash?"Save this transaction hash: "+returnedHash:"Check wallet activity before trying again."));
        }
      });
    } catch(reason) { if(current())setError(messageOf(reason)); }
    finally { busyLock.current=false; if(mounted.current)setBusy(""); }
  };

  const feedback = error || (submitted?.state === "uncertain" && !submitted.hash ? "Wallet response unavailable. Check your wallet before trying again." : "") || (submitted?.state === "failed" || submitted?.state === "acknowledged" ? submitted.message : "");
  const actionableError = !isRecoveryFeedback(feedback) && !isCancelledFeedback(feedback) && !isRoutineRecoveryResult(feedback) ? feedback : "";
  const actionLabel = (kind: FarmWriteKind, label: string) => busy && busyKind === kind ? busy.includes("wallet") ? "Waiting for wallet…" : "Checking…" : submitted?.state === "pending" && submitted.review.kind === kind ? "Pending…" : label;

  return <>
    <div className="bfc-actions">
      {claimControl ?? <button type="button" className="bfc-harvest-btn" disabled>Claim</button>}
      <label className="farm-sr-only" htmlFor={"farm-amount-" + farmId}>Deposit amount{spec ? " in " + spec.symbol : " (unavailable)"}</label>
      <input id={"farm-amount-" + farmId} className="bfc-amount" type="text" inputMode="decimal" maxLength={110} placeholder={spec ? "Deposit amount · " + spec.symbol : "Amount · not enabled"} value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} disabled={!spec || !!busy || transactionPending || !!journalError} />
      {spec?.tokenAddress && <div className="farm-quick-amounts" role="group" aria-label={"Fill " + spec.symbol + " deposit amount from wallet balance"}>{quickAmounts.map(({percent,value}) => <button type="button" key={percent} disabled={value == null} aria-label={"Use " + (percent === 100 ? "maximum" : percent + "% of") + " " + spec.symbol + " wallet balance"} title="Fill the deposit amount only. Approval and staking are separate wallet transactions." onClick={() => fillAmount(percent)}>{percent === 100 ? "Max" : percent + "%"}</button>)}</div>}
      <div className="bfc-action-grid"><button type="button" className="bfc-deposit-review" disabled={!canPrepare || !validAmount} onClick={() => void prepare("deposit")}>{actionLabel("deposit", "Stake")}</button>{unstakeControl}</div>
      {spec && !spec.tokenAddress ? <div className="bfc-native-note">Native PLS · no token approval</div> : <button type="button" className="bfc-approve-btn" disabled={!canPrepare || !validAmount} onClick={() => void prepare("approve")}>{actionLabel("approve", "Approve exact amount")}</button>}
      {spec?.tokenAddress && <button type="button" className="farm-reset-allowance" disabled={!canPrepare} onClick={() => void prepare("reset-approval")}>{actionLabel("reset-approval", "Reset allowance")}</button>}
      {spec ? <p className="farm-action-status">{!wallet.account ? "Connect your browser wallet to stake." : !connected ? "Switch your wallet to PulseChain to continue." : null} <InfoTooltip label="About staking and approvals">For tokens, approval gives this vault permission to transfer the exact amount shown in your wallet; it does not stake it. Stake is a separate transaction. Native PLS needs no token approval. Filling Max or a percentage changes the amount field only.</InfoTooltip></p> : <p className="farm-action-status">This farm's transactions are not yet verified.</p>}
      {actionableError && <p className="farm-action-error" role="alert">{actionableError}</p>}
      {referralSelection.error && <p className="farm-action-error" role="alert">{referralSelection.error}</p>}
    </div>
  </>;
}
