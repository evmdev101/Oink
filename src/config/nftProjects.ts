export const NFT_PROJECTS = [{
  id: "oink-degen", name: "OINK + DEGEN NFT Miners",
  description: "NFT mining units with OINK and DEGEN reward streams. Manage your miners, harvesting and settings in the dedicated dashboard.",
  dashboard: "https://evmdev101.github.io/degenNFT/#/nft",
  rewards: ["OINK", "DEGEN"],
  contracts: [
    { address: "0x7B2DcC0D0180D6863e4D6Fa14903459638c5b45B", label: "Current vault" },
    { address: "0x2EcB9c5460468e916FB8847CF5E903afc9aFE646", label: "Earlier vault" },
    { address: "0x4d1CF153b982466c8db3D41DBfAb15aBE12a9dFf", label: "Earlier vault" },
    { address: "0x2e3f97dbff7EE9a82c60F9088C92833789589A23", label: "Earlier vault" },
  ],
}] as const;
// Reviewed presentation metadata only. Never used to authorize transactions.
export const isNftDashboardPool = (address: string) => NFT_PROJECTS.some(project => project.contracts.some(contract => contract.address.toLowerCase() === address.toLowerCase()));
export type NftPool = { address: string; poolId: string; allocPoint: string | null };
export function nftRewardStatus(addresses: readonly string[], pools: NftPool[], fresh: boolean): "active" | "none" | "unknown" {
  if (!fresh) return "unknown";
  const rows = addresses.map(address => pools.find(pool => pool.address.toLowerCase() === address.toLowerCase()));
  if (rows.some(row => row?.allocPoint && /^\d+$/.test(row.allocPoint) && BigInt(row.allocPoint) > 0n)) return "active";
  return rows.every(row => row?.allocPoint === "0") ? "none" : "unknown";
}
