import { Interface,JsonRpcProvider,keccak256 } from 'ethers';
import {readFile,writeFile}from'node:fs/promises';
const build=JSON.parse(await readFile('evidence/offer-builds.json','utf8'));
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true}),block=await rpc.getBlock('latest');
const abi=new Interface(['function viewVaults() view returns(address[])','function token0() view returns(address)','function token1() view returns(address)','function getReserves() view returns(uint112,uint112,uint32)','function governor() view returns(address)','function treasury() view returns(address)','function DTX() view returns(address)','function balanceOf(address) view returns(uint256)','function oldRewardContract() view returns(address)','function token() view returns(address)']);
const read=async(address,fn,args=[])=>abi.decodeFunctionResult(fn,await rpc.call({to:address,data:abi.encodeFunctionData(fn,args),blockTag:block.number}));
const state={};for(const row of build.rows){
 const hash=keccak256(await rpc.getCode(row.address,block.number));if(hash!==row.runtimeHash)throw Error(row.id+' runtime changed');
 if(row.id.endsWith('Pair'))state[row.id]={address:row.address,token0:(await read(row.address,'token0'))[0],token1:(await read(row.address,'token1'))[0],reserves:[...(await read(row.address,'getReserves'))].map(String)};
 else if(row.id==='sale')state.sale={governor:(await read(row.address,'governor'))[0],treasury:(await read(row.address,'treasury'))[0],token:(await read(row.address,'DTX'))[0]};
 else state[row.id]={governor:(await read(row.address,'governor'))[0],token:(await read(row.address,'token'))[0],vaults:await Promise.all([...(await read(row.address,'viewVaults'))[0]].map(async address=>({address,runtimeHash:keccak256(await rpc.getCode(address,block.number))})))};
}
if((await rpc.getBlock(block.number)).hash!==block.hash)throw Error('Reorg');
await writeFile('evidence/offer-state.json',JSON.stringify({checkedAt:new Date().toISOString(),chainId:369,block:block.number,blockHash:block.hash,state},null,2));console.log(JSON.stringify(state,null,2));rpc.destroy();
