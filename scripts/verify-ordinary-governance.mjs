import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Module from 'node:module';
import { Interface, keccak256, toUtf8Bytes } from 'ethers';
const deployments={basic:'0x5DebADaf41ED55270e0F9944FD389745e73d29B9',farms:'0x0dc0Fabe4c9d57cCaD055b4cD627D0d24fA3C98E',reward:'0xc77c66913B5f60522Ccb98857228511930da7403'};
const dir=path.resolve('evidence/ordinary-governance');await fs.mkdir(dir,{recursive:true});
const fetchText=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text();};
let sequence=0;const rpc=async(method,params)=>{const r=await fetch('https://rpc.pulsechain.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++sequence,method,params}),signal:AbortSignal.timeout(45000)});const result=await r.json();if(result.error)throw Error(JSON.stringify(result.error));return result.result;};
if(BigInt(await rpc('eth_chainId',[]))!==369n)throw Error('Wrong chain');
const block=await rpc('eth_getBlockByNumber',['latest',false]);const rows=[];
function normalize(hex,refs){for(const list of Object.values(refs))for(const {start,length} of list)hex=hex.slice(0,start*2)+'0'.repeat(length*2)+hex.slice((start+length)*2);const count=(parseInt(hex.slice(-4),16)+2)*2;return hex.slice(0,-count);}
for(const[id,address]of Object.entries(deployments)){
 const url='https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address='+address;
 const source=JSON.parse(await fetchText(url)).result[0];if(!source.SourceCode||source.IsProxy!=='false')throw Error('Unverified/proxy '+id);
 await fs.writeFile(path.join(dir,id+'-source.json'),JSON.stringify(source,null,2));await fs.writeFile(path.join(dir,id+'.sol'),source.SourceCode);
 const compilerUrl='https://binaries.soliditylang.org/bin/soljson-'+source.CompilerVersion+'.js';const compilerPath=path.join(os.tmpdir(),'oink-soljson-'+source.CompilerVersion+'.js');
 let compilerText;try{compilerText=await fs.readFile(compilerPath,'utf8');}catch{compilerText=await fetchText(compilerUrl);await fs.writeFile(compilerPath,compilerText);}
 const module=new Module(compilerPath);module._compile(compilerText,compilerPath);const compiler=module.exports;
 const compile=compiler.cwrap('solidity_compile','string',['string','number','number']);const file=source.FileName||'Contract.sol';
 const settings={...(source.CompilerSettings??{}),optimizer:{enabled:source.OptimizationUsed==='true',runs:Number(source.OptimizationRuns)},outputSelection:{'*':{'*':['evm.deployedBytecode']}}};
 const out=JSON.parse(compile(JSON.stringify({language:'Solidity',sources:{[file]:{content:source.SourceCode}},settings}),0,0));if(out.errors?.some(e=>e.severity==='error'))throw Error(JSON.stringify(out.errors));
 const compiled=out.contracts[file][source.ContractName].evm.deployedBytecode;const runtime=await rpc('eth_getCode',[address,block.number]);
 if(normalize(runtime.slice(2),compiled.immutableReferences)!==normalize(compiled.object,compiled.immutableReferences))throw Error('Runtime differs '+id);
 const abi=JSON.parse(source.ABI), iface=new Interface(abi),state={};
 for(const name of ['owner','token','creditContract','masterchef'])if(iface.hasFunction(name))state[name]=iface.decodeFunctionResult(name,await rpc('eth_call',[{to:address,data:iface.encodeFunctionData(name)},block.number]))[0];
 const refs=Object.values(compiled.immutableReferences).flat();for(const ref of refs){const actual='0x'+runtime.slice(2+ref.start*2,2+(ref.start+ref.length)*2).slice(-40);if(actual.toLowerCase()!=='0xfaac6a85c3e123ab2cf7669b1024f146cfef0b38')throw Error('Unexpected immutable '+id);}
 rows.push({id,address,runtimeCodeHash:keccak256(runtime),sourceUrl:url,sourceHash:keccak256(toUtf8Bytes(source.SourceCode)),compiler:source.CompilerVersion,settings,executableMatches:true,immutableReferences:compiled.immutableReferences,state,abi});console.log('Verified '+id);
}
if((await rpc('eth_getBlockByNumber',[block.number,false])).hash!==block.hash)throw Error('Reorganized snapshot');
await fs.writeFile('evidence/ordinary-governance.json',JSON.stringify({checkedAt:new Date().toISOString(),block:Number(BigInt(block.number)),blockHash:block.hash,rows},null,2));
await fs.writeFile('src/config/ordinaryGovernanceVerification.ts','// Source recompilation and runtime evidence: evidence/ordinary-governance.json\nexport const ORDINARY_DEPLOYMENTS = '+JSON.stringify(Object.fromEntries(rows.map(({id,address,runtimeCodeHash,abi})=>[id,{address,runtimeCodeHash,abi}])),null,2)+' as const;\n');
