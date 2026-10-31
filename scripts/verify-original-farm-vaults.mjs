// Public reads and compiler verification only. Never connects a wallet or sends transactions.
import fs from 'node:fs/promises';
import Module,{createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {keccak256,toUtf8Bytes} from 'ethers';
const captured=JSON.parse(await fs.readFile('evidence/original-farm-parity-live.json','utf8'));
const compilerUrl='https://binaries.soliditylang.org/bin/soljson-v0.8.20+commit.a1b79de6.js';
const response=await fetch(compilerUrl,{signal:AbortSignal.timeout(45000)});assert(response.ok);
const compiler=await response.text();
assert.equal(keccak256(toUtf8Bytes(compiler)),'0x3a420fa9963772eee5b9221ebb8cf9548eea8f88b09537390960ea9b440f333c');
const mod=new Module(import.meta.filename);mod.paths=createRequire(import.meta.url).resolve.paths('solc');mod._compile(compiler,import.meta.filename);
const compile=mod.exports.cwrap('solidity_compile','string',['string','number','number']);
let seq=0;
async function rpc(method,params){const r=await fetch('https://rpc.pulsechain.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++seq,method,params}),signal:AbortSignal.timeout(30000)});assert(r.ok);const j=await r.json();assert(!j.error,JSON.stringify(j.error));return j.result;}
const strip=hex=>hex.slice(0,-(parseInt(hex.slice(-4),16)+2)*2);
const out={checkedAt:new Date().toISOString(),readOnly:true,block:captured.block.number,compilerHash:keccak256(toUtf8Bytes(compiler)),rows:[]};
for(const row of captured.rows){
 const sourceResponse = await fetch('https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address='+row.vault,{signal:AbortSignal.timeout(30000)}); assert(sourceResponse.ok);
 const source = (await sourceResponse.json()).result[0];
 assert.equal(source.CompilerVersion,'v0.8.20+commit.a1b79de6');
 const input={language:'Solidity',sources:{'Vault.sol':{content:source.SourceCode}},settings:{optimizer:{enabled:source.OptimizationUsed==='true',runs:Number(source.OptimizationRuns??200)},outputSelection:{'*':{'*':['evm.deployedBytecode']}}}};
 const result=JSON.parse(compile(JSON.stringify(input),0,0));assert(!result.errors?.some(e=>e.severity==='error'),JSON.stringify(result.errors));
 const compiled=result.contracts['Vault.sol'][source.ContractName].evm.deployedBytecode;
 const runtime=await rpc('eth_getCode',[row.vault,captured.block.number]);assert.equal(keccak256(runtime),row.vaultRuntimeHash);
 let code=runtime.slice(2),expected=compiled.object;
 for(const refs of Object.values(compiled.immutableReferences))for(const {start,length}of refs){
  const value='0x'+code.slice(start*2,(start+length)*2).slice(-40);
  assert([row.token.toLowerCase(),'0xfaac6a85c3e123ab2cf7669b1024f146cfef0b38'].includes(value.toLowerCase()));
  code=code.slice(0,start*2)+'0'.repeat(length*2)+code.slice((start+length)*2);
  expected=expected.slice(0,start*2)+'0'.repeat(length*2)+expected.slice((start+length)*2);
 }
 assert.equal(strip(code),strip(expected),row.id+' compiled vault must match chain');
 const checked={...row,compiledVaultMatches:true,vaultSourceHash:keccak256(toUtf8Bytes(source.SourceCode)),accounting:row.id==='ptgc'||row.id==='ufo'?'received':'nominal'};
 out.rows.push(checked);console.log(row.id+': complete compiled vault matches deployment; '+checked.accounting+' accounting');
}
assert.equal((await rpc('eth_getBlockByNumber',[captured.block.number,false])).hash,captured.block.hash);
await fs.writeFile('evidence/original-farm-parity-verification.json',JSON.stringify(out,null,2));
