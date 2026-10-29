import { Interface,formatEther,formatUnits,getAddress,toQuantity,zeroPadValue } from "ethers";
import { OINK_TOKEN,TREASURY_WALLET,TIME_MINER_CONTRACTS } from "../config/contracts";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { minerEvents,farmExitEvents } from "./positionTransactions";
import { type FarmReadRpc } from "./farmTransactions";
import { TREASURY_EXTRA_TOKENS } from "../config/treasuryAssets";
export const treasuryAccounts=[{label:'Treasury wallet',address:TREASURY_WALLET},{label:'Governor',address:VERIFIED_FARM_WRITES[0].governor},{label:'Treasury locked miner',address:'0x4807bdD7039a1fc236c14dc60D73a64eEa450731'},{label:'NFT wallet',address:'0x26E6e614C46dA4c459d0dB2121A986672F603c00'}];
const tokenAbi=new Interface(['function balanceOf(address) view returns(uint256)','function decimals() view returns(uint8)','event Transfer(address indexed from,address indexed to,uint256 value)']);
export const treasuryActivityAssets=[{symbol:'OINK',address:OINK_TOKEN,decimals:18},...VERIFIED_FARM_WRITES.flatMap(farm=>farm.tokenAddress?[{symbol:farm.symbol,address:farm.tokenAddress,decimals:farm.decimals}]:[]),...TREASURY_EXTRA_TOKENS].filter((asset,index,list)=>list.findIndex(row=>getAddress(row.address)===getAddress(asset.address))===index);
const assets=treasuryActivityAssets;
async function snapshot(rpc:FarmReadRpc){if(BigInt(await rpc.send('eth_chainId',[]))!==369n)throw Error('Wrong chain');const block=await rpc.send('eth_getBlockByNumber',['latest',false]);if(!block?.hash||Date.now()-Number(BigInt(block.timestamp))*1000>120000)throw Error('Snapshot unavailable or stale');return block;}
export async function readTreasuryHoldings(rpc:FarmReadRpc,accounts=treasuryAccounts,signal?:AbortSignal){
  const block=await snapshot(rpc);
  const rows=[];
  // At most five asset reads at once, avoiding a burst of dozens of RPC calls.
  for(const owner of accounts){
    const allAssets=[{symbol:'PLS',address:null,decimals:18},...assets];
    const balances=[];
    for(let offset=0;offset<allAssets.length;offset+=5){
      signal?.throwIfAborted();
      balances.push(...await Promise.all(allAssets.slice(offset,offset+5).map(async asset=>{
        try{let balance:bigint;if(!asset.address)balance=BigInt(await rpc.send('eth_getBalance',[owner.address,block.number]));else{const read=async(fn:string,args:unknown[])=>tokenAbi.decodeFunctionResult(fn,await rpc.send('eth_call',[{to:asset.address,data:tokenAbi.encodeFunctionData(fn,args)},block.number]))[0];if((await read('decimals',[]))!==BigInt(asset.decimals))throw Error('Decimals changed');balance=await read('balanceOf',[owner.address]);}return {...asset,balance:formatUnits(balance,asset.decimals)};}catch{return {...asset,balance:null};}
      })));
    }
    rows.push({...owner,assets:balances});
  }
  signal?.throwIfAborted();
  if((await rpc.send('eth_getBlockByNumber',[block.number,false]))?.hash!==block.hash)throw Error('Snapshot changed');
  return {block:Number(BigInt(block.number)),timestamp:Number(BigInt(block.timestamp)),rows};
}
export type ActivityRow={key:string;hash:string;block:number;index:number;label:string;amount:string;address:string;recipient?:string;timestamp?:number};
export function decodeActivity(log:{address:string;topics:string[];data:string;transactionHash:string;blockNumber:string;logIndex:string;removed?:boolean}):ActivityRow|null {
  if(log.removed)return null;let label='',amount='';const address=getAddress(log.address),miner=TIME_MINER_CONTRACTS.find(v=>getAddress(v.address)===address),farm=VERIFIED_FARM_WRITES.find(v=>getAddress(v.address)===address),asset=assets.find(v=>getAddress(v.address)===address);
  try {
    if(miner){const p=minerEvents.parseLog(log);if(!p)return null;label=miner.label+' · '+({Deposit:'Miner deployed',GiftDeposit:'Miner gifted',Withdraw:'Miner ended',TransferStake:'Miner transferred',HopPool:'Miner upgraded'}[p.name]??p.name);amount=p.args.amount!==undefined?formatEther(p.args.amount)+' OINK':p.args.DTXamount!==undefined?formatEther(p.args.DTXamount)+' OINK':formatEther(p.args.shares)+' shares';}
    else if(farm){const p=farmExitEvents.parseLog(log);if(!p)return null;label=farm.symbol+' farm · '+(p.name==='SelfHarvest'?'Rewards claimed':'Position withdrawn');amount=formatEther(p.args.harvestAmount)+' OINK rewards';}
    else if(asset){const p=tokenAbi.parseLog(log);if(!p||p.args.value===0n)return null;const from=treasuryAccounts.find(v=>getAddress(v.address)===getAddress(p.args.from)),to=treasuryAccounts.find(v=>getAddress(v.address)===getAddress(p.args.to));if(!from&&!to)return null;label=from&&to?from.label+' → '+to.label:from?from.label+' sent '+asset.symbol:'Treasury received';amount=formatUnits(p.args.value,asset.decimals)+' '+asset.symbol;}
    else return null;
    const recipient=asset?getAddress(tokenAbi.parseLog(log)!.args.to):undefined;
    return {key:log.transactionHash+':'+log.logIndex,hash:log.transactionHash,block:Number(BigInt(log.blockNumber)),index:Number(BigInt(log.logIndex)),label,amount,address,recipient};
  }catch{return null;}
}
export async function readActivity(rpc:FarmReadRpc,end?:number){
  const tip=await snapshot(rpc),to=end??Number(BigInt(tip.number));if(!Number.isSafeInteger(to)||to<0||to>Number(BigInt(tip.number)))throw Error('Invalid activity range');
  const from=Math.max(0,to-24999),block=await rpc.send('eth_getBlockByNumber',[toQuantity(to),false]);
  const accounts=treasuryAccounts.map(v=>zeroPadValue(v.address,32)),transfer=tokenAbi.getEvent('Transfer')!.topicHash;
  const ranges=[{address:[...TIME_MINER_CONTRACTS,...VERIFIED_FARM_WRITES].map(v=>v.address)},{address:assets.map(v=>v.address),topics:[transfer,accounts]},{address:assets.map(v=>v.address),topics:[transfer,null,accounts]}];
  const results=await Promise.allSettled(ranges.map(filter=>rpc.send('eth_getLogs',[{...filter,fromBlock:toQuantity(from),toBlock:toQuantity(to)}])));
  if((await rpc.send('eth_getBlockByNumber',[toQuantity(to),false]))?.hash!==block?.hash)throw Error('Activity range changed');
  const failures=results.filter(v=>v.status==='rejected').length;if(failures===results.length)throw Error('Activity is unavailable from the public RPC.');
  const rows=new Map<string,ActivityRow>();for(const result of results)if(result.status==='fulfilled')for(const log of result.value){const row=decodeActivity(log);if(row)rows.set(row.key,row);}
  const sorted=[...rows.values()].sort((a,b)=>b.block-a.block||b.index-a.index);
  const blockTimes=new Map<number,number>();
  await Promise.all([...new Set(sorted.map(row=>row.block))].slice(0,80).map(async number=>{
    try{const b=await rpc.send('eth_getBlockByNumber',[toQuantity(number),false]);if(b?.timestamp)blockTimes.set(number,Number(BigInt(b.timestamp)));}catch{/* Missing timestamps only hide relative ages. */}
  }));
  const firstBlock=await rpc.send('eth_getBlockByNumber',[toQuantity(from),false]).catch(()=>null);
  return {from,to,fromTimestamp:firstBlock?.timestamp?Number(BigInt(firstBlock.timestamp)):null,toTimestamp:Number(BigInt(block.timestamp)),partial:failures>0,rows:sorted.map(row=>({...row,timestamp:blockTimes.get(row.block)}))};
}
