// Reproducible read-only source/runtime evidence for participation actions.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import Module, { createRequire, registerHooks } from 'node:module';
import { JsonRpcProvider, keccak256, toUtf8Bytes } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {MINER_PREVIEW_SPECS}=await import('../src/config/minerPreviewVerification.ts');
const targets=[{id:'credit',address:'0xCF14DbcfFA6E99A444539aBbc9aE273a7bb5d75A'},{id:'consensus',address:'0x7917e04Eb4463CF80Cc00040BA0f1fF125926eF3'},...MINER_PREVIEW_SPECS];
const dir=path.resolve('evidence/participation-sources');await fs.mkdir(dir,{recursive:true});
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:6});
const fetchText=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text();};
const normalized=(hex,refs)=>{for(const list of Object.values(refs??{}))for(const {start,length} of list)hex=hex.slice(0,start*2)+'0'.repeat(length*2)+hex.slice((start+length)*2);return hex.slice(0,-(parseInt(hex.slice(-4),16)+2)*2);};
try {
 const block=await rpc.getBlock('latest');const rows=[];
 for(const target of targets){
  const sourceUrl='https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address='+target.address;
  const sourceFile=path.join(dir,target.id+'.json');let source;
  try{source=JSON.parse(await fs.readFile(sourceFile,'utf8'));}catch{source=JSON.parse(await fetchText(sourceUrl)).result[0];}
  if(source.IsProxy!=='false'||!source.SourceCode)throw Error('Missing verified source '+target.id);
  await fs.writeFile(sourceFile,JSON.stringify(source,null,2)+'\n');await fs.writeFile(path.join(dir,target.id+'.sol'),source.SourceCode);
  const compilerUrl='https://binaries.soliditylang.org/bin/soljson-'+source.CompilerVersion+'.js';const compilerPath=path.join(os.tmpdir(),'oink-soljson-'+source.CompilerVersion+'.js');let compilerText;
  try{compilerText=await fs.readFile(compilerPath,'utf8');}catch{compilerText=await fetchText(compilerUrl);await fs.writeFile(compilerPath,compilerText);}
  const mod=new Module(compilerPath);mod.paths=createRequire(import.meta.url).resolve.paths('solc');mod._compile(compilerText,compilerPath);
  const compile=mod.exports.cwrap('solidity_compile','string',['string','number','number']);
  const input={language:'Solidity',sources:{'Target.sol':{content:source.SourceCode}},settings:{optimizer:{enabled:source.OptimizationUsed==='true',runs:Number(source.OptimizationRuns)},outputSelection:{'*':{'*':['evm.deployedBytecode']}}}};
  const output=JSON.parse(compile(JSON.stringify(input),0,0));const errors=output.errors?.filter(e=>e.severity==='error');if(errors?.length)throw Error(JSON.stringify(errors));
  const compiled=output.contracts['Target.sol'][source.ContractName].evm.deployedBytecode;const code=await rpc.getCode(target.address,block.number);
  if(normalized(code.slice(2),compiled.immutableReferences)!==normalized(compiled.object,compiled.immutableReferences))throw Error('Source mismatch '+target.id);
  const row={id:target.id,address:target.address,runtimeCodeHash:keccak256(code),sourceUrl,sourceCodeHash:keccak256(toUtf8Bytes(source.SourceCode)),compiler:source.CompilerVersion,compilerHash:keccak256(toUtf8Bytes(compilerText)),optimizer:input.settings.optimizer,immutableReferences:compiled.immutableReferences,executableMatches:true};rows.push(row);console.log(target.id+' source executable matches '+row.runtimeCodeHash);
 }
 if((await rpc.getBlock(block.number)).hash!==block.hash)throw Error('Snapshot reorg');
 await fs.writeFile('evidence/participation-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),chainId:369,block:block.number,blockHash:block.hash,blockTimestamp:block.timestamp,rows},null,2)+'\n');
}finally{rpc.destroy();}
