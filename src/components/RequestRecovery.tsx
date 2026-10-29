import { useEffect, useRef, useState } from "react";
import { useWallet } from "./WalletProvider";
import { listPendingTransactions, type PendingTransaction } from "../lib/pendingTransactions";
import "./request-recovery.css";

/** Optional activity view. Never blocks, sends, retries or clears requests. */
export function RequestRecovery() {
  const wallet=useWallet(), identity=[wallet.account?.toLowerCase(),wallet.revision,wallet.chainId].join(":");
  const [opened,setOpened]=useState<string|null>(null);
  const [snapshot,setSnapshot]=useState<{identity:string;rows:PendingTransaction[]}>({identity,rows:[]});
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{
    setOpened(null);
    const account=wallet.account;
    const reload=()=>setSnapshot({identity,rows:account?listPendingTransactions(account):[]});
    const open=()=>{if(account){reload();setOpened(identity);}};
    const events=["storage","oink-position-journal","oink-protocol-journal","oink-farm-journal","oink-positions-changed"];
    events.forEach(name=>window.addEventListener(name,reload));
    window.addEventListener("oink-open-request-recovery",open);
    reload();
    return()=>{events.forEach(name=>window.removeEventListener(name,reload));window.removeEventListener("oink-open-request-recovery",open);};
  },[identity,wallet.account]);
  useEffect(()=>{if(opened===identity){panel.current?.scrollIntoView({block:"start"});panel.current?.focus({preventScroll:true});}},[opened,identity]);
  if(!wallet.account||opened!==identity||snapshot.identity!==identity)return null;
  return <section className="request-recovery" aria-label="Transactions" ref={panel} tabIndex={-1}>
    <div className="request-recovery-row"><h2>Transactions</h2><button type="button" onClick={()=>setOpened(null)}>Close</button></div>
    {!snapshot.rows.length&&<p>No pending transactions.</p>}
    {snapshot.rows.map(row=><div className="request-recovery-card request-recovery-row" key={row.id}><span>{row.label} · Pending</span><a href={"https://scan.pulsechain.com/tx/"+row.hash} target="_blank" rel="noreferrer">View in explorer ↗</a></div>)}
  </section>;
}
