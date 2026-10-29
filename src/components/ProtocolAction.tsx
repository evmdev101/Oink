import { protocolScope } from "../lib/actionJournal";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "./WalletProvider";
import { getPublicProvider } from "../lib/chain";
import type { ProtocolAdapter, ProtocolRequest } from "../lib/protocolTransactions";
import { protocolJournalBlocks, readProtocolJournal, type ProtocolJournal } from "../lib/protocolTransactionJournal";
import { submitProtocolDirect, type ProtocolDirectStage } from "../lib/protocolDirectFlow";
import { isGovernanceActionDisabled, actionPauseNotice } from "../config/publicPreview";
import { isCancelledFeedback, isRecoveryFeedback, isRoutineRecoveryResult } from "../lib/transactionFeedback";
import { listPendingTransactions as listRecoverableRequests } from "../lib/pendingTransactions";

const message=(reason:unknown)=>reason instanceof Error?reason.message:"Action could not be completed.";
export function ProtocolAction({request,adapter,label,disabled=false,onConfirmed}:{request:ProtocolRequest;adapter:ProtocolAdapter;label:string;disabled?:boolean;onConfirmed?:()=>void}) {
  const governancePaused = isGovernanceActionDisabled(request);
  disabled = disabled || governancePaused;
  const wallet=useWallet(),[busy,setBusy]=useState(false),[stage,setStage]=useState<ProtocolDirectStage>("checking"),[error,setError]=useState("");
  const [outcome,setOutcome]=useState<ProtocolJournal|null>(null);
  const pending=useRef(false),generation=useRef(0),mounted=useRef(false);
  const identity=JSON.stringify([request,wallet.revision,wallet.account,String(wallet.chainId),disabled]);
  const live=useRef({identity,provider:wallet.provider,adapter,disabled});
  live.current={identity,provider:wallet.provider,adapter,disabled};
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;++generation.current;};},[]);
  useEffect(()=>{++generation.current;setError("");setOutcome(null);},[identity,adapter]);
  const act=async()=>{
    if(disabled||pending.current||protocolJournalBlocks(outcome)||!wallet.account||!wallet.provider||wallet.chainId!==369n)return;
    pending.current=true;setBusy(true);setStage("checking");setError("");
    const run=++generation.current,started=live.current,account=wallet.account,provider=wallet.provider;
    const current=()=>mounted.current&&generation.current===run&&!live.current.disabled&&live.current.identity===started.identity&&live.current.provider===provider&&live.current.adapter===adapter;
    try{
      const rpc=await getPublicProvider();
      const result=await submitProtocolDirect({account,request,adapter,rpc,provider,current,onStage:(next,text)=>{
        if(!current())return;setStage(next);if(next==="rejected"||next==="uncertain")setError(text??"Check wallet activity before trying again.");
      }});
      if(current()){
        let saved:ProtocolJournal|null=null;
        try{saved=readProtocolJournal(account,localStorage,request);}catch{/* Keep the in-memory outcome and its hash for recovery. */}
        setOutcome(saved&&saved.hash===result.hash&&JSON.stringify(saved.review.request)===JSON.stringify(request)?saved:result);
        if(result.state === "uncertain" && !result.hash)setError("Wallet response unavailable. Check your wallet before trying again.");
      }
    }catch(reason){if(current()){setError(message(reason));const failed=reason as {journal?:ProtocolJournal};if(failed.journal)setOutcome(failed.journal);}}
    finally{pending.current=false;if(mounted.current)setBusy(false);}
  };
  useEffect(()=>{
    const completed=(event?:Event)=>{try{const entry=wallet.account?readProtocolJournal(wallet.account,localStorage,request):null;if(entry&&protocolScope(entry.review.request)===protocolScope(request)){setOutcome(entry);if(!protocolJournalBlocks(entry))setError("");if(event?.type==="oink-protocol-confirmed"&&entry.state==="confirmed")onConfirmed?.();}}catch{/* Saved-request errors are surfaced before a new wallet request. */}};
    completed();
    window.addEventListener("oink-protocol-confirmed",completed);
    window.addEventListener("oink-protocol-journal",completed);window.addEventListener("storage",completed);
    return()=>{window.removeEventListener("oink-protocol-confirmed",completed);window.removeEventListener("oink-protocol-journal",completed);window.removeEventListener("storage",completed);};
  },[onConfirmed,identity,wallet.account]);
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
  const feedback = error || (outcome?.state === "failed" || outcome?.state === "resolved" ? outcome.message : "");
  const actionableError = !isRecoveryFeedback(feedback) && !isCancelledFeedback(feedback) && !isRoutineRecoveryResult(feedback) ? feedback : "";
  return <>
    <button type="button" title={governancePaused ? actionPauseNotice(request) : undefined} disabled={disabled||busy||protocolJournalBlocks(outcome)||!wallet.account||!wallet.provider||wallet.chainId!==369n} onClick={()=>void act()}>{busy?stage==="wallet"?"Confirm in wallet…":"Checking…":outcome?.state==="pending"?"Submitted":label}</button>
    {governancePaused&&<p className="governance-pause-note">{request.module === "community-maintenance" ? "Maintenance actions are temporarily disabled." : "Governance actions are temporarily disabled."}</p>}
    {actionableError&&<p className="farm-action-error" role="alert">{actionableError}</p>}
  </>;
}
