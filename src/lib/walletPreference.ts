import { getAddress } from "ethers";
import type { WalletChoice } from "./walletDiscovery";

export type WalletSelection = { key: string; identity: string; account: string };

export function savedWallet(value: string | null): WalletSelection | null {
  if (!value) return null;
  try {
    const saved = JSON.parse(value);
    if (!saved || typeof saved.key !== "string" || typeof saved.identity !== "string" || !saved.identity.startsWith("eip6963:") || saved.identity.length <= 8 || typeof saved.account !== "string") return null;
    return { key: saved.key, identity: saved.identity, account: getAddress(saved.account) };
  } catch { return null; }
}

export function rememberedChoice(rows: WalletChoice[], saved: WalletSelection | null) {
  if (!saved) return null;
  // Never replace a missing extension with window.ethereum or a same-brand provider.
  const matches = rows.filter(row => row.provider && row.key === saved.key && row.identity === saved.identity);
  return matches.length === 1 ? matches[0] : null;
}
