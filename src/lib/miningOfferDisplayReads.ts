import { getAddress } from "ethers";
import { getPublicProvider } from "./chain";
import { readReferral, readSale, type SaleInputMode } from "./miningOffers";
import { sharedDisplayReads } from "./sharedReadCache.ts";

const accountKey = (account?: string | null) => account ? getAddress(account).toLowerCase() : "public";
export const saleDisplayKey = (asset: string, amount: string, duration: string, account?: string | null, inputMode:SaleInputMode='pay') =>
  "369:sale-display:" + JSON.stringify([accountKey(account), asset, amount, duration, inputMode]);
export function peekSaleDisplay(asset: string, amount: string, duration: string, account?: string | null, inputMode:SaleInputMode='pay') {
  return sharedDisplayReads.peek<Awaited<ReturnType<typeof readSale>>>(saleDisplayKey(asset, amount, duration, account, inputMode));
}
export function readSaleDisplay(asset: string, amount: string, duration: string, account?: string | null, signal?: AbortSignal, inputMode:SaleInputMode='pay') {
  return sharedDisplayReads.read(saleDisplayKey(asset, amount, duration, account, inputMode), async child => {
    child.throwIfAborted();
    return readSale(await getPublicProvider(), asset, amount, duration, account, inputMode);
  }, { signal, cacheable: value => !value.quoteError });
}
const referralKey = (account: string) => "369:referral-display:" + accountKey(account);
export function peekReferralDisplay(account: string) {
  return sharedDisplayReads.peek<Awaited<ReturnType<typeof readReferral>>>(referralKey(account));
}
export function readReferralDisplay(account: string, signal?: AbortSignal) {
  return sharedDisplayReads.read(referralKey(account), async child => {
    child.throwIfAborted();
    return readReferral(await getPublicProvider(), account);
  }, { signal });
}
