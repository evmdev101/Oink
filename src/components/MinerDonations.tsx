import { useEffect, useRef, useState } from "react";
import { formatEther, getAddress, isAddress } from "ethers";
import { TIME_MINER_CONTRACTS, explorerUrl } from "../config/contracts";
import { getPublicProvider } from "../lib/chain";
import { displayFarmAmount } from "../lib/farmDisplay";
import { donationMandatorySeconds, minerDonationAdapter, readMinerDonation, type MinerDonationState } from "../lib/minerDonationTransactions";
import { readProtocolJournal } from "../lib/protocolTransactionJournal";
import { ProtocolAction } from "./ProtocolAction";
import { useWallet } from "./WalletProvider";
import { InfoTooltip } from "./InfoTooltip";

export function MinerDonations() {
  const wallet=useWallet(),[recipient,setRecipient]=useState(""),[miner,setMiner]=useState("one-year"),[mandatoryDays,setMandatoryDays]=useState("0");
  const [callback,setCallback]=useState(""),[state,setState]=useState<MinerDonationState|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [amount,setAmount]=useState(""),[credit,setCredit]=useState(""),[delay,setDelay]=useState("24"),generation=useRef(0);
  const currentAccount=useRef(wallet.account);currentAccount.current=wallet.account;
  const key=wallet.account?"oink:miner-donation:"+getAddress(wallet.account).toLowerCase():"";
  useEffect(()=>()=>{++generation.current;},[]);
  useEffect(()=>{++generation.current;setBusy(false);setState(null);setError("");setRecipient(wallet.account??"");try{setCallback(key?localStorage.getItem(key)??"":"");}catch{setCallback("");}},[key]);
  useEffect(()=>{
    const confirmed=()=>{try{if(!wallet.account)return;const journal=readProtocolJournal(wallet.account);if(journal?.state==="confirmed"&&journal.review.request.module==="miner-donation"&&journal.review.request.action==="deploy"){const address=journal.review.quote.to;setCallback(address);setState(null);try{localStorage.setItem(key,address);}catch{/* Address remains visible even if convenience storage is unavailable. */}}}catch{/* Each action surfaces journal problems before sending. */}};
    confirmed();window.addEventListener("oink-protocol-confirmed",confirmed);return()=>window.removeEventListener("oink-protocol-confirmed",confirmed);
  },[wallet.account,key]);
  let mandatoryError="";try{donationMandatorySeconds(mandatoryDays);}catch(reason){mandatoryError=reason instanceof Error?reason.message:"Enter mandatory service in days.";}
  const load=async()=>{if(!isAddress(callback))return;const run=++generation.current,account=currentAccount.current;setBusy(true);setError("");setState(null);try{const result=await readMinerDonation(await getPublicProvider(),callback);if(run===generation.current&&account===currentAccount.current){setState(result);if(key)try{localStorage.setItem(key,result.callback);}catch{/* Convenience only. */}}}catch(reason){if(run===generation.current)setError(reason instanceof Error?reason.message:"Unable to inspect this donation callback.");}finally{if(run===generation.current)setBusy(false);}};
  const changeCallback=(value:string)=>{++generation.current;setCallback(value);setState(null);setBusy(false);setError("");};
  return <section className="miner-donations-workspace">
    <header><h1>Miner donations</h1><p>Request a time miner funded by the protocol treasury. The community must approve the funding through voting.</p></header>
    <div className="miner-donation-grid">
      <section className="professional-card action-card"><h2>1. Create donation callback <InfoTooltip label="About the donation callback">This new helper contract permanently fixes the recipient wallet, miner duration and mandatory service. Deployment spends PLS gas but does not fund the miner or take OINK from your wallet. Mandatory service blocks the recipient's withdrawal until that time has been served.</InfoTooltip></h2>
        <p>This small contract fixes who receives the miner and its mandatory service. Creating it only costs PLS gas; it does not fund the miner.</p>
        <label>Recipient wallet<input value={recipient} placeholder="0x…" onChange={e=>setRecipient(e.target.value)} spellCheck={false} autoComplete="off" /></label>
        <label>Miner duration<select value={miner} onChange={e=>setMiner(e.target.value)}>{TIME_MINER_CONTRACTS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
        <label>Mandatory service in days<input inputMode="numeric" value={mandatoryDays} onChange={e=>setMandatoryDays(e.target.value)} /></label>
        {mandatoryError&&<p role="status">{mandatoryError}</p>}
        <p>During mandatory service the recipient cannot withdraw. Afterward, the miner's normal early and late exit rules still apply.</p>
        <ProtocolAction adapter={minerDonationAdapter} label="Create donation callback" disabled={!isAddress(recipient)||!!mandatoryError} request={{module:"miner-donation",action:"deploy",args:{recipient,miner,mandatoryDays}}} />
        <details><summary>Helper source and build</summary><p>This is a new helper based on the original OINK IssueStake code, compiled for the current OINK token. The site checks its source hash, runtime hash, bytecode and fixed recipient before opening your wallet.</p><p><a href={import.meta.env.BASE_URL+"contracts/IssueStake.sol"} target="_blank" rel="noreferrer">View this helper's complete source ↗</a></p><a href="https://github.com/OINK-pls/PiggyBank/blob/cf49720c083f098b2fb7c8c636cfa0e91ae8be05/contracts/helper/stakeDonation.sol" target="_blank" rel="noreferrer">Original helper reference ↗</a></details>
      </section>
      <section className="professional-card action-card"><h2>2. Inspect and request funding <InfoTooltip label="About donation funding requests">The site verifies the callback before creating a treasury funding proposal. Creating a proposal spends voting credit; community voting decides whether the treasury pays it. Requested funding plus the callback's current balance must reach the miner's current minimum gift amount.</InfoTooltip></h2>
        <p>After deployment confirms, its address appears here. You can also open an existing callback; the site verifies its complete code and fixed settings.</p>
        <label>Donation callback address<input value={callback} placeholder="0x…" onChange={e=>changeCallback(e.target.value)} spellCheck={false} autoComplete="off" /></label>
        <button type="button" disabled={!isAddress(callback)||busy} onClick={()=>void load()}>{busy?"Checking callback…":"Check callback"}</button>
        {error&&<p role="alert">{error}</p>}
        <div className="miner-donation-readout" aria-live="polite">{state?<><dl><dt>Recipient</dt><dd>{state.recipient}</dd><dt>Miner</dt><dd>{state.minerLabel}</dd><dt>Mandatory service</dt><dd>{formatEther(BigInt(state.mandatorySeconds)*10n**18n/86400n)} days</dd><dt>Available funding</dt><dd>{displayFarmAmount(formatEther(BigInt(state.balance)))} OINK</dd></dl><a href={explorerUrl(state.callback)} target="_blank" rel="noreferrer">View callback ↗</a></>:<p>Callback details appear after verification.</p>}</div>
        <label>OINK to request<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} /></label>
        <label>Voting credit to spend<input inputMode="decimal" value={credit} onChange={e=>setCredit(e.target.value)} /></label>
        <label>Initial voting window in hours<input inputMode="numeric" value={delay} onChange={e=>setDelay(e.target.value)} /></label>
        <ProtocolAction adapter={minerDonationAdapter} label="Submit funding request" disabled={!state||!amount||!credit||!delay} request={{module:"miner-donation",action:"propose",args:{callback,amount,credit,delay}}} />
        <p>Creating the request spends voting credit. Follow its vote and approval in <a href="#/governance#senate">Treasury &amp; Senate</a>. A request can be rejected.</p>
      </section>
      <section className="professional-card action-card"><h2>3. Activate funded miner <InfoTooltip label="About donation miner activation">Once funded, anyone can pay the gas to commit the callback's entire OINK balance to the fixed recipient's miner. The miner starts when activation is mined, and its normal duration, exit penalties and fixed mandatory service then apply.</InfoTooltip></h2><p>Once approved OINK funding reaches the callback, anyone can pay the gas to create the miner for its fixed recipient.</p>
        <ProtocolAction adapter={minerDonationAdapter} label="Activate funded miner" disabled={!state||BigInt(state.balance)<=0n||BigInt(state.balance)<BigInt(state.minimumGift)} request={{module:"miner-donation",action:"activate",args:{callback}}} onConfirmed={()=>void load()} />
        <p>The callback commits its entire OINK balance. Refresh the callback to see new funding, and view the resulting miner under My miners.</p>
      </section>
    </div>
  </section>;
}

