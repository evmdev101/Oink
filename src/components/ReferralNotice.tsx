import {useEffect,useState}from'react';
import{captureReferralLink,readSelectedReferral,saveSelectedReferral,REFERRAL_SELECTION_EVENT,REFERRAL_SELECTION_KEY}from'../lib/referralSelection';
import{useWallet}from'./WalletProvider';
export function useReferralSelection(){
  const [state,setState]=useState<{referral:string|null;error:string}>({referral:null,error:''});
  useEffect(()=>{
    const read=()=>{try{setState({referral:readSelectedReferral(),error:''});}catch(e){setState({referral:null,error:e instanceof Error?e.message:'Referral storage is unavailable.'});}};
    const changed=(event:StorageEvent)=>{if(event.key===REFERRAL_SELECTION_KEY||event.key===null)read();};
    read();window.addEventListener('storage',changed);window.addEventListener(REFERRAL_SELECTION_EVENT,read);
    return()=>{window.removeEventListener('storage',changed);window.removeEventListener(REFERRAL_SELECTION_EVENT,read);};
  },[]);return state;
}
export function ReferralNotice(){
  const{referral,error}=useReferralSelection(),wallet=useWallet();const[linkError,setLinkError]=useState('');
  useEffect(()=>{try{const result=captureReferralLink(window.location.href);if(result.captured)window.history.replaceState(window.history.state,'',result.cleanUrl);}catch(e){setLinkError(e instanceof Error?e.message:'Unable to read this referral link.');}},[]);
  const clear=()=>{try{saveSelectedReferral(null);setLinkError('');const url=new URL(window.location.href);url.searchParams.delete('r');window.history.replaceState(window.history.state,'',url.href);}catch(e){setLinkError(e instanceof Error?e.message:'Unable to clear the referral.');}};
  if(!referral&&!error&&!linkError)return null;
  return <aside className="professional-card referral-selection-notice" role="status" style={{maxWidth:1150,margin:'16px auto',padding:16,overflowWrap:'anywhere'}}>{referral&&<><strong>Selected referral</strong><p>{referral}</p><p>{wallet.account?.toLowerCase()===referral.toLowerCase()?'This is your connected wallet. Self-referrals are ignored.':'Used for new farm referrals only. Each farm keeps any referrer already recorded on-chain. The deposit review shows the actual referrer.'}</p></>}{(error||linkError)&&<p role="alert">{error||linkError}</p>}<button type="button" onClick={clear}>Clear referral</button></aside>;
}
