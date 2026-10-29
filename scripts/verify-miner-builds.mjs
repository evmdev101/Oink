// Read-only verification: compile explorer-published sources and compare runtime.
import { createRequire } from 'node:module';
import Module from 'node:module';
import { JsonRpcProvider, keccak256 } from 'ethers';
const addresses = ['0x39b3E852D6fFA1aF6694Ef87C062450de6778da8','0x9013B1067C52E897E713044dE36c56BfdA8Ec9B4','0xb180450f064E79adBFD71Bc2fB086F9CD0Af0D67','0xc0483f1b0dcf601888fFD0d3A44b7124e80DB7D1','0x15b51Ece819f3B51ce814de67bB2419660701a3c','0xf3E82f4123d4262a2baEC25b03652f3932A91739'];
const compilerUrl = 'https://binaries.soliditylang.org/bin/soljson-v0.8.20+commit.a1b79de6.js';
const compilerText = await (await fetch(compilerUrl)).text();
const module = new Module(import.meta.filename);
module.paths = createRequire(import.meta.url).resolve.paths('solc');
module._compile(compilerText, import.meta.filename);
const compile = module.exports.cwrap('solidity_compile', 'string', ['string','number','number']);
const rpc = new JsonRpcProvider('https://rpc.pulsechain.com');
const block = await rpc.getBlock('latest');
function withoutMetadata(hex) { const length = parseInt(hex.slice(-4),16); return hex.slice(0, -(length + 2) * 2); }
for (const address of addresses) {
  const source = (await (await fetch('https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address=' + address)).json()).result[0];
  if (source.CompilerVersion !== 'v0.8.20+commit.a1b79de6' || source.IsProxy !== 'false') throw Error('Unexpected compiler/proxy');
  const input = {language:'Solidity', sources:{'Miner.sol':{content:source.SourceCode}}, settings:{optimizer:{enabled:source.OptimizationUsed === 'true',runs:source.OptimizationRuns}, outputSelection:{'*':{'*':['evm.deployedBytecode']}}}};
  const output = JSON.parse(compile(JSON.stringify(input),0,0));
  const errors = output.errors?.filter(e => e.severity === 'error');
  if (errors?.length) throw Error(JSON.stringify(errors));
  const compiled = output.contracts['Miner.sol'][source.ContractName].evm.deployedBytecode;
  let actual = (await rpc.getCode(address,block.number)).slice(2), expected = compiled.object;
  // Solidity immutables contain constructor-injected addresses. Verify their
  // wiring separately in every review; mask only compiler-declared offsets here.
  for (const refs of Object.values(compiled.immutableReferences)) for (const {start,length} of refs) {
    actual = actual.slice(0,start*2) + '0'.repeat(length*2) + actual.slice((start+length)*2);
    expected = expected.slice(0,start*2) + '0'.repeat(length*2) + expected.slice((start+length)*2);
  }
  if (withoutMetadata(actual) !== withoutMetadata(expected)) throw Error('Runtime mismatch: '+address);
  console.log(JSON.stringify({address,block:block.number,blockHash:block.hash,compiler:source.CompilerVersion,runs:source.OptimizationRuns,runtimeHash:keccak256(await rpc.getCode(address,block.number)),executableRuntimeMatches:true}));
}
if ((await rpc.getBlock(block.number)).hash !== block.hash) throw Error('Reorg');
rpc.destroy();
