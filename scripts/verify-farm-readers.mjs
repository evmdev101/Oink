// Read-only evidence for the public farm readers, separate from wallet permissions.
import { createRequire, registerHooks } from 'node:module';
import Module from 'node:module';
import { Contract, JsonRpcProvider, keccak256 } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const { ECOSYSTEM_MINER_CONTRACTS, OINK_TOKEN } = await import('../src/config/contracts.ts');
const { VERIFIED_FARM_WRITES } = await import('../src/config/farmWriteVerification.ts');
const compilerText=await (await fetch('https://binaries.soliditylang.org/bin/soljson-v0.8.20+commit.a1b79de6.js')).text();
const compilerModule=new Module(import.meta.filename);
compilerModule.paths=createRequire(import.meta.url).resolve.paths('solc');
compilerModule._compile(compilerText,import.meta.filename);
const compile=compilerModule.exports.cwrap('solidity_compile','string',['string','number','number']);
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:6});
const withoutMetadata=hex=>hex.slice(0,-(parseInt(hex.slice(-4),16)+2)*2);
try {
  if(BigInt(await rpc.send('eth_chainId',[]))!==369n)throw Error('Wrong chain');
  const block=await rpc.getBlock('latest');
  const masterchef=VERIFIED_FARM_WRITES[0].masterchef;
  if(keccak256(await rpc.getCode(masterchef,block.number))!==VERIFIED_FARM_WRITES[0].masterchefRuntimeCodeHash)throw Error('Chef changed');
  const chef=new Contract(masterchef,['function poolInfo(uint256) view returns(uint256,uint256,address)','function dtx() view returns(address)'],rpc);
  if((await chef.dtx({blockTag:block.number})).toLowerCase()!==OINK_TOKEN.toLowerCase())throw Error('Wrong reward token');
  const compiledCache=new Map();
  async function getCompiled(address) {
  const source=(await (await fetch('https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address='+address)).json()).result[0];
  if(source.CompilerVersion!=='v0.8.20+commit.a1b79de6'||source.IsProxy!=='false')throw Error('Unexpected compiler/proxy');
  const input={language:'Solidity',sources:{'Vault.sol':{content:source.SourceCode}},settings:{optimizer:{enabled:source.OptimizationUsed==='true',runs:Number(source.OptimizationRuns??200)},outputSelection:{'*':{'*':['evm.deployedBytecode']}}}};
  const key=JSON.stringify(input);
  if(compiledCache.has(key))return compiledCache.get(key);
  const output=JSON.parse(compile(key,0,0));
  if(output.errors?.some(e=>e.severity==='error'))throw Error(JSON.stringify(output.errors.filter(e=>e.severity==='error')));
  const compiled=output.contracts['Vault.sol'][source.ContractName].evm.deployedBytecode;
  compiledCache.set(key,compiled); return compiled;
  }
  for(const row of ECOSYSTEM_MINER_CONTRACTS.filter(r=>process.argv.includes('--special') ? ['t-share','treasury'].includes(r.id) : !['t-share','treasury'].includes(r.id))) {
    const code=await rpc.getCode(row.address,block.number);
    if(row.id==='pls') {
      if(keccak256(code)!==VERIFIED_FARM_WRITES[0].runtimeCodeHash)throw Error('PLS runtime changed');
    } else {
      const compiled=await getCompiled(row.address);
      const mask=hex=>{for(const refs of Object.values(compiled.immutableReferences))for(const {start,length} of refs)hex=hex.slice(0,start*2)+'0'.repeat(length*2)+hex.slice((start+length)*2);return withoutMetadata(hex);};
      if(mask(code.slice(2))!==mask(compiled.object))throw Error('Runtime mismatch: '+row.id);
    }
    const c=new Contract(row.address,['function stakeToken() view returns(address)','function hexC() view returns(address)','function treasury() view returns(address)','function poolID() view returns(uint256)','function masterchef() view returns(address)','function defaultDirectPayout() view returns(uint256)'],rpc);
    const [token,pool,master,payout]=await Promise.all([['pls','treasury'].includes(row.id)?null:row.id==='t-share'?c.hexC({blockTag:block.number}):c.stakeToken({blockTag:block.number}),c.poolID({blockTag:block.number}),c.masterchef({blockTag:block.number}),row.id==='treasury'?10000n:c.defaultDirectPayout({blockTag:block.number})]);
    if(master.toLowerCase()!==masterchef.toLowerCase()||(await chef.poolInfo(pool,{blockTag:block.number}))[2].toLowerCase()!==row.address.toLowerCase()||payout>10000n)throw Error('Invalid wiring: '+row.id);
    const decimals=row.id==='t-share'?12:token?Number(await new Contract(token,['function decimals() view returns(uint8)'],rpc).decimals({blockTag:block.number})):18;
    const treasury=['t-share','treasury'].includes(row.id)?await c.treasury({blockTag:block.number}):undefined;
    console.log(JSON.stringify({id:row.id,address:row.address,tokenAddress:token,decimals,poolId:String(pool),runtimeCodeHash:keccak256(code),treasury,block:block.number,executableMatches:true}));
  }
  if((await rpc.getBlock(block.number)).hash!==block.hash)throw Error('Reorg');
} finally {rpc.destroy();}
