import { protocolScope } from "./actionJournal";
import { getAddress, type Eip1193Provider } from "ethers";
import { assertGovernanceActionEnabled } from "../config/publicPreview";
import type { FarmReadRpc } from "./farmTransactions";
import { positionLock } from "./positionTransactions";
import { prepareProtocolTransaction, requestProtocolTransaction, type ProtocolAdapter, type ProtocolRequest } from "./protocolTransactions";
import { assertNoPendingProtocol, writeProtocolJournal, type ProtocolJournal } from "./protocolTransactionJournal";

export type ProtocolDirectStage="checking"|"wallet"|"pending"|"rejected"|"uncertain";
type Options={account:string;request:ProtocolRequest;adapter:ProtocolAdapter;rpc:FarmReadRpc;provider:Eip1193Provider;current:()=>boolean;onStage:(stage:ProtocolDirectStage,message?:string)=>void};
type Dependencies={
  withLock:(account:string,run:()=>Promise<ProtocolJournal>,scope?:string)=>Promise<ProtocolJournal>;
  assertNoPendingProtocol:typeof assertNoPendingProtocol;
  prepare:typeof prepareProtocolTransaction;send:typeof requestProtocolTransaction;write:typeof writeProtocolJournal;
};
const defaults:Dependencies={
  async withLock(account,run,scope){
    if(typeof navigator==="undefined"||!navigator.locks)throw Error("This browser cannot coordinate wallet requests between tabs.");
    return navigator.locks.request(positionLock(account)+":"+scope,{ifAvailable:true},async lock=>{
      if(!lock)throw Error("A wallet request is already open in another tab.");return run();
    });
  },
  assertNoPendingProtocol,prepare:prepareProtocolTransaction,send:requestProtocolTransaction,write:writeProtocolJournal,
};
const message=(reason:unknown)=>reason instanceof Error?reason.message:"Action could not be completed.";

/** A user action opens the wallet after the same live preparation and rechecks. */
export async function submitProtocolDirect(options:Options,overrides:Partial<Dependencies>={}):Promise<ProtocolJournal>{
  assertGovernanceActionEnabled(options.request);
  const {request,adapter,rpc,provider,current,onStage}=options,deps={...defaults,...overrides},account=getAddress(options.account);
  const ensureCurrent=()=>{if(!current())throw Error("The wallet or action changed. Check your inputs and try again.");};
  const notify=(stage:ProtocolDirectStage,text?:string)=>{try{if(current())onStage(stage,text);}catch{/* Display observers cannot change transaction outcomes. */}};
  ensureCurrent();notify("checking");
  return deps.withLock(account,async()=>{
    ensureCurrent();deps.assertNoPendingProtocol(account,request);
    const review=await deps.prepare(rpc,account,request,adapter);
    ensureCurrent();deps.assertNoPendingProtocol(account,request);
    const entry:ProtocolJournal={review,state:"requesting",hash:null,message:"Wallet request started. Check wallet activity before trying again."};
    deps.write(entry);
    let returnedHash:string|null=null;
    try{
      const hash=await deps.send(review,adapter,rpc,provider,current,()=>notify("wallet"));
      if(!/^0x[0-9a-f]{64}$/i.test(hash))throw Error("Wallet response is uncertain. Check wallet activity; do not resubmit.");
      returnedHash=hash;
      const outcome:ProtocolJournal={...entry,state:"pending",hash,message:"Submitted. Check confirmation; do not repeat this action."};
      deps.write(outcome);notify("pending",outcome.message);return outcome;
    }catch(reason){
      const details=reason as {walletRequestStarted?:boolean;code?:number}|null;
      const beforeWallet=returnedHash===null&&details?.walletRequestStarted===false,rejected=returnedHash===null&&details?.code===4001;
      const resolved=beforeWallet||rejected;
      const outcome:ProtocolJournal={...entry,hash:returnedHash,state:resolved?"resolved":"uncertain",message:message(reason)+(beforeWallet?" No transaction was requested.":rejected?" The wallet request was rejected. No automatic retry was made.":" Check wallet activity; no automatic retry was made.")};
      try{deps.write(outcome);}catch{
        const text=outcome.message+" The status could not be saved. "+(returnedHash?"Save this transaction hash: "+returnedHash:"Check your wallet activity; no transaction hash was returned.");
        notify("uncertain",text);throw Object.assign(Error(text),{hash:returnedHash,journal:outcome,walletRequestStarted:!beforeWallet});
      }
      notify(resolved?"rejected":"uncertain",outcome.message);return outcome;
    }
  },protocolScope(request));
}
