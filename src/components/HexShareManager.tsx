import { useEffect, useState } from "react";
import { formatEther, formatUnits } from "ethers";
import { useWallet } from "./WalletProvider";
import { ProtocolAction } from "./ProtocolAction";
import { getPublicProvider } from "../lib/chain";
import { hexShareAdapter, readHexSharePosition } from "../lib/hexShareActions";
import { displayFarmAmount } from "../lib/farmDisplay";
import { useAccessRead } from "./useAccessRead";
import { InfoTooltip } from "./InfoTooltip";
import "./access-tools.css";
export function HexShareManager(){
  const wallet=useWallet(),[referral,setReferral]=useState("");
  useEffect(()=>{setReferral("")},[wallet.account]);
  const {data,error,busy}=useAccessRead("hex-shares-"+(wallet.account??"public"),()=>getPublicProvider().then(rpc=>readHexSharePosition(rpc,wallet.account)));
  const registered=data?.registered!==null&&data?.registered!==undefined&&BigInt(data.registered)>0n;
  const available=!!data&&!!wallet.account&&wallet.chainId===369n&&!busy;
  return <section className="professional-card access-tools hex-share-manager" aria-label="HEX share management">
    <header className="card-heading-row"><h2>HEX T-share rewards <InfoTooltip label="About HEX T-share registration">Registration records eligible shares from your existing HEX stakes for OINK rewards. It does not transfer your HEX or end a HEX stake. The contract counts only the first allowed number of stakes, shown below.</InfoTooltip></h2></header>
    <p>Register the shares from your existing HEX stakes to earn OINK. Your HEX stays staked in HEX.</p>
    <p className="hex-share-read-status" role={error?"alert":"status"}>{error||(busy?"Loading HEX shares…":"")}</p>
    <div className="access-facts"><div><span>Registered T-shares</span><strong>{data?.registered!=null?displayFarmAmount(formatUnits(data.registered,12)):wallet.account?"—":"Connect wallet"}</strong></div><div><span>Shares available from HEX</span><strong>{data?.account?displayFarmAmount(formatUnits(data.eligible,12)):wallet.account?"—":"Connect wallet"}</strong></div><div><span>Gross pending OINK <InfoTooltip label="About gross HEX share rewards">This is the reward before the destination's payout split or lock terms. It is not a promise of the OINK amount that will arrive in your wallet.</InfoTooltip></span><strong>{data?.gross!=null?displayFarmAmount(formatEther(data.gross)):wallet.account?"—":"Connect wallet"}</strong></div><div><span>Claim wait after registration <InfoTooltip label="About the HEX registration claim wait">The contract requires its safe period to pass after registration before rewards can be claimed. Registering shares does not claim rewards immediately.</InfoTooltip></span><strong>{data?Number(data.safePeriod)/3600+" hours":"—"}</strong></div></div>
    <p className="hex-share-count-status">{data?.account?`${data.counted} of ${data.count} HEX stakes counted. The contract counts up to ${data.maxStakes} stakes.`:!wallet.account?"Connect your wallet to register shares or manage rewards.":"Reading your eligible HEX stakes…"}</p>
    <div className="hex-share-registration-slot">
      {wallet.account&&!registered&&<><label>Referral wallet (optional)<input placeholder="0x…" value={referral} onChange={e=>setReferral(e.target.value)} autoComplete="off"/></label><ProtocolAction request={{module:"hex-shares",action:"register",args:{referral}}} adapter={hexShareAdapter} label="Register HEX shares" disabled={!available||!data||BigInt(data.eligible)<=0n}/></>}
      {registered&&<p>Your HEX shares are registered.</p>}
    </div>
  </section>;
}
