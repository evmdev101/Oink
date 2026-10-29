import {JsonRpcProvider,Interface} from 'ethers';
import fs from 'node:fs/promises';
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true});
try{const i=new Interface(['event SetAllocationContract(address indexed contractAddress,bool setting)','function owner() view returns(address)','function creditContract() view returns(address)']);const to='0xD8508461e8134e25dc630871566B1551e797E1a7';const logs=await rpc.send('eth_getLogs',[{address:to,topics:[i.getEvent('SetAllocationContract').topicHash],fromBlock:'0x0',toBlock:'latest'}]);console.log(JSON.stringify(logs));await fs.writeFile('evidence/nft-governance/approved-logs.json',JSON.stringify(logs));}finally{rpc.destroy()}
