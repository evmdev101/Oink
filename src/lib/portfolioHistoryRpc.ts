import { getAddress, toQuantity, zeroPadValue } from "ethers";
import { type FarmReadRpc } from "./farmTransactions";
import { decodeWalletActivity, mergeWalletActivity, portfolioMinerEvents, portfolioFarmEvents, portfolioHexEvents, type HistoryLog, type HistorySource, type WalletActivity } from "./portfolioHistoryModel";

export type RpcPortfolioHistory = {
  account:string; rows:WalletActivity[]; failed:number; capped:number; loadedAt:number; sources:number; toBlock:number; blockHash:string;
};
export type RpcPortfolioHistoryOptions = { timeoutMs?:number; timestampConcurrency?:number };
const hashPattern = /^0x[0-9a-f]{64}$/i;
const number = (value:unknown) => {
  if(typeof value!=="string" || !/^(0x[0-9a-f]+|[0-9]+)$/i.test(value))throw Error("Invalid history block data.");
  const parsed=Number(BigInt(value));
  if(!Number.isSafeInteger(parsed)||parsed<0)throw Error("Invalid history block data.");
  return parsed;
};
class ChangedHistory extends Error {}

/** Public event reads only. Every group is decoded at one fixed canonical head. */
export async function readRpcPortfolioHistory(
  rpc:FarmReadRpc, accountInput:string, sources:HistorySource[], signal:AbortSignal,
  onProgress?:(value:RpcPortfolioHistory)=>void, previous?:RpcPortfolioHistory,
  options:RpcPortfolioHistoryOptions={},
):Promise<RpcPortfolioHistory> {
  signal.throwIfAborted();
  const account=getAddress(accountInput), topic=zeroPadValue(account,32);
  const controller=new AbortController();
  const aborted=()=>controller.abort(signal.reason);
  signal.addEventListener("abort",aborted,{once:true});
  const deadline=setTimeout(()=>controller.abort(Error("Wallet history deadline reached.")),Math.max(1,options.timeoutMs??35000));
  const child=controller.signal;
  const bounded=<T,>(work:Promise<T>):Promise<T>=>{
    if(child.aborted)return Promise.reject(child.reason);
    return new Promise((resolve,reject)=>{
      const stop=()=>{cleanup();reject(child.reason??Error("History read cancelled."));};
      const cleanup=()=>child.removeEventListener("abort",stop);
      child.addEventListener("abort",stop,{once:true});
      work.then(value=>{cleanup();resolve(value);},reason=>{cleanup();reject(reason);});
    });
  };
  const send=(method:string,params:unknown[])=>{
    child.throwIfAborted();
    return bounded(Promise.resolve().then(()=>{child.throwIfAborted();return rpc.send(method,params);}));
  };
  const sourceMap=new Map(sources.map(source=>[getAddress(source.address).toLowerCase(),source]));
  const validPrevious=previous?.account.toLowerCase()===account.toLowerCase()&&previous.sources===sources.length&&Number.isSafeInteger(previous.toBlock)&&previous.toBlock>=0&&hashPattern.test(previous.blockHash)?previous:null;
  let head:{number:number;hash:string;timestamp:number}|null=null;
  let rows:WalletActivity[]=[],failed=0,pending=0,changed=false;
  const snapshot=():RpcPortfolioHistory=>({account,rows:mergeWalletActivity(rows),failed:failed+pending,capped:0,loadedAt:Date.now(),sources:sources.length,toBlock:head!.number,blockHash:head!.hash});
  const publish=()=>{
    if(child.aborted||signal.aborted||!head)return;
    try{onProgress?.(snapshot());}catch{/* One display observer cannot break a public read. */}
  };
  try {
    if(BigInt(await send("eth_chainId",[]))!==369n)throw Error("PulseChain is required for wallet history.");
    const latest=await send("eth_getBlockByNumber",["latest",false]);
    if(!latest||!hashPattern.test(latest.hash))throw Error("History head is unavailable.");
    head={number:number(latest.number),hash:latest.hash,timestamp:number(latest.timestamp)};
    if(head.timestamp===0||Date.now()-head.timestamp*1000>=120000||head.timestamp*1000>Date.now()+30000)throw Error("Fresh wallet history head is unavailable.");
    const canonical=async()=>{
      const block=await send("eth_getBlockByNumber",[toQuantity(head!.number),false]);
      if(!block||block.hash!==head!.hash){changed=true;throw new ChangedHistory("Wallet history snapshot changed. Retry the read.");}
    };
    let fromBlock=0;
    if(validPrevious&&validPrevious.failed===0&&validPrevious.capped===0&&validPrevious.toBlock<=head.number){
      const anchor=validPrevious.toBlock===head.number?latest:await send("eth_getBlockByNumber",[toQuantity(validPrevious.toBlock),false]);
      if(anchor?.hash===validPrevious.blockHash){fromBlock=validPrevious.toBlock+1;rows=[...validPrevious.rows];}
    }
    if(fromBlock>head.number){await canonical();return snapshot();}
    const signatures=[...new Set([portfolioMinerEvents,portfolioFarmEvents,portfolioHexEvents].flatMap(abi=>abi.fragments.filter(fragment=>fragment.type==="event").map(fragment=>abi.getEvent(fragment.format())!.topicHash)))];
    const minerAddresses=sources.filter(source=>source.kind==="miners").map(source=>getAddress(source.address));
    const groups=[{addresses:[...sourceMap.keys()],topics:[signatures,topic]},...(minerAddresses.length?[{addresses:minerAddresses,topics:[signatures,null,topic]}]:[])];
    pending=groups.length;
    let activeTimestamps=0;
    const timestampQueue:Array<()=>void>=[];
    const timestamps=new Map<number,Promise<{timestamp:number;hash:string}>>();
    const timestampErrors=new Set<number>();
    const getTimestamp=(blockNumber:number)=>{
      let work=timestamps.get(blockNumber);
      if(work)return work;
      work=(async()=>{
        const concurrency=Math.max(1,Math.floor(options.timestampConcurrency??6));
        if(activeTimestamps>=concurrency)await bounded(new Promise<void>(resolve=>timestampQueue.push(resolve)));
        else activeTimestamps++;
        try{
          child.throwIfAborted();
          const block=blockNumber===head!.number?latest:await send("eth_getBlockByNumber",[toQuantity(blockNumber),false]);
          if(!block||number(block.number)!==blockNumber||!hashPattern.test(block.hash))throw Error("Event block is unavailable.");
          const timestamp=number(block.timestamp);
          if(timestamp===0||timestamp>head!.timestamp)throw Error("Event timestamp is invalid.");
          return {timestamp,hash:block.hash};
        }finally{
          const next=timestampQueue.shift();
          if(next)next();else activeTimestamps--;
        }
      })();
      timestamps.set(blockNumber,work);
      return work;
    };
    await Promise.allSettled(groups.map(async group=>{
      const knownRows:WalletActivity[]=[];
      try{
        const logs=await send("eth_getLogs",[{address:group.addresses,fromBlock:toQuantity(fromBlock),toBlock:toQuantity(head!.number),topics:group.topics}]);
        if(!Array.isArray(logs))throw Error("Invalid wallet event response.");
        const decoded=await Promise.all(logs.map(async(raw:HistoryLog&{blockHash?:string})=>{
          let eventBlock:number|undefined;
          try{
            if(raw.removed)return null;
            const source=sourceMap.get(getAddress(raw.address).toLowerCase());
            if(!source||!hashPattern.test(raw.blockHash??""))throw Error("Invalid event contract or block hash.");
            if(!hashPattern.test(raw.transactionHash)||!Array.isArray(raw.topics)||raw.topics.some(value=>typeof value!=="string"||!hashPattern.test(value))||typeof raw.data!=="string"||!/^0x(?:[0-9a-f]{2})*$/i.test(raw.data))throw Error("Malformed history event.");
            number(raw.logIndex);
            eventBlock=number(raw.blockNumber);
            if(eventBlock<fromBlock||eventBlock>head!.number)throw Error("Event outside requested history.");
            const block=await getTimestamp(eventBlock);
            if(raw.blockHash!==block.hash)throw Error("Event block hash changed.");
            const decoded=decodeWalletActivity({...raw,timeStamp:toQuantity(block.timestamp)},source,account);
            if(!decoded){
              const abi=source.kind==="miners"?portfolioMinerEvents:source.kind==="farms"?portfolioFarmEvents:portfolioHexEvents;
              if(!abi.parseLog({data:raw.data,topics:raw.topics as string[]}))throw Error("Unknown history event.");
            }
            if(decoded)knownRows.push(decoded);
            return decoded;
          }catch{
            if(!child.aborted){
              if(eventBlock==null||!timestampErrors.has(eventBlock)){failed++;if(eventBlock!=null)timestampErrors.add(eventBlock);}
            }
            return null;
          }
        }));
        child.throwIfAborted();
        await canonical();
        rows=mergeWalletActivity([...rows,...decoded.filter((row):row is WalletActivity=>row!==null)]);
      }catch(reason){
        if(reason instanceof ChangedHistory)changed=true;
        // A deadline cannot erase events whose own block/hash/date were already
        // checked. Keep these as partial data, never as a complete scan anchor.
        if(child.aborted)rows=mergeWalletActivity([...rows,...knownRows]);
        failed++;
      }finally{pending--;publish();}
    }));
    signal.throwIfAborted();
    if(changed)throw new ChangedHistory("Wallet history snapshot changed. Retry the read.");
    if(child.aborted){failed=Math.max(1,failed);return snapshot();}
    try{await canonical();}catch(reason){if(reason instanceof ChangedHistory)throw reason;failed++;}
    signal.throwIfAborted();
    return snapshot();
  }catch(reason){
    signal.throwIfAborted();
    if(reason instanceof ChangedHistory)throw reason;
    if(child.aborted&&validPrevious)return {...validPrevious,failed:Math.max(1,validPrevious.failed+1),loadedAt:Date.now()};
    throw reason;
  }finally{
    clearTimeout(deadline);signal.removeEventListener("abort",aborted);
  }
}
