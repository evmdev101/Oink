import { ECOSYSTEM_MINER_CONTRACTS, TIME_MINER_CONTRACTS } from "../config/contracts";
import { NFT_PROJECTS } from "../config/nftProjects";

export type RewardAllocationRow = { id: string; address: string; label: string; points: string; percent: number; color: string };
const colors = ["#7b6cff", "#17a7c7", "#d74fe6", "#ff3d7f", "#ff9f32", "#0fb15f"];

export function rewardAllocation(pools: readonly { address: string; points: bigint }[], total: bigint) {
  if (total < 0n || pools.some(row => row.points < 0n) || pools.reduce((sum, row) => sum + row.points, 0n) !== total) {
    throw Error("Reward allocation total does not match the registry.");
  }
  const seen = new Set<string>();
  const percent = (points: bigint) => total > 0n ? Number(points * 100_000_000n / total) / 1_000_000 : 0;
  const rows: RewardAllocationRow[] = pools.map((pool, index) => {
    const key = pool.address.toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(key) || seen.has(key)) throw Error("Reward registry has an invalid or duplicate pool.");
    seen.add(key);
    const miner = TIME_MINER_CONTRACTS.find(row => row.address.toLowerCase() === key);
    const farm = ECOSYSTEM_MINER_CONTRACTS.find(row => row.address.toLowerCase() === key);
    const nft = NFT_PROJECTS.find(project => project.contracts.some(row => row.address.toLowerCase() === key));
    const label = miner ? `${miner.label} OINK miners` : farm ? farm.id === "treasury" ? "Treasury miner" : `${farm.label} miners`
      : nft ? `${nft.name} · pool #${index}` : `Registered pool #${index}`;
    return { id: String(index), address: pool.address, label, points: String(pool.points), percent: percent(pool.points), color: colors[index % colors.length] };
  });
  const minerAddresses = new Set(TIME_MINER_CONTRACTS.map(row => row.address.toLowerCase()));
  const minerPoints = pools.reduce((sum, row) => sum + (minerAddresses.has(row.address.toLowerCase()) ? row.points : 0n), 0n);
  const active = [
    ...(minerPoints > 0n ? [{ id: "oink-miners", address: "", label: "OINK miners", points: String(minerPoints), percent: percent(minerPoints), color: colors[0] }] : []),
    ...rows.filter(row => !minerAddresses.has(row.address.toLowerCase()) && row.points !== "0"),
  ];
  return { active, rows, inactive: rows.filter(row => row.points === "0"), total: String(total) };
}
