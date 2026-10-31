import { useState } from "react";
import { formatUnits } from "ethers";
import { Link } from "react-router-dom";
import { getPublicProvider } from "../lib/chain";
import { readMaintenanceStatus } from "../lib/maintenanceStatus";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { displayFarmAmount } from "../lib/farmDisplay";
import { COMMUNITY_MAINTENANCE_ACTIONS, COMMUNITY_FEE_FARMS, communityMaintenanceAdapter, type CommunityMaintenanceAction } from "../lib/communityMaintenanceActions";
import { ProtocolAction } from "./ProtocolAction";
import { useWallet } from "./WalletProvider";
import { useAccessRead } from "./useAccessRead";
import { LiveNumber } from "./LiveNumber";
import { InfoTooltip } from "./InfoTooltip";
import { MAINTENANCE_ACTIONS_DISABLED } from "../config/publicPreview";
import "./access-tools.css";

const FEE_FARMS = [["pls","PLS"],["plsx","PLSX"],["inc","INC"],["hex","HEX"],["atropa","ATROPA"],["pdai","pDAI"],["solidx","SolidX"],["hoa","HOA"],["pusdt","pUSDT"],["pusdc","pUSDC"],["pdrip","pDRIP"],["emit","EMIT"]] as const;
const MAINTENANCE_HELP:Record<CommunityMaintenanceAction,string>={
  "buyback":"The buyback uses PLS already held by the protocol's buyback contract. Purchased OINK goes to the treasury, not the person triggering it. Your wallet pays the network fee. The contract's daily allowance, halt rules and current swap quote determine whether execution is available.",
  "convert-buyback":"This converts the selected token balance held by the buyback contract into PLS for future OINK purchases. It does not swap tokens from your wallet. The deployed contract uses its full available token balance; inspect the amounts and destination in the review.",
  "harvest-pulsex":"Collect the protocol farmer's INC rewards from PulseX and forward them to the buyback contract. These are protocol rewards, separate from your personal farm claims. You pay the PLS network fee to trigger the action.",
  "sync-staking":"Updates reward weights for the six OINK time-miner pools using their current balances. It does not withdraw or renew your miners. Changing weights affects how future protocol rewards are divided between durations.",
  "start-event":"A community Reward Boost proposal must satisfy its voting and timing rules before execution. Starting it can change emissions and apply the proposal's OINK burn. Passing a vote does not automatically run the event; the review checks the exact selected proposal.",
  "end-event":"Closes an active Reward Boost after its specified end block and applies the next emission rate. Eligibility follows the chain's block number, so a wall-clock countdown is only an estimate. This action does not claim your personal rewards.",
  "reduce-rewards":"After the seven-day waiting period, this reduces the ecosystem maximum by 1% of its current value. For example, 30% becomes 29.7%. Applying the reduced cap to allocations and updating live farm weights are separate actions.",
  "cap-ecosystem":"When the total ecosystem allocation exceeds its maximum, this proportionally reduces the configured percentages to fit the cap. It changes reward allocation settings, not the tokens in your wallet. Rebalance ecosystem rewards afterward to update live farm weights.",
  "rebalance-ecosystem":"Applies the current community-approved ecosystem percentages to the reward distributor's farm weights. Allocations describe each pool's reward share; they are not the APR or payout percentage of your wallet.",
  "collect-fees":"Collects existing hourly funding fees from the listed wallets' current farm positions into the treasury. Collection reduces their recorded principal; it does not create a new fee or pay proceeds to the caller. Each collection is capped at 20% of a position. Token transfer taxes can reduce the treasury's actual receipt.",
  "sync-fees":"Updates a core farm to the Governor's current deposit and funding fees. Funding-rate changes reset the farm's funding timestamp, so existing due fees should be collected first. This updates shared farm rules, rather than paying a fee on your own wallet's behalf.",
  "harvest-senate":"Distributes accrued protocol mining credit among current Senate members using the contract's fair-mint rule. Mining credit is separate from ordinary voting credit. The site checks the current member list and that credit is actually available before review.",
  "publish-senate-credit":"This spends all available mining credit attributed to your wallet and mints OINK to the Senate contract. It does not spend credit belonging to the Senate or mint OINK to your wallet. Check the reviewed credit amount and Senate recipient before confirming.",
};

function MaintenanceActionCard({ action, availability:readiness, buyback, disabled, onConfirmed }: {
  action: typeof COMMUNITY_MAINTENANCE_ACTIONS[number]; availability?: {ready:boolean;reason:string}; buyback?:Awaited<ReturnType<typeof readMaintenanceStatus>>["buyback"]; disabled:boolean; onConfirmed:()=>void;
}) {
  const wallet = useWallet();
  const [asset,setAsset] = useState("PLSX"),[eventId,setEventId] = useState(""),[farmId,setFarmId] = useState("pls"),[users,setUsers] = useState("");
  const id: CommunityMaintenanceAction = action.id;
  const unsupportedFeeFarm = id === "collect-fees" && !COMMUNITY_FEE_FARMS.some(farm=>farm.id===farmId);
  const availability = unsupportedFeeFarm ? {ready:false,reason:farmId === "pdrip" ? "pDRIP's current token implementation has no published source. Fee collection is available through the original site's maintenance page; this site cannot verify its token effects." : "This farm needs a separate review of its token fees before local fee collection can be enabled."} : id === "collect-fees" && farmId === "emit" && readiness ? {...readiness,reason:"EMIT fees are deducted from recorded stakes. Token transfer taxes can make the treasury receive less. Current positions and due fees are checked before review."} : readiness;
  const args:Record<string,string> = id === "convert-buyback" ? {asset} : id === "start-event" ? {id:eventId} : id === "collect-fees" ? {farmId,users} : id === "sync-fees" ? {farmId} : {};
  const fieldsReady = id === "start-event" ? /^(0|[1-9]\d*)$/.test(eventId) : id === "collect-fees" ? !!users.trim() : true;
  const tokenBalance=buyback?.tokens.find(token=>token.asset===asset)?.balance;
  const tokenDecimals=VERIFIED_FARM_WRITES.find(farm=>farm.symbol===asset)?.decimals??18;
  return <article className={"maintenance-action-card maintenance-action-"+id} aria-labelledby={"maintenance-"+id}>
    <header><div className="info-heading"><h3 id={"maintenance-"+id}>{action.title}</h3><InfoTooltip label={"About "+action.title}>{MAINTENANCE_HELP[id]}</InfoTooltip></div><span className={"maintenance-availability"+(!MAINTENANCE_ACTIONS_DISABLED&&availability?.ready?" is-ready":"")}>{MAINTENANCE_ACTIONS_DISABLED ? "Paused" : availability ? availability.ready ? "Available" : "Conditions apply" : "Checking"}</span></header>
    <p className="maintenance-action-description">{action.description}</p>
    {id === "buyback" && <dl className="maintenance-balance-readout"><div><dt>Contract PLS</dt><dd><LiveNumber value={buyback?.pls} format={value=>displayFarmAmount(formatUnits(value,18))}/></dd></div><div><dt>Daily PLS allowance</dt><dd><LiveNumber value={buyback?.remainingDailyAllowance} format={value=>displayFarmAmount(formatUnits(value,18))}/></dd></div></dl>}
    <div className="maintenance-action-fields">
      {id === "convert-buyback" && <><label>Asset to convert<select value={asset} onChange={e=>setAsset(e.target.value)}><option>PLSX</option><option>INC</option><option>HEX</option></select></label><dl className="maintenance-balance-readout"><div><dt>Contract {asset}</dt><dd><LiveNumber value={tokenBalance} format={value=>displayFarmAmount(formatUnits(value,tokenDecimals))}/></dd></div></dl></>}
      {id === "start-event" && <label>Approved reward event number<input value={eventId} onChange={e=>setEventId(e.target.value)} inputMode="numeric" placeholder="Event number" autoComplete="off"/><Link to="/governance">View reward event proposals →</Link></label>}
      {(id === "collect-fees" || id === "sync-fees") && <label>Farm<select value={farmId} onChange={e=>setFarmId(e.target.value)}>{FEE_FARMS.filter(([value])=>id === "collect-fees" || ["pls","plsx","inc","hex"].includes(value)).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>}
      {id === "collect-fees" && <label>Wallets whose mining fees should be collected<textarea value={users} onChange={e=>setUsers(e.target.value)} placeholder="Paste wallet addresses, separated by commas or new lines" maxLength={2500} spellCheck={false}/><span className="maintenance-field-hint">Up to 50 wallets. Current positions and fees are checked before review.</span><button className="maintenance-use-wallet" type="button" disabled={!wallet.account} onClick={()=>setUsers(wallet.account??"")}>Use my wallet</button></label>}
      {id === "collect-fees" && <p className="maintenance-field-hint"><a href="https://oink-pls.github.io/Piggy-Bank-UI/available-actions.html" target="_blank" rel="noreferrer">Original maintenance page ↗</a> includes legacy fee tools. Each local farm option explains its availability.</p>}
    </div>
    <p className="maintenance-action-condition" role="status">{availability?.reason ?? "Reading the current contract conditions…"}</p>
    <div className="maintenance-action-buttons"><ProtocolAction request={{module:"community-maintenance",action:id,args}} adapter={communityMaintenanceAdapter} label={action.label} disabled={disabled || !availability?.ready || !fieldsReady} onConfirmed={onConfirmed}/></div>
  </article>;
}

export function MaintenanceStatus(){
  const wallet=useWallet();
  const {data,error,busy,refresh}=useAccessRead("community-maintenance",()=>getPublicProvider().then(readMaintenanceStatus));
  const facts = [
    ["Last Governor rebalance",data?data.lastHarvest?new Date(data.lastHarvest*1000).toLocaleString():"Not recorded":"—"],
    ["Ecosystem allocation / cap",data?formatUnits(data.allocation,2)+"% / "+formatUnits(data.maximum,2)+"%":"—"],
    ["Allocation adjustment",data?data.rebalanceNeeded?"Above cap — adjustment available":"Within current cap":"—"],
    ["Weekly allocation cap reduction",data?data.reductionReady?"Available":BigInt(data.maximum)===0n?"Cap is already zero":"Available after "+new Date(data.nextReduction*1000).toLocaleString():"—"],
    ["Reward boost event",data?data.eventId===null?"No active event":data.eventReady?"Event #"+data.eventId+" is ready to end":"Event #"+data.eventId+" ends at block "+Number(data.eventEndBlock).toLocaleString():"—"],
  ];
  return <section className="professional-card access-tools maintenance-status-card" aria-label="Community maintenance">
    <header className="card-heading-row"><div className="info-heading"><h2>Community maintenance</h2><InfoTooltip label="About community maintenance">Smart contracts wait for transactions to run these updates. Anyone can check the public conditions. The site checks current terms before opening your wallet; you confirm the transaction there. You pay network gas when triggering an action, and protocol proceeds go to its configured destination.</InfoTooltip></div></header>
    <p>{MAINTENANCE_ACTIONS_DISABLED ? "These actions update shared protocol state and are temporarily paused. Public statistics continue to update." : "These actions update shared protocol state. Current availability and the selected action are checked before your wallet opens."}</p>
    <p className="access-read-status" role="status">{error ? (data ? "Showing the last checked values. "+error : error) : !data&&busy?"Checking maintenance status…":""}</p>
    <div className="access-facts">{facts.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {!MAINTENANCE_ACTIONS_DISABLED && <p className="maintenance-wallet-status">{!wallet.account?"Connect your wallet from the header to continue.":wallet.chainId!==369n?"Switch your wallet to PulseChain to continue.":"Select an action to run live checks and open your wallet for confirmation."}</p>}
    <div className="maintenance-actions-grid">{COMMUNITY_MAINTENANCE_ACTIONS.map(action=><MaintenanceActionCard key={action.id} action={action} availability={data?.actions[action.id]} buyback={data?.buyback} disabled={!!error || !data} onConfirmed={refresh}/>)}</div>
  </section>;
}

