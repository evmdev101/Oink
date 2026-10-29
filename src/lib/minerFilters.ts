import { parseEther } from "ethers";

export type MinerFilterRow = {
  index: number;
  deposited: number;
  maturity: number;
  graceEnd: number;
  mandatoryUntil: number;
  gross: string;
  pool: { id: string; label: string; address: string };
};
export const MINER_FILTERS = [
  { value: "all", label: "All statuses", description: "All successfully read miners" },
  { value: "mature", label: "Mature · in grace", description: "Maturity reached and grace period not yet ended; mandatory service may still apply" },
  { value: "grace-soon", label: "Grace ending in 48h", description: "Mature miners whose grace period ends within the next 48 hours; mandatory service may still apply" },
  { value: "overdue", label: "Overdue · grace ended", description: "Past the end of the grace period" },
  { value: "soon", label: "Maturing in 7 days", description: "Maturity is within the next 7 days" },
  { value: "locked", label: "Mandatory lock", description: "Mandatory service has not ended, regardless of maturity" },
  { value: "active", label: "Not yet mature", description: "Maturity has not yet been reached" },
] as const;
export type MinerStatusFilter = typeof MINER_FILTERS[number]["value"];
export const MINER_SORTS = [
  { value: "progress", label: "Lock progress" },
  { value: "maturity", label: "Maturity · earliest" },
  { value: "grace", label: "Grace end · earliest" },
  { value: "balance", label: "Balance · highest" },
] as const;
export type MinerSort = typeof MINER_SORTS[number]["value"];

export const minerProgress = (start: number, end: number, now: number) =>
  end <= start ? now > end ? 100 : 0 : Math.max(0, Math.min(100, (now - start) * 100 / (end - start)));

export function minerPenaltyDisplay(row: { maturity: number; penalty: number | null }, snapshotTime: number) {
  if (row.penalty == null) return { label: "Check on exit", rollover: false };
  // Rollover requires strictly past maturity, including miners past grace.
  // This is a renewal status; the separate withdrawal quote retains late fees.
  if (snapshotTime > row.maturity) return { label: "Roll-Over", rollover: true };
  return { label: row.penalty.toFixed(2) + "%", rollover: false };
}

export function matchesMinerStatus(row: MinerFilterRow, status: MinerStatusFilter, time: number) {
  switch (status) {
    case "all": return true;
    case "mature": return time >= row.maturity && time <= row.graceEnd;
    case "grace-soon": return time >= row.maturity && time <= row.graceEnd && row.graceEnd <= time + 48 * 3600;
    case "overdue": return time > row.graceEnd;
    case "soon": return row.maturity > time && row.maturity <= time + 7 * 86400;
    case "locked": return time <= row.mandatoryUntil;
    case "active": return time < row.maturity;
  }
}

export function minerDeadline(row: MinerFilterRow, snapshotTime: number, now: number) {
  if (now - snapshotTime >= 120 || now < snapshotTime) return "Waiting for fresh dates";
  const target = snapshotTime < row.maturity ? row.maturity : row.graceEnd;
  if (snapshotTime > row.graceEnd) return `Grace ended ${duration(now - row.graceEnd)} ago`;
  if (now >= target) return "Updating deadline status…";
  return `${snapshotTime < row.maturity ? "Matures" : "Grace ends"} in ${duration(target - now)}`;
}

function duration(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function selectMiners<T extends MinerFilterRow>(rows: readonly T[], options: {
  query: string; status: MinerStatusFilter; sort: MinerSort; time: number;
  duration?: string;
  balance?: (row: T) => string;
}): T[] {
  const terms = options.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const selected = rows.filter(row => {
    const text = `${row.pool.label} ${row.pool.id} ${row.pool.address}`.toLowerCase();
    return (!options.duration || options.duration === "all" || row.pool.id === options.duration) && matchesMinerStatus(row, options.status, options.time) && terms.every(term =>
      /^#\d+$/.test(term) ? row.index === Number(term.slice(1)) : text.includes(term) || String(row.index) === term);
  });
  const balances = options.sort === "balance" ? new Map(selected.map(row => [row, parseEther(options.balance?.(row) ?? row.gross)])) : null;
  return selected.sort((a, b) => {
    let order = 0;
    if (options.sort === "maturity") order = a.maturity - b.maturity;
    else if (options.sort === "grace") order = a.graceEnd - b.graceEnd;
    else if (balances) order = balances.get(a)! > balances.get(b)! ? -1 : balances.get(a)! < balances.get(b)! ? 1 : 0;
    else order = minerProgress(b.deposited, b.maturity, options.time) - minerProgress(a.deposited, a.maturity, options.time);
    return order || a.maturity - b.maturity || a.pool.id.localeCompare(b.pool.id) || a.index - b.index;
  });
}
