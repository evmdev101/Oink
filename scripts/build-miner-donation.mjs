// Local compilation only. No provider, wallet or transaction broadcast exists.
import fs from 'node:fs';
import Module from 'node:module';
import {keccak256,toUtf8Bytes} from 'ethers';
const compilerUrl='https://binaries.soliditylang.org/bin/soljson-v0.8.20+commit.a1b79de6.js';
const cache='evidence/local-tools/soljson-v0.8.20.js';
let compilerText;
if(fs.existsSync(cache))compilerText=fs.readFileSync(cache,'utf8');
else{const response=await fetch(compilerUrl);if(!response.ok)throw Error('Compiler download failed');compilerText=await response.text();fs.mkdirSync('evidence/local-tools',{recursive:true});fs.writeFileSync(cache,compilerText);}
const module=new Module(import.meta.filename);module._compile(compilerText,import.meta.filename);
const compile=module.exports.cwrap('solidity_compile','string',['string','number','number']);
const source=fs.readFileSync('evidence/miner-donation/IssueStake.sol','utf8');
const input={language:'Solidity',sources:{'IssueStake.sol':{content:source}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'paris',metadata:{bytecodeHash:'none'},outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode','storageLayout'],'':['ast']}}}};
const output=JSON.parse(compile(JSON.stringify(input),0,0));
if(output.errors?.some(e=>e.severity==='error'))throw Error(JSON.stringify(output.errors));
const compiled=output.contracts['IssueStake.sol'].IssueStake,names={};
function visit(n){if(n&&typeof n==='object'){if(n.nodeType==='VariableDeclaration')names[n.id]=n.name;for(const v of Object.values(n))if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}}
visit(output.sources['IssueStake.sol'].ast);
const immutableReferences=Object.fromEntries(Object.entries(compiled.evm.deployedBytecode.immutableReferences).map(([id,refs])=>[names[id],refs]));
const artifact={compiler:'0.8.20+commit.a1b79de6',compilerUrl,evmVersion:'paris',optimizerRuns:200,sourceHash:keccak256(toUtf8Bytes(source)),creationCode:'0x'+compiled.evm.bytecode.object,runtimeTemplate:'0x'+compiled.evm.deployedBytecode.object,immutableReferences};
fs.writeFileSync('src/config/minerDonationBuild.json',JSON.stringify(artifact,null,2)+'\n');
fs.mkdirSync('public/contracts',{recursive:true});fs.writeFileSync('public/contracts/IssueStake.sol',source);
fs.writeFileSync('evidence/miner-donation/build-input.json',JSON.stringify(input,null,2)+'\n');
console.log(JSON.stringify({compiler:artifact.compiler,sourceHash:artifact.sourceHash,creationBytes:compiled.evm.bytecode.object.length/2,immutableReferences}));
