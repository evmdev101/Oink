// Public contract inspection only. No signer and no transaction submission.
import { registerHooks } from 'node:module';
import { Contract, JsonRpcProvider, keccak256 } from 'ethers';
registerHooks({resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch(error) { if(specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier+'.ts',context); throw error; }
}});
const { ECOSYSTEM_MINER_CONTRACTS } = await import('../src/config/contracts.ts');
const rpc = new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:6});
try {
  if(BigInt(await rpc.send('eth_chainId',[]))!==369n) throw Error('Wrong chain');
  const block=await rpc.getBlock('latest');
  for(const row of ECOSYSTEM_MINER_CONTRACTS) {
    const c=new Contract(row.address,['function stakeToken() view returns(address)','function poolID() view returns(uint256)','function masterchef() view returns(address)','function defaultDirectPayout() view returns(uint256)'],rpc);
    try {
      const [code, token, pool, masterchef, payout] = await Promise.all([rpc.getCode(row.address,block.number),row.id==='pls'?null:c.stakeToken({blockTag:block.number}).catch(()=>null),c.poolID({blockTag:block.number}),c.masterchef({blockTag:block.number}),c.defaultDirectPayout({blockTag:block.number}).catch(()=>null)]);
      const decimals=token?Number(await new Contract(token,['function decimals() view returns(uint8)'],rpc).decimals({blockTag:block.number})):null;
      console.log(JSON.stringify({...row, tokenAddress:token,decimals,poolId:pool.toString(),masterchef,payout:payout?.toString(),runtimeCodeHash:keccak256(code),block:block.number}));
    } catch(error) { console.log(JSON.stringify({id:row.id,error:error.shortMessage??error.message})); }
  }
  if((await rpc.getBlock(block.number)).hash!==block.hash)throw Error('Snapshot changed');
} finally {rpc.destroy();}
