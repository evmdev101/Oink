import { sharedDisplayReads } from "./sharedReadCache.ts";
import { getAddress } from "ethers";
import { TIME_MINER_CONTRACTS, ECOSYSTEM_MINER_CONTRACTS } from "../config/contracts";
import { VERIFIED_FARM_READS } from "../config/farmReadVerification";
import { type HistorySource } from "./portfolioHistoryModel";
import { getPublicProvider } from "./chain";
import { readRpcPortfolioHistory, type RpcPortfolioHistory } from "./portfolioHistoryRpc";

const sources:HistorySource[] = [
  ...TIME_MINER_CONTRACTS.map(row => ({ ...row, kind:"miners" as const, decimals:18, symbol:"OINK" })),
  ...VERIFIED_FARM_READS.map(row => ({ ...row, kind:"farms" as const, label:ECOSYSTEM_MINER_CONTRACTS.find(c => c.id === row.id)?.label ?? row.id, symbol:ECOSYSTEM_MINER_CONTRACTS.find(c => c.id === row.id)?.label ?? row.id })),
  { id:"t-share", address:"0x6b465C480CD590852f90c8f1b41Ab22922a1BF85", kind:"hex", label:"HEX share rewards", symbol:"HEX shares", decimals:0 },
];
export type PortfolioHistory = RpcPortfolioHistory & { loading?:boolean };
type Listener = { generation:number; notify:(value:PortfolioHistory)=>void };
const historyPrefix = "369:history:rpc:";
const retained = new Map<string,PortfolioHistory>();
const listeners = new Map<string,Set<Listener>>();
let generation = 0;
const historyKey = (account:string) => historyPrefix + getAddress(account).toLowerCase();

export function peekPortfolioHistory(account:string):PortfolioHistory | null {
  return retained.get(historyKey(account)) ?? null;
}

/** Public event reads only; no wallet signatures or explorer indexer dependency. */
export function readPortfolioHistory(account:string,signal:AbortSignal,onProgress?:(value:PortfolioHistory)=>void):Promise<PortfolioHistory> {
  const key=historyKey(account),started=generation;
  const listener:Listener|null=onProgress&&!signal.aborted?{generation:started,notify(value){
    if(generation===started&&!signal.aborted)onProgress(value);
  }}:null;
  if(listener){
    let subscribed=listeners.get(key);
    if(!subscribed){subscribed=new Set();listeners.set(key,subscribed);}
    subscribed.add(listener);
  }
  const detach=()=>{
    if(listener){const subscribed=listeners.get(key);subscribed?.delete(listener);if(!subscribed?.size)listeners.delete(key);}
    signal.removeEventListener('abort',detach);
  };
  if(listener)signal.addEventListener('abort',detach,{once:true});
  return sharedDisplayReads.read(key,async child=>{
    child.throwIfAborted();
    const value=await readRpcPortfolioHistory(await getPublicProvider(),account,sources,child,progress=>{
      if(child.aborted||generation!==started)return;
      for(const subscriber of listeners.get(key)??[]){
        if(subscriber.generation===started){try{subscriber.notify({...progress,loading:true});}catch{/* Independent display subscribers. */}}
      }
    },retained.get(key));
    child.throwIfAborted();
    const complete={...value,loading:false};
    if(generation===started){
      if(retained.size>=8&&!retained.has(key))retained.delete(retained.keys().next().value!);
      retained.set(key,complete);
    }
    return complete;
  },{signal,ttl:60000,timeout:50000,cacheable:value=>value.failed===0&&value.capped===0}).finally(detach);
}

if(typeof window!=='undefined')window.addEventListener('oink-positions-changed',()=>{
  generation++;listeners.clear();sharedDisplayReads.clear(historyPrefix);
});
