import { PublicRpcProvider } from "./publicRpcProvider";

export const CHAIN_ID = 369n;

const RPCS = [
  "https://rpc.pulsechain.com",
  "https://pulsechain.publicnode.com",
  "https://rpc-pulsechain.g4mm4.io",
];

let cachedProvider: PublicRpcProvider | null = null;

export async function getPublicProvider() {
  if (!cachedProvider || cachedProvider.destroyed) cachedProvider = new PublicRpcProvider(RPCS, CHAIN_ID);
  return cachedProvider;
}

export function shortAddress(address?: string | null) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
}
