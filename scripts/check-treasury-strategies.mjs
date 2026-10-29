import fs from 'node:fs/promises';
import { JsonRpcProvider, Contract, formatUnits } from 'ethers';
const targets=[
  ['earn','0xc6E9924Ea3141b5555b18b82f7Bd66f9BB084C2D'],
  ['print','0x5C30303F7F9640E268d3CE5844E7E360009AC03C'],
  ['htt5000','0xbB3822Dc9c033D48b04Af93D4bF75f0A10ddda9d'],
  ['htt7000','0x8B21bCBB2c67aa0aF2d8712853dCe80334621bE0'],
  ['htt3000','0x599FE019e2e1dc71Dd11bc647AD53a4ac53a3b42'],
];
const results=[];
for(const [id,address] of targets){
  const sourceUrl='https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address='+address;
  const response=await fetch(sourceUrl,{signal:AbortSignal.timeout(20000)});
  const source=(await response.json()).result?.[0];
  if(!source?.ABI?.startsWith('['))throw Error('Source ABI unavailable: '+id);
  const abi=JSON.parse(source.ABI);
  const views=abi.filter(row=>row.type==='function'&&['view','pure'].includes(row.stateMutability));
  results.push({id,address,sourceUrl,name:source.ContractName,abi,source:source.SourceCode});
  console.log(id,source.ContractName,views.map(row=>row.name+'('+row.inputs.map(input=>input.type).join(',')+')').join(' '));
}
await fs.writeFile('evidence/treasury-strategy-sources-2026-10-21.json',JSON.stringify(results,null,2));
