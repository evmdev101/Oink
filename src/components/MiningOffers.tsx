import { useEffect,useRef,useState } from "react";
import { useWallet } from "./WalletProvider";
import { readSaleDisplay, peekSaleDisplay, saleDisplayKey, readReferralDisplay, peekReferralDisplay } from "../lib/miningOfferDisplayReads";
import { snapshotIsStale } from "../lib/governanceReadSafety";
import { displayFarmAmount } from "../lib/farmDisplay";
import { readReferral,readSale,referralLink,SALE_DESTINATIONS } from "../lib/miningOffers";
import { clearSaleMaximums,peekSaleMaximums,readSaleMaximums,saleMaximumKey,type SaleMaximums } from "../lib/saleMaximumDisplay";
import { offerAdapter } from "../lib/offerTransactions";
import { parseFarmDepositAmount } from "../lib/farmTransactions";
import { ProtocolAction } from "./ProtocolAction";
import { SaleEstimate } from "./SaleEstimate";
import { TIME_MINER_CONTRACTS } from "../config/contracts";
import { usePageLoadStatus } from "./PageLoadBoundary";
import { CHAIN_ID } from "../lib/chain";
import { InfoTooltip } from "./InfoTooltip";
import "./mining-offers.css";
export function OinkSale(){
  const wallet=useWallet();
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const clock=window.setInterval(()=>setNow(Date.now()),15000);return ()=>window.clearInterval(clock);},[]);
  const [asset,setAsset]=useState('PLS'),[amount,setAmount]=useState(''),[duration,setDuration]=useState('five-year'),[stored,setStored]=useState<{key:string;value:Awaited<ReturnType<typeof readSale>>}|null>(()=>{const value=peekSaleDisplay('PLS','','five-year',wallet.account,'receive');return value?{key:saleDisplayKey('PLS','','five-year',wallet.account,'receive'),value}:null;}),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(false);
  const dataKey=saleDisplayKey(asset,amount,duration,wallet.account,'receive');
  // Load all asset/destination maximums before a click; typing never invalidates them.
  const maxContext=JSON.stringify([wallet.account?.toLowerCase(),wallet.chainId?.toString(),wallet.revision]);
  const previousMaxContext=useRef(maxContext);
  const [maximums,setMaximums]=useState<{context:string;values:SaleMaximums}|null>(()=>{
    const values=!wallet.account||wallet.chainId===CHAIN_ID?peekSaleMaximums(wallet.account):null;
    return values?{context:maxContext,values}:null;
  });
  const [maxError,setMaxError]=useState('');
  const adoptedMax=useRef<typeof stored>(null);
  useEffect(()=>{
    if(previousMaxContext.current!==maxContext){clearSaleMaximums();previousMaxContext.current=maxContext;}
    const account=wallet.account;
    setMaxError('');
    if(account&&wallet.chainId!==CHAIN_ID)return;
    let active=true,request=0,timer:number|undefined;
    const controller=new AbortController();
    const cached=peekSaleMaximums(account);
    if(cached)setMaximums({context:maxContext,values:cached});
    const load=()=>{
      const current=++request;
      window.clearTimeout(timer);
      let retry=45000;
      const ready=(values:SaleMaximums)=>{
        if(active&&current===request){setMaximums(previous=>({context:maxContext,values:{...(previous?.context===maxContext?previous.values:{}),...values}}));setMaxError('');setNow(Date.now());}
      };
      void readSaleMaximums(account,controller.signal,ready).then(ready).catch(()=>{
        retry=10000;
        if(active&&current===request)setMaxError('Max is unavailable while sale prices reconnect.');
      }).finally(()=>{
        if(active&&current===request)timer=window.setTimeout(load,retry);
      });
    };
    const changed=()=>{clearSaleMaximums();setMaximums(null);load();};
    window.addEventListener('oink-positions-changed',changed);
    load();
    return ()=>{active=false;controller.abort();window.clearTimeout(timer);window.removeEventListener('oink-positions-changed',changed);};
  },[maxContext,wallet.account,wallet.chainId]);
  const data=stored?.key===dataKey?stored.value:null;
  const fresh=!!data&&!snapshotIsStale(data.timestamp,now);
  usePageLoadStatus("oink-sale", fresh, error, () => setRefresh(value => value + 1));
  useEffect(() => {
    const adopted=adoptedMax.current;
    adoptedMax.current=null;
    if(adopted?.key===dataKey){
      setStored(adopted);setBusy(false);setError('');
      const timer=window.setTimeout(()=>setRefresh(value=>value+1),60000);
      return ()=>window.clearTimeout(timer);
    }
    let active = true;
    let timer: number | undefined;
    let readTimer: number | undefined;
    let refreshTimer: number | undefined;
    const controller=new AbortController();
    const cached=peekSaleDisplay(asset,amount,duration,wallet.account,'receive');
    if(cached)setStored({key:dataKey,value:cached});
    setError(''); setBusy(true);
    const load = () => {
      let retryDelay = 60000;
      const timeout = new Promise<never>((_, reject) => {
        readTimer = window.setTimeout(() => reject(new Error('Sale data is taking too long to load. Please retry.')), 60000);
      });
      void Promise.race([readSaleDisplay(asset,amount,duration,wallet.account,controller.signal,'receive'), timeout]).then(value => { if (active) setStored({key:dataKey,value}); }).catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Sale data is unavailable. Try refreshing.');
        retryDelay = 5000;
      }).finally(() => {
        window.clearTimeout(readTimer);
        if (active) { setBusy(false); refreshTimer = window.setTimeout(() => setRefresh(value => value + 1), retryDelay); }
      });
    };
    if (amount) timer = window.setTimeout(load, 400);
    else load();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); window.clearTimeout(readTimer); window.clearTimeout(refreshTimer); };
  }, [asset, amount, duration, dataKey, refresh, wallet.account, wallet.revision]);
  let amountValid=false,allowanceEnough=false,paymentValid=false;
  try{parseFarmDepositAmount(amount,18);amountValid=true;}catch{/* Quote validation also rejects invalid OINK input. */}
  const paymentAmount=data?.paymentAmount??'';
  try{const raw=parseFarmDepositAmount(paymentAmount,asset==='HEX'?8:18);paymentValid=true;allowanceEnough=asset==='PLS'||data?.account===wallet.account&&data?.allowance!=null&&BigInt(data.allowance)>=raw;}catch{/* Live checks validate the payment again. */}
  const wrongChain=!!wallet.account&&wallet.chainId!==CHAIN_ID;
  const maximum=maximums?.context===maxContext?maximums.values[saleMaximumKey(asset,duration)]:null;
  const canMax=!wrongChain&&!!maximum&&(maximum.account??'').toLowerCase()===(wallet.account??'').toLowerCase()&&!snapshotIsStale(maximum.timestamp,now)&&!!maximum.maxReceive&&maximum.maxReceive!=='0.0'&&!maximum.quoteError&&maximum.quoteFunded;
  const fillMaximum=()=>{
    if(!canMax||!maximum?.maxReceive)return;
    // Purely local: fill both the input and its matching estimate in the same render.
    const key=saleDisplayKey(asset,maximum.maxReceive,duration,wallet.account,'receive');
    adoptedMax.current={key,value:maximum};
    setStored({key,value:maximum});setAmount(maximum.maxReceive);setNow(Date.now());setError('');setRefresh(v=>v+1);
  };
  const saleRequest={module:'offers',action:'sale',args:{asset,amount:paymentAmount,destination:duration}},refreshData=()=>setRefresh(v=>v+1);
  return <section className="mining-offers">
    <div><h1>OINK sale <InfoTooltip label="About the OINK sale">Choose your total OINK amount and where to receive it. The site estimates the payment in your selected asset. Max selects the full available sale inventory, rounded down only when the payment token's precision requires it. Your wallet balance does not reduce the Max amount. You need enough of the selected payment asset before buying.</InfoTooltip></h1><span>Contract inventory</span><h2>{data?displayFarmAmount(data.inventory)+' OINK':busy?'Loading…':'—'}</h2><p>Miners receive 11%, 18% or 25% extra OINK for 1, 3 or 5 years respectively. Your entered OINK total includes this bonus. Miner withdrawals have separate lock and penalty rules.</p><p>The sale has no guaranteed minimum received amount. Its price can change before your purchase is mined.</p></div>
    <div className="professional-card">
      <label>Pay with<select value={asset} onChange={e=>setAsset(e.target.value)}>{['PLS','PLSX','INC','HEX'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Receive OINK in<select value={duration} onChange={e=>setDuration(e.target.value)}>{SALE_DESTINATIONS.map(v=><option key={v.id} value={v.id}>{v.id==='wallet'?v.label:v.label+' miner'}</option>)}</select></label>
      <div className="sale-amount-field"><label htmlFor="sale-oink-amount">OINK amount to receive</label><div className="sale-amount-input"><input id="sale-oink-amount" value={amount} aria-describedby="sale-estimate-help" inputMode="decimal" placeholder="0.00" onChange={e=>setAmount(e.target.value)} /><button type="button" disabled={!canMax} title={wrongChain?'Switch to PulseChain to use Max':canMax?'Use the full available OINK sale inventory':maximum?.maxReceive==='0.0'?'No OINK is available in the sale':maxError||'Preparing sale inventory in the background'} onClick={fillMaximum}>Max</button></div></div>
      <div id="sale-estimate-help"><SaleEstimate data={data} fresh={fresh} busy={busy} amount={amount} amountValid={amountValid} asset={asset} duration={duration} error={error}/></div>
      <p className="offer-read-status" role={error?"alert":"status"} tabIndex={error||data?.quoteError?0:undefined}>{[data?.quoteError,error].filter(Boolean).join(" ")}</p>
      <div className="offer-action-list">{asset!=='PLS'&&<><ProtocolAction request={{...saleRequest,action:'sale-approve'}} adapter={offerAdapter} label={'Approve '+asset} disabled={!paymentValid||busy||!fresh||wrongChain||data?.allowance!=='0'} onConfirmed={refreshData}/><ProtocolAction request={{...saleRequest,action:'sale-reset'}} adapter={offerAdapter} label="Reset sale allowance" disabled={busy||!fresh||wrongChain||data?.allowance==null||data.allowance==='0'} onConfirmed={refreshData}/></>}
      <ProtocolAction request={saleRequest} adapter={offerAdapter} label="Buy OINK" disabled={!wallet.account||!amountValid||!paymentValid||!allowanceEnough||busy||!fresh||wrongChain||!data?.quoteFunded||data.balanceEnough!==true} onConfirmed={refreshData}/></div>
      {asset!=='PLS'&&<p>Approve only the calculated payment amount. To replace an existing allowance, reset it to zero first.</p>}
    </div>
  </section>;
}
export function OinkReferral(){
  const {account}=useWallet(),[stored,setStored]=useState<Awaited<ReturnType<typeof readReferral>>|null>(()=>account?peekReferralDisplay(account):null),[error,setError]=useState(''),[destination,setDestination]=useState('five-year'),[refresh,setRefresh]=useState(0),[copied,setCopied]=useState(false),[busy,setBusy]=useState(false);
  const data=stored?.account.toLowerCase()===account?.toLowerCase()?stored:null;
  const fresh=!!data&&!snapshotIsStale(data.timestamp,Date.now());
  usePageLoadStatus("oink-referral", !account || fresh, error, () => setRefresh(value => value + 1));
  useEffect(() => {
    let active = true;
    let readTimer: number | undefined;
    let refreshTimer: number | undefined;
    let retryDelay = 60000;
    const controller=new AbortController();
    const cached=account?peekReferralDisplay(account):null;
    if(cached)setStored(cached);
    setError(''); setCopied(false);setBusy(!!account);
    if (account) {
      const timeout = new Promise<never>((_, reject) => {
        readTimer = window.setTimeout(() => reject(new Error('Referral balances are taking too long to load. Please retry.')), 60000);
      });
      void Promise.race([readReferralDisplay(account,controller.signal), timeout]).then(value => { if (active) setStored(value); }).catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Referral balances are unavailable. Try refreshing.');
        retryDelay = 5000;
      }).finally(() => {
        window.clearTimeout(readTimer);
        if (active) {setBusy(false);refreshTimer = window.setTimeout(() => setRefresh(value => value + 1), retryDelay);}
      });
    }
    return () => { active = false; controller.abort(); window.clearTimeout(readTimer); window.clearTimeout(refreshTimer); };
  }, [account, refresh]);
  const option=data?.destinations.find(v=>v.id===destination),link=account?referralLink(account):'';
  return <section className="referral-workspace">
    <article className="professional-card">
      <h1>Earn referral rewards <InfoTooltip label="About referral rewards">The displayed bonus applies to eligible referral points recorded by the protocol. Sharing this link does not replace a farmer's existing on-chain referrer. The eventual OINK payout also depends on the chosen reward destination.</InfoTooltip></h1><p>Share your OINK referral link. The current bonus is <span className="referral-bonus-value">{data?data.bonus+'%':'—'}</span> of eligible referral points, before destination payout reductions.</p>
      <label>Your referral link<input readOnly value={link} placeholder="Connect your wallet to generate your link" /></label>
      <button disabled={!link} onClick={()=>void navigator.clipboard.writeText(link).then(()=>setCopied(true)).catch(()=>setError('Copy failed. Select and copy the link manually.'))}>{copied?'Copied':'Copy link'}</button>
      <p>Your link opens this site. A farmer’s existing on-chain referrer takes precedence.</p>
    </article>
    <article className="professional-card">
      <h2>Referral balance <InfoTooltip label="About referral points and destination payouts"><p>Referral points are accounting credits, not liquid OINK. Remaining points subtract redemptions made through both the current and legacy referral contracts.</p><p>The selected destination applies its displayed payout percentage. A miner destination also has a mandatory service period. Claiming consumes the selected points in full, including the portion reduced by that payout percentage.</p></InfoTooltip></h2><p className="offer-read-status" role={error?"alert":"status"} tabIndex={error?0:undefined}>{error}</p>
      <div className="referral-stats">{[['Points earned',data?.total],['Points redeemed · both contracts',data?.redeemed],['Remaining points',data?.remaining]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value?displayFarmAmount(value):'—'}</strong></div>)}</div>
      <label>Reward destination<select value={destination} onChange={e=>setDestination(e.target.value)}><option value="wallet">Your wallet</option>{TIME_MINER_CONTRACTS.map(v=><option key={v.id} value={v.id}>{v.label} miner</option>)}</select></label>
      <div className="offer-quote"><span>Estimated OINK received</span><strong>{option?displayFarmAmount(option.received):'—'}</strong></div>
      <p className="referral-destination-note">{option?<>{option.rate}% of the referral reward · {option.serve} days mandatory service{!option.enabled?' · Destination inactive':!option.funded?' · Reward contract currently underfunded':''}</>:account?'Reading destination payout and service period…':'Connect your wallet to see destination payout details.'}</p>
      <button disabled={!account||busy} onClick={()=>setRefresh(v=>v+1)}>Refresh balances</button>
      <div className="offer-action-list"><ProtocolAction adapter={offerAdapter} label="Claim referral rewards" request={{module:'offers',action:'referral',args:{destination,points:data?.remaining??''}}} disabled={busy||!fresh||!data||data.account!==account||!option?.enabled||!option.funded||data.remaining==='0.0'} onConfirmed={()=>setRefresh(v=>v+1)}/></div>
      <p className="deploy-draft-note">{data?'Block '+data.block.toLocaleString()+'. ':''}Claims consume the selected points, including the part reduced by the destination payout. Both current and legacy redemptions are deducted.</p>
    </article>
  </section>;
}

