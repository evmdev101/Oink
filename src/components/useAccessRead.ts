import { useEffect, useRef, useState } from "react";
import { usePageLoadStatus } from "./PageLoadBoundary";
import { sharedDisplayReads } from "../lib/sharedReadCache.ts";
export function useAccessRead<T>(key:string,load:()=>Promise<T>) {
  const cacheKey="369:access:"+key.toLowerCase();
  const loadRef=useRef(load);loadRef.current=load;
  const [state,setState]=useState<{key:string;data:T|null;error:string;busy:boolean}>(()=>({key,data:sharedDisplayReads.peek<T>(cacheKey,120000),error:"",busy:true}));
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;let refresh:ReturnType<typeof setTimeout>|undefined;
    const controller=new AbortController(),read=loadRef.current;
    setState(previous=>({key,data:previous.key===key?previous.data:sharedDisplayReads.peek<T>(cacheKey,120000),error:"",busy:true}));
    void sharedDisplayReads.read<T>(cacheKey,()=>read(),{signal:controller.signal,ttl:20000,timeout:60000}).then(data=>{if(active)setState({key,data,error:"",busy:false})}).catch(error=>{if(active)setState(previous=>({key,data:previous.key===key?previous.data:null,error:error instanceof Error?error.message:"Data is unavailable. Try refreshing.",busy:false}))}).finally(()=>{if(active)refresh=setTimeout(()=>setRevision(v=>v+1),60000)});
    const changed=()=>{sharedDisplayReads.clear(cacheKey);setRevision(v=>v+1);};
    const events=["oink-protocol-confirmed","oink-positions-changed"];
    events.forEach(event=>window.addEventListener(event,changed));
    return()=>{active=false;controller.abort();clearTimeout(refresh);events.forEach(event=>window.removeEventListener(event,changed))};
  },[key,cacheKey,revision]);
  const current=state.key===key?state:{key,data:sharedDisplayReads.peek<T>(cacheKey,120000),error:"",busy:true};
  const refresh=()=>{sharedDisplayReads.clear(cacheKey);setRevision(v=>v+1);};
  usePageLoadStatus(key,current.data!==null,current.error,refresh);
  return {...current,refresh};
}
