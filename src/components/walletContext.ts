import { createContext, useContext, type Context } from "react";
import type { WalletChoice } from "../lib/walletDiscovery";
import type { WalletState } from "../lib/walletSession";

type WalletContextValue = WalletState & {
  choices: WalletChoice[];
  connect(choice: WalletChoice): Promise<void>;
  disconnect(): void;
  switchToPulseChain(): Promise<void>;
};

// Provider and consumers must keep the same context while lazy routes and React
// Fast Refresh replace modules. Only retain its identity, never a wallet session.
const retained = import.meta.hot?.data.walletContext as Context<WalletContextValue | null> | undefined;
export const WalletContext = retained ?? createContext<WalletContextValue | null>(null);
if (import.meta.hot) import.meta.hot.data.walletContext = WalletContext;

export function useWallet() {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("useWallet must be used inside WalletProvider.");
  return wallet;
}
