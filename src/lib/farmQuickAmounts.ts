import { farmHasTransferLocks } from "./farmSpendableBalance.ts";
import type { FarmTokenPolicy } from "./farmTokenSafety";
import { formatUnits, MaxUint256, parseUnits } from "ethers";

export const FARM_QUICK_PERCENTAGES = [25, 50, 75, 100] as const;
export type FarmQuickBalance = {
  balance: string; availableBalance?: string | null; account: string; timestamp: number;
  farmAddress: string; tokenAddress: string | null; decimals: number;
};
type Session = { account: string | null; chainId: bigint | null };
type Asset = { address: string; tokenAddress: string | null; decimals: number; tokenPolicy?: FarmTokenPolicy };

// A convenience input fill only. All transaction checks remain in the review.
export function farmQuickAmount(percent: number, snapshot: FarmQuickBalance | undefined, session: Session, spec: Asset | undefined, now = Date.now()): string | null {
  if (!FARM_QUICK_PERCENTAGES.some(value => value === percent) || !snapshot || !spec?.tokenAddress || !snapshot.tokenAddress
    || !session.account || session.chainId !== 369n || session.account.toLowerCase() !== snapshot.account.toLowerCase()
    || snapshot.farmAddress.toLowerCase() !== spec.address.toLowerCase() || snapshot.tokenAddress.toLowerCase() !== spec.tokenAddress.toLowerCase()
    || snapshot.decimals !== spec.decimals || !Number.isInteger(spec.decimals) || spec.decimals < 0 || spec.decimals > 36
    || !Number.isFinite(snapshot.timestamp) || snapshot.timestamp <= 0 || now < snapshot.timestamp * 1000 || now - snapshot.timestamp * 1000 >= 120000
    || !/^(0|[1-9]\d*)(\.\d+)?$/.test(snapshot.balance) || (snapshot.balance.split(".")[1]?.length ?? 0) > spec.decimals) return null;
  try {
    const balance = parseUnits(snapshot.balance, spec.decimals);
    if (balance <= 0n || balance > MaxUint256) return null;
    let spendable = balance;
    if (farmHasTransferLocks(spec)) {
      const available = snapshot.availableBalance;
      if (typeof available !== "string" || !/^(0|[1-9]\d*)(\.\d+)?$/.test(available) || (available.split(".")[1]?.length ?? 0) > spec.decimals) return null;
      spendable = parseUnits(available, spec.decimals);
      if (spendable < 0n || spendable > balance) return null;
    }
    const amount = spendable * BigInt(percent) / 100n;
    return amount > 0n ? formatUnits(amount, spec.decimals) : null;
  } catch { return null; }
}
