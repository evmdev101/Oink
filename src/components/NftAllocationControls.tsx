import { GovernanceCandidates } from "./GovernanceCandidates";
import { nftActionEligibility } from "../lib/nftAllocationActions";
import { useEffect, useRef, useState } from "react";
import { formatEther } from "ethers";
import { getPublicProvider } from "../lib/chain";
import { checkedParticipationSnapshot, participationAdapter } from "../lib/participationTransactions";
import { readNftAllocation } from "../lib/nftAllocationState";
import { nftAllocationAdapter } from "../lib/nftAllocationActions";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { ProtocolAction } from "./ProtocolAction";
import { useWallet } from "./WalletProvider";

export function NftAllocationControls({onConfirmed,active=false}:{onConfirmed:()=>void;active?:boolean}) {
  const wallet=useWallet(),[candidate,setCandidate]=useState(""),[action,setAction]=useState("notify"),[minerId,setMinerId]=useState<string>(MINER_PREVIEW_SPECS[0].id),[stance,setStance]=useState("support"),[voters,setVoters]=useState("");
  const [row,setRow]=useState<Awaited<ReturnType<typeof readNftAllocation>>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const generation=useRef(0);
  useEffect(()=>{++generation.current;setRow(null);setError("");setBusy(false);return()=>{++generation.current;};},[candidate,wallet.revision]);
  const load=async()=>{
    const run=++generation.current;setBusy(true);setError("");setRow(null);
    try{const rpc=await getPublicProvider(),s=await checkedParticipationSnapshot(rpc,wallet.account??"0x0000000000000000000000000000000000000002"),value=await readNftAllocation(rpc,s,candidate);await s.finish();if(run===generation.current)setRow(value);}
    catch(e){if(run===generation.current)setError(e instanceof Error?e.message:"Unable to load allocation details.");}
    finally{if(run===generation.current)setBusy(false);}
  };
  const confirmed=()=>{setRow(null);onConfirmed();};
  const voting=action==="vote"||action==="delegated-vote";
  let eligibility="Load candidate details to see its current status.";
  if(row&&!voting){try{nftActionEligibility(action,row,BigInt(Math.floor(Date.now()/1000)));eligibility="Current candidate requirements are met; the site checks balances and permissions again before opening your wallet.";}catch(e){eligibility=e instanceof Error?e.message:"Candidate is not eligible.";}}
  return <section className="professional-card governance-composer"><h3>NFT allocation governance</h3>
    <p>Announce a candidate, gather miner votes, then propose and approve its NFT reward rules after the waiting period.</p>
    {!wallet.account&&<p>Public details are available without connecting. Connect your wallet to continue.</p>}
    <GovernanceCandidates kind="nft" active={active} onSelect={row=>setCandidate(row.address)}/>
    <div className="protocol-form">
      <label>Allocation contract address<input placeholder="0x…" value={candidate} onChange={e=>setCandidate(e.target.value)}/></label>
      <button type="button" onClick={()=>void load()} disabled={busy||!candidate}>{busy?"Loading allocation…":"Load candidate details"}</button>
      {error&&<p role="alert">{error}</p>}
      {row&&<div><p><strong>{row.approved?"Approved":row.pending[0]?"Pending approval":"Not pending"}</strong></p><p>Support: {formatEther(row.yes)} weighted OINK · Opposition: {formatEther(row.no)} weighted OINK</p><p>Proposal requires more than {Number(row.approveThreshold)/10}% of total weighted miner power. Rejection requires more than {Number(row.rejectThreshold)/10}% of committed support.</p>{row.pending[0]&&<p>Approval eligible after {new Date(Number(row.pending[1]+row.rejectionPeriod)*1000).toLocaleString()}.</p>}</div>}
      <label>Action<select value={action} onChange={e=>setAction(e.target.value)}><option value="notify">Announce candidate (spends credit)</option><option value="vote">Vote with my miner shares</option><option value="delegated-vote">Vote for delegated wallets</option><option value="propose">Start approval waiting period</option><option value="update">Record increased support</option><option value="reject">Reject pending candidate</option><option value="approve">Approve allocation contract</option></select></label>
      {voting&&<><label>Miner<select value={minerId} onChange={e=>setMinerId(e.target.value)}>{MINER_PREVIEW_SPECS.map(m=><option key={m.id} value={m.id}>{m.durationDays} days</option>)}</select></label><label>Position<select value={stance} onChange={e=>setStance(e.target.value)}><option value="support">Support allocation</option><option value="oppose">Oppose allocation</option><option value="neutral">Stop voting in this miner</option></select></label><p>This moves your entire voting power in the selected miner. It does not withdraw OINK or spend voting credit.</p>{action==="delegated-vote"&&<label>Delegating wallet addresses<textarea rows={3} placeholder="One wallet address per line" value={voters} onChange={e=>setVoters(e.target.value)}/></label>}</>}
      {!voting&&<p role="status">{eligibility}</p>}
      {voting?<ProtocolAction request={{module:"participation",action:action==="vote"?"miner-vote":"delegated-vote",args:{targetKind:stance==="neutral"?"neutral":"nft",candidate,minerId,stance,voters}}} adapter={participationAdapter} label="Cast NFT miner vote" disabled={stance!=="neutral"&&!candidate} onConfirmed={confirmed}/>:<ProtocolAction request={{module:"nft-allocation",action,args:{candidate}}} adapter={nftAllocationAdapter} label="Continue in wallet" disabled={!candidate} onConfirmed={confirmed}/>}
    </div>
  </section>;
}

