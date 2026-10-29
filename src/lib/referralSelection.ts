import { getAddress,ZeroAddress } from 'ethers';
import { decodeReferralCode } from './referralCodes';
export const REFERRAL_SELECTION_KEY='oink:referral-selection:v1:369';
export const REFERRAL_SELECTION_EVENT='oink-referral-selection';
type ReferralStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function readSelectedReferral(storage:Pick<Storage,'getItem'>=localStorage):string|null{
  const value=storage.getItem(REFERRAL_SELECTION_KEY);if(value===null)return null;
  try{const address=getAddress(value);if(address===ZeroAddress)throw Error();return address;}catch{throw Error('The saved referral is invalid. Clear it before reviewing a new farm deposit.');}
}
export function saveSelectedReferral(addressInput:string|null,storage:ReferralStorage=localStorage){
  const address=addressInput===null?null:getAddress(addressInput);if(address===ZeroAddress)throw Error('A referral must use a nonzero address.');
  if(address===null)storage.removeItem(REFERRAL_SELECTION_KEY);else storage.setItem(REFERRAL_SELECTION_KEY,address);
  if(storage.getItem(REFERRAL_SELECTION_KEY)!==address)throw Error('Referral selection could not be saved. Check site storage before depositing.');
  if(typeof window!=='undefined')window.dispatchEvent(new Event(REFERRAL_SELECTION_EVENT));
}
export function captureReferralLink(href:string,storage:ReferralStorage=localStorage){
  const url=new URL(href),values=url.searchParams.getAll('r');if(values.length===0)return{captured:false,cleanUrl:href};
  if(values.length!==1)throw Error('This link contains more than one referral. No referral was selected.');
  const address=decodeReferralCode(values[0]);saveSelectedReferral(address,storage);url.searchParams.delete('r');
  return{captured:true,cleanUrl:url.href,address};
}
export function effectiveReferral(accountInput:string,existingInput:string,requestedInput=ZeroAddress){
  const account=getAddress(accountInput),existing=getAddress(existingInput),requested=getAddress(requestedInput);
  const selected=requested===account?ZeroAddress:requested;
  return{requested:selected,existing,actual:existing!==ZeroAddress?existing:selected,calldata:existing!==ZeroAddress?ZeroAddress:selected};
}
