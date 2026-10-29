import { positionScope } from "../lib/actionJournal";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "./WalletProvider";
import { getPublicProvider } from "../lib/chain";
import { positionJournalBlocks, readPositionJournal, type PositionRequest } from "../lib/positionTransactions";
import { submitPositionDirect, type PositionDirectStage } from "../lib/positionDirectFlow";
import { isCancelledFeedback, isRecoveryFeedback } from "../lib/transactionFeedback";
import { listPendingTransactions as listRecoverableRequests } from "../lib/pendingTransactions";
import "./farm-transactions.css";
import "./position-previews.css";

const message = (reason: unknown) => reason instanceof Error ? reason.message : "The request could not be completed.";
export function PositionTransaction({ request, label, disabled = false }: { request: PositionRequest; label: string; disabled?: boolean }) {
  const wallet = useWallet(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [stage, setStage] = useState<PositionDirectStage | "idle">("idle"), [status, setStatus] = useState("");
  const pending = useRef(false), generation = useRef(0), mounted = useRef(false);
  const requestKey = JSON.stringify(request), identity = [wallet.revision, wallet.account, wallet.chainId, requestKey, disabled].join(":"), active = useRef(identity);
  active.current = identity;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; ++generation.current; }; }, []);
  useEffect(() => {
    ++generation.current; setError(""); setStage("idle"); setStatus("");
    const recover = () => {
      if (pending.current || !wallet.account) return;
      try {
        const entry = readPositionJournal(wallet.account, localStorage, request);
        if (!entry || positionScope(entry.review.request) !== positionScope(request)) return;
        setStatus(entry.message);
        if (!positionJournalBlocks(entry)) setError(entry.state === "failed" ? entry.message : "");
        setStage(positionJournalBlocks(entry) ? entry.state === "pending" ? "pending" : "uncertain" : "idle");
      } catch { /* The submit path reports unreadable journals before any wallet request. */ }
    };
    recover(); window.addEventListener("oink-position-journal", recover);
    return () => { ++generation.current; window.removeEventListener("oink-position-journal", recover); };
  }, [identity]);
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
  const submit = async () => {
    if (disabled || pending.current || !wallet.account || wallet.chainId !== 369n || !wallet.provider || stage === "pending" || stage === "uncertain") return;
    pending.current = true; setBusy(true); setError(""); setStatus(""); setStage("checking");
    const started = identity, run = ++generation.current, provider = wallet.provider, account = wallet.account, selected = structuredClone(request);
    const current = () => mounted.current && active.current === started && generation.current === run;
    try {
      const outcome = await submitPositionDirect({
        account, request: selected, provider, rpc: await getPublicProvider(), current,
        onStage: (next, text, transactionHash) => { if (current()) { setStage(next === "uncertain" && !transactionHash ? "rejected" : next); setStatus(next === "uncertain" && !transactionHash ? "Wallet response unavailable. Check your wallet before trying again." : text ?? ""); } },
      });
      // A receipt can settle while the wallet promise is unwinding. Its journal
      // event may arrive while pending is still true, so reconcile that result.
      if (current() && outcome.hash) {
        try {
          const latest = readPositionJournal(account, localStorage, request);
          if (latest?.hash === outcome.hash && !positionJournalBlocks(latest)) { setStage("idle"); setStatus(latest.message); setError(latest.state === "failed" ? latest.message : ""); }
        } catch { /* The saved request remains available in manual recovery. */ }
      }
    } catch (reason) {
      if (current()) {
        const failure = reason as { hash?: string | null; journal?: unknown; walletRequestStarted?: boolean };
        setError(message(reason));
        if (failure?.hash) { setStage("uncertain"); }
        else setStage("rejected");
      }
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  const feedback = error || (stage === "rejected" ? status : "");
  const actionableError = !isRecoveryFeedback(feedback) && !isCancelledFeedback(feedback) ? feedback : "";
  return <div className="position-write-control">
    <button type="button" disabled={disabled || busy || stage === "pending" || stage === "uncertain" || !wallet.account || wallet.chainId !== 369n || !wallet.provider} onClick={() => void submit()}>{busy ? stage === "wallet" ? "Waiting for wallet…" : "Checking…" : stage === "pending" ? "Submitted" : label}</button>
    {actionableError && <p className="farm-action-error" role="alert">{actionableError}</p>}
  </div>;
}
