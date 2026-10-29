import {getAddress,ZeroAddress} from 'ethers';
export function encodeReferralCode(account:string){
  const wallet=getAddress(account);if(wallet===ZeroAddress)throw Error("Choose a nonzero wallet.");
  const alphabet="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";let value=BigInt(wallet),encoded="";
  // Original OINK uses numeric base58 (no checksum or leading-byte padding).
  while(value>0n){encoded=alphabet[Number(value%58n)]+encoded;value/=58n;}
  return encoded;
}
export function decodeReferralCode(code:string){
  const alphabet="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  if(!code||code.length>28||![...code].every(c=>alphabet.includes(c)))throw Error('Invalid referral link.');
  let value=0n;for(const c of code)value=value*58n+BigInt(alphabet.indexOf(c));
  if(value===0n||value>=1n<<160n)throw Error('Invalid referral address.');
  const address=getAddress('0x'+value.toString(16).padStart(40,'0'));
  if(encodeReferralCode(address)!==code)throw Error('Invalid referral link encoding.');
  return address;
}
export function referralLink(account:string,baseUrl=typeof window==='undefined'?'http://localhost/':window.location.href){
  const url=new URL(baseUrl);if(!['http:','https:'].includes(url.protocol))throw Error('Invalid site URL.');
  url.search='';url.searchParams.set('r',encodeReferralCode(account));url.hash='';return url.href;
}
