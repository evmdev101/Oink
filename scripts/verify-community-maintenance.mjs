import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Module from 'node:module';
import {Interface,keccak256} from 'ethers';
const targets={buyback:'0xa36d037B01C148025C54e4f86C0032F05a93D4Ce',farmer:'0xc6E9924Ea3141b5555b18b82f7Bd66f9BB084C2D'};
const dir='evidence/community-maintenance';await fs.mkdir(dir,{recursive:true});
const text=async u=>{const r=await fetch(u,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text()};
let sequence=0;const rpc=async(method,params)=>{const r=await fetch('https://rpc.pulsechain.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++sequence,method,params}),signal:AbortSignal.timeout(45000)});const v=await r.json();if(v.error)throw Error(JSON.stringify(v.error));return v.result};
if(BigInt(await rpc('eth_chainId',[]))!==369n)throw Error('Wrong chain');const block=await rpc('eth_getBlockByNumber',['latest',false]);const rows=[];
function normalize(hex,refs){for(const list of Object.values(refs??{}))for(const{start,length}of list)hex=hex.slice(0,start*2)+'0'.repeat(length*2)+hex.slice((start+length)*2);return hex.slice(0,-(parseInt(hex.slice(-4),16)+2)*2)}
for(const[id,address]of Object.entries(targets)){
 const source=JSON.parse(await text('https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address='+address)).result[0];if(!source.SourceCode||source.IsProxy!=='false')throw Error('Unverified/proxy '+id);
 await fs.writeFile(path.join(dir,id+'-source.json'),JSON.stringify(source,null,2));await fs.writeFile(path.join(dir,id+'.sol'),source.SourceCode);
 const compilerPath=path.join(os.tmpdir(),'oink-soljson-'+source.CompilerVersion+'.js');let compilerText;try{compilerText=await fs.readFile(compilerPath,'utf8')}catch{compilerText=await text('https://binaries.soliditylang.org/bin/soljson-'+source.CompilerVersion+'.js');await fs.writeFile(compilerPath,compilerText)}
 const mod=new Module(compilerPath);mod._compile(compilerText,compilerPath);const compile=mod.exports.cwrap('solidity_compile','string',['string','number','number']),file=source.FileName||'Contract.sol';
 const settings={...(source.CompilerSettings??{}),optimizer:{enabled:source.OptimizationUsed==='true',runs:Number(source.OptimizationRuns??200)},outputSelection:{'*':{'*':['evm.deployedBytecode','abi']}}};
 const out=JSON.parse(compile(JSON.stringify({language:'Solidity',sources:{[file]:{content:source.SourceCode}},settings}),0,0));if(out.errors?.some(e=>e.severity==='error'))throw Error(JSON.stringify(out.errors));
 const artifact=out.contracts[file][source.ContractName],compiled=artifact.evm.deployedBytecode,runtime=await rpc('eth_getCode',[address,block.number]);if(normalize(runtime.slice(2),compiled.immutableReferences)!==normalize(compiled.object,compiled.immutableReferences))throw Error('Runtime differs '+id);
 const abi=artifact.abi,iface=new Interface(abi),state={};for(const name of ['DTX','wPLS','UNISWAP_ROUTER_ADDRESS','PAIR_ADDRESS','governor','treasury','masterchef','chef','owner'])if(iface.hasFunction(name))try{state[name]=String(iface.decodeFunctionResult(name,await rpc('eth_call',[{to:address,data:iface.encodeFunctionData(name)},block.number]))[0])}catch{}
 rows.push({id,address,runtimeCodeHash:keccak256(runtime),sourceHash:keccak256(Buffer.from(source.SourceCode)),compiler:source.CompilerVersion,executableMatches:true,state,abi});console.log(id,source.ContractName,state);
}
const dependencies={router:'0x165C3410fC91EF562C50559f7d2289fEbed552d9',incChef:'0xB2Ca4A66d3e57a5a9A12043B6bAD28249fE302d4',pair:rows.find(r=>r.id==='buyback').state.PAIR_ADDRESS,wpls:'0xA1077a294dDE1B09bB078844df40758a5D0f9a27'};
for(const[id,address]of Object.entries(dependencies)){const runtime=await rpc('eth_getCode',[address,block.number]);if(runtime==='0x')throw Error('No code '+id);rows.push({id,address,runtimeCodeHash:keccak256(runtime)})}
if((await rpc('eth_getBlockByNumber',[block.number,false])).hash!==block.hash)throw Error('Reorganized snapshot');
await fs.writeFile('evidence/community-maintenance.json',JSON.stringify({checkedAt:new Date().toISOString(),block:Number(BigInt(block.number)),blockHash:block.hash,rows},null,2));
await fs.writeFile('src/config/communityMaintenanceVerification.ts','// Verified source recompilation and exact runtime evidence: evidence/community-maintenance.json.\nexport const COMMUNITY_DEPLOYMENTS = '+JSON.stringify(Object.fromEntries(rows.map(({id,address,runtimeCodeHash})=>[id,{address,runtimeCodeHash}])),null,2)+' as const;\n');
