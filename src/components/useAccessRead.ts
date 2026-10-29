import { useEffect, useRef, useState } from "react";
import { usePageLoadStatus } from "./PageLoadBoundary";
export function useAccessRead<T>(key:string,load:()=>Promise<T>) {
  const loadRef=useRef(load);loadRef.current=load;
  const [state,setState]=useState<{key:string;data:T|null;error:string;busy:boolean}>({key,data:null,error:"",busy:true});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;let refresh:ReturnType<typeof setTimeout>|undefined;let timeout:ReturnType<typeof setTimeout>|undefined;
    setState(previous=>({key,data:previous.key===key?previous.data:null,error:"",busy:true}));
    const deadline=new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error("This data is taking too long to load. Please refresh.")),60000)});
    void Promise.race([loadRef.current(),deadline]).then(data=>{if(active)setState({key,data,error:"",busy:false})}).catch(error=>{if(active)setState(previous=>({key,data:previous.key===key?previous.data:null,error:error instanceof Error?error.message:"Data is unavailable. Try refreshing.",busy:false}))}).finally(()=>{clearTimeout(timeout);if(active)refresh=setTimeout(()=>setRevision(v=>v+1),60000)});
    const changed=()=>setRevision(v=>v+1);window.addEventListener("oink-protocol-confirmed",changed);
    return()=>{active=false;clearTimeout(timeout);clearTimeout(refresh);window.removeEventListener("oink-protocol-confirmed",changed)};
  },[key,revision]);
  const current=state.key===key?state:{key,data:null,error:"",busy:true};
  const refresh=()=>setRevision(v=>v+1);
  usePageLoadStatus(key,current.data!==null,current.error,refresh);
  return {...current,refresh};
}
