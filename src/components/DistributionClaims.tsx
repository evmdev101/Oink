import { useEffect, useState } from "react";
import { formatEther,formatUnits } from "ethers";
import { DISTRIBUTIONS,type DistributionId } from "../config/accessVerification";
import { getPublicProvider } from "../lib/chain";
import { distributionAdapter,readDistribution } from "../lib/distributionClaims";
import { displayFarmAmount } from "../lib/farmDisplay";
import { useWallet } from "./WalletProvider";
import { ProtocolAction } from "./ProtocolAction";
import { useAccessRead } from "./useAccessRead";
import { InfoTooltip } from "./InfoTooltip";
import "./access-tools.css";
function DistributionCard({id}:{id:DistributionId}){
  const wallet=useWallet(),[amount,setAmount]=useState(""),[destination,setDestination]=useState("wallet");
  useEffect(()=>{setAmount("");setDestination("wallet")},[wallet.account]);
  const {data,error,busy}=useAccessRead("distribution-"+id+"-"+(wallet.account??"public"),()=>getPublicProvider().then(rpc=>readDistribution(rpc,id,wallet.account)));
  const label=DISTRIBUTIONS.find(v=>v.id===id)!.label;
  const canClaim=!!data&&data.remaining!==null&&BigInt(data.remaining)>0n&&BigInt(data.credit)>0n&&!!wallet.account&&wallet.chainId===369n&&!busy;
  return <article className="professional-card access-tools distribution-status-card">
    <header className="card-heading-row"><h3>{label}</h3></header>
    <p className="access-read-status" role="status">{error||(!data&&busy?"Checking distribution…":"")}</p>
    <div className="access-facts">
      <div><span className="info-label">Contract reward credit<InfoTooltip label="About distribution reward credit">This is the distribution contract's remaining reward credit, shared across eligible claims. It is not your personal allocation. An eligible wallet can still be unable to claim if contract credit is exhausted or current claim conditions fail.</InfoTooltip></span><strong>{data?displayFarmAmount(formatEther(data.credit))+" OINK":"—"}</strong></div>
      <div><span className="info-label">Your remaining allocation<InfoTooltip label="About remaining distribution allocation">The site's published proof is checked against the contract's current distribution root, then prior redemptions are subtracted. The full amount you redeem is consumed; the selected destination's payout rate determines the OINK received, and a miner destination locks that payout.</InfoTooltip></span><strong>{!wallet.account?"Connect wallet":!data?"—":data.remaining===null?"Not listed":displayFarmAmount(formatEther(data.remaining))+" OINK"}</strong></div>
    </div>
    <div className="distribution-allocation-notes">
      {!wallet.account&&<p>Connect a wallet to check its published proof and remaining allocation.</p>}
      {data&&<>
        {wallet.account&&data.allocation!==null&&<p>Allocation: {displayFarmAmount(formatEther(data.allocation))} OINK · Already redeemed: {displayFarmAmount(formatEther(data.redeemed!))} OINK</p>}
        {wallet.account&&data.remaining===null&&<p>This wallet is not listed in the published proofs for this distribution.</p>}
        {BigInt(data.credit)===0n&&<p>This distribution has no reward credit remaining. A listed allocation does not guarantee a payable claim.</p>}
        {data.sweepAfter!==null&&data.timestamp>data.sweepAfter&&<p>The original claim period has elapsed. Remaining credit can be swept; any claim must still pass a fresh simulation.</p>}
      </>}
    </div>
    <details className="distribution-claim-controls">
      <summary>Redeem an allocation</summary>
      <p className="access-read-status" role="status">{!wallet.account?"Connect a wallet to check its allocation.":!data?"Waiting for the allocation check.":data.remaining===null||BigInt(data.remaining)===0n?"No remaining allocation is available for this wallet.":""}</p>
      <fieldset disabled={!canClaim}>
        <label>Allocation to redeem<div className="access-input"><input inputMode="decimal" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)}/><button type="button" onClick={()=>data?.remaining&&setAmount(formatEther(data.remaining))}>Max</button></div></label>
        <label>Receive into<select value={destination} onChange={e=>setDestination(e.target.value)}><option value="wallet">My wallet · {data?formatUnits(data.direct,2)+"% payout":"payout pending"}</option>{data?.destinations.map(v=><option value={v.id} key={v.id} disabled={BigInt(v.payout)===0n}>{v.label} miner · {formatUnits(v.payout,2)}% payout</option>)}</select></label>
        <p>You redeem the full entered allocation. The payout percentage determines how much OINK you receive. Miner destinations lock the payout.</p>
        <ProtocolAction request={{module:"distribution",action:"claim",args:{distribution:id,amount,destination}}} adapter={distributionAdapter} label="Claim allocation" disabled={!canClaim||!amount}/>
      </fieldset>
    </details>
  </article>;
}
export function DistributionClaims(){return <section className="access-tools" aria-label="Distribution claims"><h2>Launch distribution claims</h2><p>Check contributor and launch reward allocations. These are separate from your farm and ongoing referral rewards.</p><div className="professional-grid two-columns">{DISTRIBUTIONS.map(row=><DistributionCard key={row.id} id={row.id}/>)}</div></section>}


