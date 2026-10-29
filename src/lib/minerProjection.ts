import { formatEther, parseEther } from "ethers";
import type { MinerYield } from "./minerLive";

export function projectMinerRewards(amount: string, estimate: MinerYield | null, durationDays: number, now = Date.now()) {
  if (!/^\d{1,60}(\.\d{1,18})?$/.test(amount) || parseEther(amount) <= 0n) return { error: "Enter an OINK amount below to see your projection.", rows: [] };
  if (!estimate || !Number.isFinite(estimate.timestamp) || now < estimate.timestamp * 1000 || now - estimate.timestamp * 1000 >= 120000)
    return { error: "Waiting for fresh emission data. Projections update automatically.", rows: [] };
  if (!Number.isSafeInteger(durationDays) || durationDays <= 0) return { error: "Miner duration unavailable.", rows: [] };
  const values = [estimate.poolBalance, estimate.totalShares, estimate.dailyPool];
  if (!values.every(value => /^\d{1,60}(\.\d{1,18})?$/.test(value))) return { error: "Pool data unavailable.", rows: [] };
  const [balance, total, daily] = values.map(value => parseEther(value));
  if ((total > 0n && balance === 0n) || (total === 0n && balance > 0n)) return { error: "Pool share accounting unavailable.", rows: [] };
  const principal = parseEther(amount);
  // Match deployment share rounding and include the proposed deposit in dilution.
  const shares = total === 0n ? principal : principal * total / balance;
  if (shares === 0n) return { error: "This amount is too small to create miner shares.", rows: [] };
  const periods = [["Daily", 1], ["Weekly", 7], ["Monthly", 30], ["Full term", durationDays]] as const;
  const rows = periods.map(([label, days]) => {
    const rewards = daily * shares * BigInt(days) / (total + shares);
    return { label, days, rewards: formatEther(rewards), total: formatEther(principal + rewards) };
  });
  return { error: "", rows };
}
