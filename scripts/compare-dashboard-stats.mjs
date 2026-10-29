import { Contract, JsonRpcProvider, formatEther } from 'ethers';
const rpc = new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true});
const accounts = [
 ['Treasury wallet','0x3a4DA32dc29b146F26D8527e37FeaAe45fBebe69'],
 ['Governor','0x331146b366c0Cd2AcA542ce71E5D6fb66bf07D16'],
 ['Treasury locked miner','0x4807bdD7039a1fc236c14dc60D73a64eEa450731'],
 ['NFT wallet','0x26E6e614C46dA4c459d0dB2121A986672F603c00']
];
const abi=['function balanceOf(address) view returns(uint256)','function totalSupply() view returns(uint256)'];
try {
 const block=await rpc.getBlock('latest');
 const options={blockTag:block.number};
 const token=new Contract('0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38',abi,rpc);
 const pairAddress='0xef9ea3d72e28c7140481209190601c085027d6fe';
 const pair=new Contract(pairAddress,abi,rpc);
 const wpls=new Contract('0xa1077a294dde1b09bb078844df40758a5d0f9a27',abi,rpc);
 const inc=new Contract('0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d',abi,rpc);
 const rows=await Promise.all(accounts.map(async([label,address])=>({label,address,oink:formatEther(await token.balanceOf(address,options)),inc:formatEther(await inc.balanceOf(address,options))})));
 const [pls,oink,totalLp,ownedLp]=await Promise.all([wpls.balanceOf(pairAddress,options),token.balanceOf(pairAddress,options),pair.totalSupply(options),pair.balanceOf(accounts[0][1],options)]);
 console.log(JSON.stringify({block:block.number,timestamp:block.timestamp,accounts:rows,pair:{pls:formatEther(pls),oink:formatEther(oink),treasuryOwnershipPercent:Number(ownedLp*1000000n/totalLp)/10000,treasuryPls:formatEther(pls*ownedLp/totalLp),treasuryOink:formatEther(oink*ownedLp/totalLp)}},null,2));
} finally {rpc.destroy();}
