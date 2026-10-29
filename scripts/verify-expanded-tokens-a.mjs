// Read-only token implementation evidence; no signer and no transaction sends.
// Explorer source is compiled, never executed. Compilers come from Solidity's official CDN.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import Module, { createRequire, registerHooks } from 'node:module';
import { Contract, Interface, JsonRpcProvider, keccak256, toUtf8Bytes } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const { VERIFIED_FARM_READS } = await import('../src/config/farmReadVerification.ts');
const rows=VERIFIED_FARM_READS.filter(r=>['hex','hoa','pdai','atropa','solidx','pusdt'].includes(r.id));
const evidenceDir=path.resolve('evidence');
const sourceDir=path.join(evidenceDir,'expanded-tokens-a-sources');
await fs.mkdir(sourceDir,{recursive:true});
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:6});
const sourceUrl=a=>'https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address='+a;
const fetchText=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(url+': '+r.status);return r.text();};
const withoutMetadata=hex=>{const len=(parseInt(hex.slice(-4),16)+2)*2;if(len>=hex.length)throw Error('Invalid compiler metadata');return hex.slice(0,-len);};
const maskImmutables=(hex,refs)=>{for(const list of Object.values(refs??{}))for(const {start,length} of list)hex=hex.slice(0,start*2)+'0'.repeat(length*2)+hex.slice((start+length)*2);return withoutMetadata(hex);};
const checks=[];
try {
  if(BigInt(await rpc.send('eth_chainId',[]))!==369n)throw Error('Wrong chain');
  const blockArg=process.argv.find(a=>a.startsWith('--block='));
  const block=await rpc.getBlock(blockArg?Number(blockArg.slice(8)):'latest');
  for(const row of rows){
    const sourceFile=path.join(sourceDir,row.id+'.json');
    let source;
    if(process.argv.includes('--refresh'))source=JSON.parse(await fetchText(sourceUrl(row.tokenAddress))).result[0];
    else try {source=JSON.parse(await fs.readFile(sourceFile,'utf8'));}catch{source=JSON.parse(await fetchText(sourceUrl(row.tokenAddress))).result[0];}
    if(source.IsProxy!=='false'||!source.SourceCode)throw Error('Unverified/proxy source '+row.id);
    await fs.writeFile(sourceFile,JSON.stringify(source,null,2)+'\n');
    await fs.writeFile(path.join(sourceDir,row.id+'.sol'),source.SourceCode);
    const compilerUrl='https://binaries.soliditylang.org/bin/soljson-'+source.CompilerVersion+'.js';
    const compilerPath=path.join(os.tmpdir(),'oink-soljson-'+source.CompilerVersion+'.js');
    let compilerText;
    try{compilerText=await fs.readFile(compilerPath,'utf8');}catch{compilerText=await fetchText(compilerUrl);await fs.writeFile(compilerPath,compilerText);}
    const mod=new Module(compilerPath);mod.paths=createRequire(import.meta.url).resolve.paths('solc');mod._compile(compilerText,compilerPath);
    const compiler=mod.exports;
    const compile=compiler.cwrap(compiler._solidity_compile?'solidity_compile':'compileStandard','string',['string','number','number']);
    const fileName=source.FileName||'Token.sol';
    const settings={...(source.CompilerSettings??{}),optimizer:{enabled:source.OptimizationUsed==='true',runs:Number(source.OptimizationRuns??200)},outputSelection:{'*':{'*':['evm.deployedBytecode']}}};
    const input={language:'Solidity',sources:{[fileName]:{content:source.SourceCode}},settings};
    const output=JSON.parse(compile(JSON.stringify(input),0,0));
    if(output.errors?.some(e=>e.severity==='error'))throw Error(row.id+': '+JSON.stringify(output.errors));
    const compiled=output.contracts[fileName][source.ContractName].evm.deployedBytecode;
    const code=await rpc.getCode(row.tokenAddress,block.number);
    const executableMatches=maskImmutables(code.slice(2),compiled.immutableReferences)===maskImmutables(compiled.object,compiled.immutableReferences);
    if(!executableMatches)throw Error('Executable mismatch: '+row.id);
    const c=new Contract(row.tokenAddress,JSON.parse(source.ABI),rpc);
    const iface=new Interface(['function approve(address,uint256) returns(bool)','function transfer(address,uint256) returns(bool)','function transferFrom(address,address,uint256) returns(bool)']);
    // Zero-amount eth_call proves return encoding without state changes or spending.
    const caller=row.address;
    const calls={approve:[row.address,0n],transfer:[row.address,0n],transferFrom:[caller,row.address,0n]};
    const encoding={};
    for(const [fn,args] of Object.entries(calls))encoding[fn]=await rpc.call({from:caller,to:row.tokenAddress,data:iface.encodeFunctionData(fn,args),blockTag:block.number});
    const mutableState={};
    if(row.id==='atropa')mutableState.owner=await c.owner({blockTag:block.number});
    if(row.id==='pusdt'){
      for(const fn of ['deprecated','upgradedAddress','paused','basisPointsRate','maximumFee','owner'])mutableState[fn]=await c[fn]({blockTag:block.number});
      mutableState.vaultBlacklisted=await c.isBlackListed(row.address,{blockTag:block.number});
      mutableState.sampleCallerBlacklisted=await c.isBlackListed(caller,{blockTag:block.number});
    }
    const result={id:row.id,tokenAddress:row.tokenAddress,vaultAddress:row.address,decimals:Number(await c.decimals({blockTag:block.number})),runtimeCodeHash:keccak256(code),runtimeBytes:(code.length-2)/2,sourceUrl:sourceUrl(row.tokenAddress),sourceHash:keccak256(toUtf8Bytes(source.SourceCode)),compiler:source.CompilerVersion,compilerUrl,compilerTextHash:keccak256(toUtf8Bytes(compilerText)),compilerSettings:settings,executableMatches,immutableReferences:compiled.immutableReferences??{},metadataIgnored:true,zeroAmountEthCallReturns:encoding,mutableState};
    if(result.decimals!==row.decimals)throw Error('Decimals mismatch '+row.id);
    await fs.writeFile(path.join(sourceDir,row.id+'.runtime.hex'),code+'\n');
    checks.push(result);
    console.log(JSON.stringify(result,(_,v)=>typeof v==='bigint'?v.toString():v));
  }
  if((await rpc.getBlock(block.number)).hash!==block.hash)throw Error('Pinned block changed');
  const result={chainId:369,blockNumber:block.number,blockHash:block.hash,blockTimestamp:block.timestamp,checkedAt:new Date().toISOString(),readOnly:true,tokens:checks};
  await fs.writeFile(path.join(evidenceDir,'expanded-tokens-a.json'),JSON.stringify(result,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
  console.log('Verified '+checks.length+' token implementations at block '+block.number);
}catch(error){console.error(error.shortMessage??error.message);process.exitCode=1;}finally{rpc.destroy();}
