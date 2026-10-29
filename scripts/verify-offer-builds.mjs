// Public RPC/source reads only; never connects a wallet or broadcasts.
import Module, { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { JsonRpcProvider, keccak256, toUtf8Bytes } from 'ethers';
const addresses = { sale:'0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e', referral:'0xf69357627d6dcc463ac30273Aae13fDB49B07C15', legacyReferral:'0x066F0a45801bcbc5232b11ed4b97c39E1369fe59', oinkPair:'0xEf9Ea3d72e28c7140481209190601C085027D6fE', plsxPair:'0x1b45b9148791d3a104184Cd5DFE5CE57193a3ee9', incPair:'0xf808Bb6265e9Ca27002c0A04562Bf50d4FE37EAA', hexPair:'0xf1F4ee610b2bAbB05C635F726eF8B0C568c8dc65' };
await mkdir('evidence/offer-sources',{recursive:true});
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true});
const block=await rpc.getBlock('latest');
const compilers=new Map(),rows=[];
const strip=hex=>{const size=parseInt(hex.slice(-4),16);if(size+2>=hex.length/2)throw Error('Invalid metadata trailer');return hex.slice(0,-(size+2)*2);};
for(const [id,address] of Object.entries(addresses)){
  const sourceUrl='https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address='+address;
  const source=(await(await fetch(sourceUrl)).json()).result[0];
  await writeFile('evidence/offer-sources/'+id+'.json',JSON.stringify(source,null,2));
  await writeFile('evidence/offer-sources/'+id+'.sol',source.SourceCode);
  if(source.IsProxy!=='false')throw Error(id+' proxy review required');
  let compiler=compilers.get(source.CompilerVersion);
  if(!compiler){
    const url='https://binaries.soliditylang.org/bin/soljson-'+source.CompilerVersion+'.js',text=await(await fetch(url)).text(),mod=new Module(import.meta.filename);
    mod.paths=createRequire(import.meta.url).resolve.paths('solc');mod._compile(text,import.meta.filename);
    compiler={compile:mod.exports.cwrap('solidity_compile','string',['string','number','number']),url,hash:keccak256(toUtf8Bytes(text))};compilers.set(source.CompilerVersion,compiler);
  }
  const input={language:'Solidity',sources:{'Offer.sol':{content:source.SourceCode}},settings:{optimizer:{enabled:source.OptimizationUsed==='true',runs:Number(source.OptimizationRuns??200)},outputSelection:{'*':{'*':['evm.deployedBytecode','abi']}}}};
  const out=JSON.parse(compiler.compile(JSON.stringify(input),0,0));
  if(out.errors?.some(e=>e.severity==='error'))throw Error(JSON.stringify(out.errors));
  const compiled=out.contracts['Offer.sol'][source.ContractName].evm.deployedBytecode;
  const runtime=await rpc.getCode(address,block.number);let actual=runtime.slice(2),expected=compiled.object;
  for(const refs of Object.values(compiled.immutableReferences??{}))for(const {start,length}of refs){actual=actual.slice(0,start*2)+'0'.repeat(length*2)+actual.slice((start+length)*2);expected=expected.slice(0,start*2)+'0'.repeat(length*2)+expected.slice((start+length)*2);}
  if(strip(actual)!==strip(expected))throw Error(id+' executable mismatch');
  const row={id,address,sourceUrl,contractName:source.ContractName,sourceHash:keccak256(toUtf8Bytes(source.SourceCode)),compiler:source.CompilerVersion,compilerUrl:compiler.url,compilerHash:compiler.hash,optimizer:input.settings.optimizer,executableRuntimeMatches:true,runtimeHash:keccak256(runtime),immutableReferences:compiled.immutableReferences};rows.push(row);console.log(JSON.stringify(row));
}
if((await rpc.getBlock(block.number)).hash!==block.hash)throw Error('Reorg');
await writeFile('evidence/offer-builds.json',JSON.stringify({checkedAt:new Date().toISOString(),chainId:369,block:block.number,blockHash:block.hash,blockTimestamp:block.timestamp,rows},null,2));rpc.destroy();
