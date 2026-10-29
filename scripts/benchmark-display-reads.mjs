// Read-only comparison at one pinned PulseChain block. No wallet or transactions.
import assert from 'node:assert/strict';
import { Interface } from 'ethers';
import { PublicRpcProvider } from '../src/lib/publicRpcProvider.ts';
import { snapshotRunner } from '../src/lib/governanceReadSafety.ts';

const rpc = new PublicRpcProvider(['https://rpc.pulsechain.com','https://pulsechain.publicnode.com'],369n);
try {
  const block = await rpc.getBlock('latest');
  const address = '0x7917e04Eb4463CF80Cc00040BA0f1fF125926eF3';
  const abi = new Interface(['function treasuryProposal(uint256) view returns(bool,uint256,uint256,uint256,uint256,address,address,uint256,uint256)']);
  const requests = Array.from({length:100},(_,i)=>({to:address,data:abi.encodeFunctionData('treasuryProposal',[i])}));
  const run = async batching => {
    let calls=0;
    const runner=snapshotRunner({snapshotBatching:batching,getCode:rpc.getCode.bind(rpc),call:tx=>{calls++;return rpc.call(tx);}},block.number,AbortSignal.timeout(60000));
    const start=performance.now();
    const values=await Promise.all(requests.map(tx=>runner.call(tx)));
    return {values,calls,ms:Math.round(performance.now()-start)};
  };
  const batched=await run(true);
  const direct=await run(false);
  assert.deepEqual(batched.values,direct.values);
  assert.equal((await rpc.getBlock(block.number)).hash,block.hash);
  console.log(JSON.stringify({block:block.number,getters:100,identical:true,direct:{calls:direct.calls,ms:direct.ms},multicall:{calls:batched.calls,ms:batched.ms}},null,2));
} finally { rpc.destroy(); }
