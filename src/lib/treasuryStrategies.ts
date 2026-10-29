import { Interface, formatUnits, getAddress } from "ethers";
import { OINK_TOKEN, TREASURY_WALLET } from "../config/contracts";
import { TREASURY_EXTRA_TOKENS } from "../config/treasuryAssets";
import { FARM_PRICE_TOKENS } from "./farmPrices";
import { accessSnapshot } from "./accessSnapshot";
import type { FarmReadRpc } from "./farmTransactions";

const printFarm = "0x857ab0cb7449Fb29429FC30596F08cfbf9F171F5";
const printStake = "0x35b99f29b3Ec3276A2b3Bb5863326B1c100aa160";
const actuator = "0x4469A40D4243aC1c6cF350d99B6d69b49b5005F1";
const earnChef = "0xB2Ca4A66d3e57a5a9A12043B6bAD28249fE302d4";
const printToken = TREASURY_EXTRA_TOKENS.find(row => row.symbol === "PRINT")!;
const earnToken = TREASURY_EXTRA_TOKENS.find(row => row.symbol === "EARN")!;
export const TREASURY_STRATEGIES = [
  { id:"print-reinvest", label:"PRINT reinvestment", address:"0x5C30303F7F9640E268d3CE5844E7E360009AC03C", symbol:"PRINT", pair:"0xF35F8Db9B6760799DB76796340AAcc69deA0C644", pool:null },
  { id:"print-inc", label:"PRINT rewards to INC", address:"0x026822796CAa38971523f2D8C4384F76b7C7b1B9", symbol:"PRINT", pair:"0xF35F8Db9B6760799DB76796340AAcc69deA0C644", pool:null },
  { id:"print-degen", label:"PRINT rewards to DEGEN burn", address:"0xE142C8cC17D9279A1aA01A0f8420A63E22F9782f", symbol:"PRINT", pair:"0xF35F8Db9B6760799DB76796340AAcc69deA0C644", pool:null },
  { id:"htt3000", label:"HTT-3000 liquidity", address:"0x599FE019e2e1dc71Dd11bc647AD53a4ac53a3b42", symbol:"HTT-3000", pair:"0xBB4D05C1663f079C1d9e0A4A6eE5a877CFE34F72", pool:0 },
  { id:"htt5000", label:"HTT-5000 liquidity", address:"0xbB3822Dc9c033D48b04Af93D4bF75f0A10ddda9d", symbol:"HTT-5000", pair:"0x290e43f97a071f7513f55B534b2C196b9eFa364C", pool:1 },
  { id:"htt7000", label:"HTT-7000 liquidity", address:"0x8B21bCBB2c67aa0aF2d8712853dCe80334621bE0", symbol:"HTT-7000", pair:"0x0d37481cD2c2E1a309a159Fd08D9F6eFd0a1F224", pool:2 },
  { id:"htt3000-oink", label:"HTT-3000 rewards to OINK burn", address:"0xCd026f1b1F8b04f045d13af21877Db98033FF84e", symbol:"HTT-3000", pair:"0xBB4D05C1663f079C1d9e0A4A6eE5a877CFE34F72", pool:0 },
  { id:"htt5000-plsx", label:"HTT-5000 rewards to PLSX", address:"0x488C81D85501769CF4Ca79ED657aF0633607ab1e", symbol:"HTT-5000", pair:"0x290e43f97a071f7513f55B534b2C196b9eFa364C", pool:1 },
  { id:"htt7000-ehex", label:"HTT-7000 rewards to eHEX", address:"0xD3270DC3361f34a1cb0c4cd2b0b352adB64D4498", symbol:"HTT-7000", pair:"0x0d37481cD2c2E1a309a159Fd08D9F6eFd0a1F224", pool:2 },
] as const;
const abi = new Interface([
  "function DTX() view returns(address)", "function treasury() view returns(address)",
  "function PAIR_ADDRESS() view returns(address)", "function farmingContract() view returns(address)", "function poolId() view returns(uint256)",
  "function balanceOf(address) view returns(uint256)", "function totalSupply() view returns(uint256)", "function decimals() view returns(uint8)",
  "function token0() view returns(address)", "function token1() view returns(address)", "function getReserves() view returns(uint112,uint112,uint32)",
  "function userInfo(uint256,address) view returns(uint256,uint256)", "function stakes(address) view returns(uint256)",
  "function poolLength() view returns(uint256)", "function poolInfo(uint256) view returns(address,uint256,uint256,uint256)",
  "function incMasterchef() view returns(address)",
]);
export function liquidityShare(reserves: readonly bigint[], owned: bigint, supply: bigint) {
  if(supply <= 0n || owned < 0n || owned > supply || reserves.some(value => value < 0n)) throw Error("Invalid liquidity position.");
  return reserves.map(value => value * owned / supply);
}
export type StrategyAsset = {symbol:string;address:string;balance:string|null};
export type TreasuryStrategyRow = {id:string;label:string;address:string;assets:StrategyAsset[];error:string};
export async function readTreasuryStrategies(rpc:FarmReadRpc,signal?:AbortSignal) {
  const s=await accessSnapshot(rpc);
  const reads=new Map<string,ReturnType<typeof s.read>>();
  const read=async(address:string,method:string,args:unknown[]=[])=>{
    signal?.throwIfAborted();const key=address.toLowerCase()+":"+method+":"+JSON.stringify(args);
    if(!reads.has(key))reads.set(key,s.read(address,method,args,abi));
    const value=await reads.get(key)!;signal?.throwIfAborted();return value;
  };
  const same=(a:string,b:string)=>{if(getAddress(a)!==getAddress(b))throw Error("Strategy mapping changed.");};
  const check=async(address:string)=>{const[token,treasury]=await Promise.all([read(address,"DTX"),read(address,"treasury")]);same(token[0],OINK_TOKEN);same(treasury[0],TREASURY_WALLET);};
  const rows:TreasuryStrategyRow[]=[];
  // Share fixed-block pair/metadata reads and limit concurrent strategies to three.
  const readStrategy=async(spec:(typeof TREASURY_STRATEGIES)[number])=>{
    signal?.throwIfAborted();
    const token=TREASURY_EXTRA_TOKENS.find(row=>row.symbol===spec.symbol)!;
    const paired={symbol:spec.symbol==="PRINT"?"INC":"HEX",address:spec.symbol==="PRINT"?FARM_PRICE_TOKENS.inc:FARM_PRICE_TOKENS.hex,decimals:spec.symbol==="PRINT"?18:8};
    try{
      await check(spec.address);same((await read(spec.address,"PAIR_ADDRESS"))[0],spec.pair);
      let staked:bigint;
      if(spec.pool===null)staked=BigInt((await read(printFarm,"balanceOf",[spec.address]))[0]);
      else{
        same((await read(spec.address,"farmingContract"))[0],actuator);
        if(BigInt((await read(spec.address,"poolId"))[0])!==BigInt(spec.pool))throw Error("Strategy pool changed.");
        staked=BigInt((await read(actuator,"userInfo",[spec.pool,spec.address]))[0]);
      }
      const [token0,token1,reserves,supply,direct,looseToken,loosePaired,decimals0,decimals1]=await Promise.all([
        read(spec.pair,"token0"),read(spec.pair,"token1"),read(spec.pair,"getReserves"),read(spec.pair,"totalSupply"),read(spec.pair,"balanceOf",[spec.address]),
        read(token.address,"balanceOf",[spec.address]),read(paired.address,"balanceOf",[spec.address]),read(token.address,"decimals"),read(paired.address,"decimals"),
      ]);
      if(decimals0[0]!==BigInt(token.decimals)||decimals1[0]!==BigInt(paired.decimals))throw Error("Strategy token decimals changed.");
      const reverse=getAddress(token0[0])===getAddress(token.address);
      same(reverse?token1[0]:token0[0],paired.address);same(reverse?token0[0]:token1[0],token.address);
      const share=liquidityShare([BigInt(reserves[0]),BigInt(reserves[1])],staked+BigInt(direct[0]),BigInt(supply[0]));
      const printStaked=spec.pool===null?BigInt((await read(printStake,"stakes",[spec.address]))[0]):0n;
      rows.push({...spec,error:"",assets:[
        {symbol:token.symbol,address:token.address,balance:formatUnits(share[reverse?0:1]+BigInt(looseToken[0])+printStaked,token.decimals)},
        {symbol:paired.symbol,address:paired.address,balance:formatUnits(share[reverse?1:0]+BigInt(loosePaired[0]),paired.decimals)},
      ]});
    }catch{rows.push({...spec,error:"Position unavailable",assets:[{symbol:token.symbol,address:token.address,balance:null},{symbol:paired.symbol,address:paired.address,balance:null}]});}
  };
  for(let index=0;index<TREASURY_STRATEGIES.length;index+=3)await Promise.all(TREASURY_STRATEGIES.slice(index,index+3).map(readStrategy));
  rows.sort((a,b)=>TREASURY_STRATEGIES.findIndex(row=>row.id===a.id)-TREASURY_STRATEGIES.findIndex(row=>row.id===b.id));
  const earnAddress="0xc6E9924Ea3141b5555b18b82f7Bd66f9BB084C2D";
  try{
    await check(earnAddress);same((await read(earnAddress,"incMasterchef"))[0],earnChef);
    const length=Number((await read(earnChef,"poolLength"))[0]);if(!Number.isSafeInteger(length)||length>100)throw Error("Staking registry changed.");
    let amount=BigInt((await read(earnToken.address,"balanceOf",[earnAddress]))[0]);
    if((await read(earnToken.address,"decimals"))[0]!==18n)throw Error("EARN decimals changed.");
    for(let i=0;i<length;i++)if(getAddress((await read(earnChef,"poolInfo",[i]))[0])===getAddress(earnToken.address))amount+=BigInt((await read(earnChef,"userInfo",[i,earnAddress]))[0]);
    rows.push({id:"earn",label:"EARN staking",address:earnAddress,error:"",assets:[{symbol:"EARN",address:earnToken.address,balance:formatUnits(amount,18)}]});
  }catch{rows.push({id:"earn",label:"EARN staking",address:earnAddress,error:"Position unavailable",assets:[{symbol:"EARN",address:earnToken.address,balance:null}]});}
  signal?.throwIfAborted();await s.finish();return {block:s.block,timestamp:s.timestamp,rows};
}
