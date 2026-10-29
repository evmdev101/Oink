import {registerHooks} from 'node:module';
import {Contract,JsonRpcProvider,formatEther,formatUnits} from 'ethers';
import fs from 'node:fs';
import assert from 'node:assert/strict';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const {CORE_CONTRACTS,GOVERNANCE_CONTRACTS,TIME_MINER_CONTRACTS,ECOSYSTEM_MINER_CONTRACTS,OINK_TOKEN,TREASURY_WALLET}=await import('../src/config/contracts.ts');
const {treasuryAccounts,readTreasuryHoldings,readActivity}=await import('../src/lib/treasuryActivity.ts');
const {readMinerYield}=await import('../src/lib/minerLive.ts');
const {snapshotRunner}=await import('../src/lib/governanceReadSafety.ts');
const {isNftDashboardPool,NFT_PROJECTS}=await import('../src/config/nftProjects.ts');
const {FARM_PRICE_TOKENS,selectFarmPrices}=await import('../src/lib/farmPrices.ts');
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:10});
const address=(records,id)=>records.find(row=>row.id===id).address;
try {
 const block=await rpc.getBlock('latest'),tag={blockTag:block.number};
 const runner=snapshotRunner(rpc,block.number);
 const token=new Contract(OINK_TOKEN,['function totalSupply() view returns(uint256)','function balanceOf(address) view returns(uint256)'],runner);
 const chef=new Contract(address(CORE_CONTRACTS,'inflation'),['function poolLength() view returns(uint256)','function poolInfo(uint256) view returns(uint256,uint256,address)','function totalAllocPoint() view returns(uint256)','function DTXPerBlock() view returns(uint256)'],runner);
 const consensus=new Contract(address(GOVERNANCE_CONTRACTS,'consensus'),['function governorCount() view returns(uint256)','function totalDTXStaked() view returns(uint256)'],runner);
 const senate=new Contract(address(CORE_CONTRACTS,'senate'),['function senatorCount() view returns(uint256)'],runner);
 const hex=new Contract(address(ECOSYSTEM_MINER_CONTRACTS,'t-share'),['function totalTshares() view returns(uint256)'],runner);
 const [supply,treasuryOink,treasuryPls,length,totalAlloc,emission,members,senators,governanceAccounting,hexShares]=await Promise.all([token.totalSupply(),token.balanceOf(TREASURY_WALLET),rpc.getBalance(TREASURY_WALLET,block.number),chef.poolLength(),chef.totalAllocPoint(),chef.DTXPerBlock(),consensus.governorCount(),senate.senatorCount(),consensus.totalDTXStaked(),hex.totalTshares()]);
 const pools=await Promise.all(Array.from({length:Number(length)},(_,i)=>chef.poolInfo(i)));
 assert.equal(pools.reduce((sum,row)=>sum+row[0],0n),totalAlloc,'Registry allocation sum must match contract total');
 const earlier=await rpc.getBlock(block.number-100);
 const miners=await Promise.all(TIME_MINER_CONTRACTS.map(async(spec,i)=>{
  const c=new Contract(spec.address,['function balanceOf() view returns(uint256)','function totalShares() view returns(uint256)'],runner);
  const [accounting,shares,tokens,yieldEstimate]=await Promise.all([c.balanceOf(),c.totalShares(),token.balanceOf(spec.address),readMinerYield(spec.id,runner,rpc,block.number,block.timestamp)]);
  const independentAnnual=Number(emission)*Number(pools[i][0])/Number(totalAlloc)*(block.number-earlier.number)/(block.timestamp-earlier.timestamp)*86400*365;
  const independentApr=independentAnnual/Number(accounting)*100;
  assert.ok(Math.abs(Number(yieldEstimate.apr)-independentApr)<0.011,'APR must agree with independent emission calculation');
  return {label:spec.label,address:spec.address,accounting:formatEther(accounting),tokenBalance:formatEther(tokens),shares:formatEther(shares),apr:yieldEstimate.apr,allocation:String(pools[i][0])};
 }));
 const minerAccounting=miners.reduce((sum,row)=>sum+Number(row.accounting),0);
 const minerTokens=miners.reduce((sum,row)=>sum+Number(row.tokenBalance),0);
 const pairAddress='0xef9ea3d72e28c7140481209190601c085027d6fe';
 const pair=new Contract(pairAddress,['function totalSupply() view returns(uint256)','function balanceOf(address) view returns(uint256)'],runner);
 const pls=new Contract(FARM_PRICE_TOKENS.pls,['function balanceOf(address) view returns(uint256)'],runner);
 const [pairOink,pairPls,lpTotal,lpOwned]=await Promise.all([token.balanceOf(pairAddress),pls.balanceOf(pairAddress),pair.totalSupply(),pair.balanceOf(TREASURY_WALLET)]);
 assert.ok(minerTokens+Number(formatEther(pairOink))<=Number(formatEther(supply)));
 const holdings=await readTreasuryHoldings(rpc);
 const allHoldings=Object.fromEntries(['PLS','OINK','PLSX','INC','HEX'].map(symbol=>[symbol,holdings.rows.map(owner=>({account:owner.label,balance:owner.assets.find(asset=>asset.symbol===symbol)?.balance??null}))]));
 const activity=await readActivity(rpc);
 const fromBlock=await rpc.getBlock(activity.from);
 const inflows=activity.rows.filter(row=>row.label==='Treasury received');
 let prices={};try {const response=await fetch('https://api.dexscreener.com/tokens/v1/pulsechain/'+Object.values(FARM_PRICE_TOKENS).join(','),{signal:AbortSignal.timeout(15000)});prices=selectFarmPrices(await response.json());}catch(e){prices={error:String(e)}}
 const report={checkedAt:new Date().toISOString(),readOnly:true,block:block.number,timestamp:block.timestamp,header:{supply:formatEther(supply),treasuryOink:formatEther(treasuryOink),treasuryPls:formatEther(treasuryPls),minerDurations:miners.length,linkedNftProjects:NFT_PROJECTS.length},registry:{pools:Number(length),allocatedPools:pools.filter(row=>row[0]>0n).length,nftPools:pools.filter(row=>isNftDashboardPool(row[2])).length,totalAllocation:String(totalAlloc),allocations:pools.map((row,index)=>({index,address:row[2],points:String(row[0]),percent:Number(row[0])*100/Number(totalAlloc)}))},participation:{governorProposals:String(members),senators:String(senators),minerAccounting,minerTokenBalances:minerTokens,governanceAccounting:formatEther(governanceAccounting),governanceTokenBalance:formatEther(await token.balanceOf(address(GOVERNANCE_CONTRACTS,'consensus'))),minerShares:miners.reduce((sum,row)=>sum+Number(row.shares),0),hexTshares:formatUnits(hexShares-100000000n,12)},miners,supplyLocation:{miners:minerTokens,liquidityPair:formatEther(pairOink),otherAccounts:Number(formatEther(supply))-minerTokens-Number(formatEther(pairOink))},liquidity:{totalPls:formatEther(pairPls),totalOink:formatEther(pairOink),treasuryPls:formatEther(pairPls*lpOwned/lpTotal),treasuryOink:formatEther(pairOink*lpOwned/lpTotal)},holdings:{block:holdings.block,accounts:treasuryAccounts,assets:allHoldings},activity:{from:activity.from,to:activity.to,fromTimestamp:fromBlock.timestamp,partial:activity.partial,inflows:inflows.length,missingTimestamps:inflows.filter(row=>!row.timestamp).length,rows:inflows},prices};
 fs.writeFileSync('evidence/dashboard-stats-audit-2026-10-10.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,holdings:{block:holdings.block,totals:Object.fromEntries(Object.entries(allHoldings).map(([s,rows])=>[s,rows.every(row=>row.balance!=null)?rows.reduce((sum,row)=>sum+Number(row.balance),0):null]))},activity:{...report.activity,rows:undefined},prices:Object.keys(prices)},null,2));
} finally {rpc.destroy();}

