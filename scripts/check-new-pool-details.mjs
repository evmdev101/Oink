import {readFile,writeFile} from 'node:fs/promises';
import {JsonRpcProvider,Contract} from 'ethers';
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true});
try {
const block=await rpc.getBlock('latest');const pools=JSON.parse(await readFile('evidence/new-pool-source-review.json'));const results=[];
for(const p of pools){const c=new Contract(p.address,JSON.parse(p.abi),rpc);const fields=['masterchef1','masterchef2','rewardToken1','rewardToken2','poolID1','poolID2','totalNFTs','mintContract','helperToken','defaultFee'];const values={};for(const f of fields){try{values[f]=String(await c[f]({blockTag:block.number}));}catch(e){values[f]='unavailable';}}
const chef=new Contract(values.masterchef1,['function poolInfo(uint256) view returns(uint256,uint256,address)','function totalAllocPoint() view returns(uint256)'],rpc);try{const info=await chef.poolInfo(values.poolID1,{blockTag:block.number});values.currentAllocation=String(info[0]);}catch{}
results.push({pool:p.poolId,address:p.address,contractName:p.contractName,...values,sourceUrl:p.sourceUrl});}
const result={checkedAt:new Date().toISOString(),block:block.number,results};await writeFile('evidence/new-pool-live-review.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{rpc.destroy()}
