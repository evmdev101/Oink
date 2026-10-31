import { useEffect,useState } from "react";
import { readGovernanceCandidates,type DiscoveredCandidate } from "../lib/governanceDiscovery";
export function GovernanceCandidates({kind,active,onSelect}:{kind:"nft"|"senate";active:boolean;onSelect:(row:DiscoveredCandidate)=>void}){
  const [rows,setRows]=useState<DiscoveredCandidate[]|null>(null),[error,setError]=useState("");
  useEffect(()=>{
    if(!active)return;
    const controller=new AbortController();
    let timer:ReturnType<typeof setTimeout>|undefined;
    setRows(null);setError("");
    const load=async()=>{
      let delay=60000;
      try{
        const result=await readGovernanceCandidates(kind,controller.signal);
        if(!controller.signal.aborted){setRows(result.rows);setError("");}
      }catch(e){
        if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Candidate discovery is temporarily unavailable.");
        delay=10000;
      }finally{if(!controller.signal.aborted)timer=setTimeout(load,delay);}
    };
    void load();
    return()=>{controller.abort();clearTimeout(timer);};
  },[kind,active]);
  return <div className="governance-candidates"><h4>{kind==="nft"?"Recorded allocation candidates":"Senate members and membership ballots"}</h4><label>Choose a recorded address<select value="" disabled={!rows?.length} onChange={e=>{const row=rows?.[Number(e.target.value)];if(row)onSelect(row);}}><option value="">{rows===null?"Reading candidates…":rows.length?"Select an address…":"None recorded on-chain"}</option>{rows?.map((row,i)=><option key={row.kind+row.address} value={i}>{row.address} · {row.status}{row.votes?` · ${row.votes} votes`:""}</option>)}</select></label><p className="governance-candidate-status" role="status">{error?`${error} You can still enter a known address below.`:""}</p></div>;
}
