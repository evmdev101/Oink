export const GOVERNANCE_FAMILIES = ["Pool allocation", "Voting cost", "Enforcement delay", "Rollover bonus", "Harvest call fee", "Reward-event threshold", "New pool", "Vault setting", "Governor tax", "Governor transfer or burn", "Reward boost"] as const;
export type GovernanceReadScope = "base" | "treasury" | "upgrades" | "miner-voting" | "all" | `ordinary:${string}`;
export type GovernanceCoverage = { ordinary: string[]; treasury: boolean; upgrades: boolean };

export function governanceReadPlan(scope: GovernanceReadScope): GovernanceCoverage {
  const family = scope.startsWith("ordinary:") ? scope.slice(9) : null;
  if (family !== null && !GOVERNANCE_FAMILIES.some(value => value === family)) throw new Error("Unknown proposal family.");
  return {
    ordinary: scope === "all" ? [...GOVERNANCE_FAMILIES] : family ? [family] : [],
    treasury: scope === "all" || scope === "treasury" || scope === "miner-voting",
    upgrades: scope === "all" || scope === "upgrades" || scope === "miner-voting",
  };
}

export function hasGovernanceCoverage(coverage: GovernanceCoverage, scope: GovernanceReadScope) {
  const requested = governanceReadPlan(scope);
  return requested.ordinary.every(family => coverage.ordinary.includes(family))
    && (!requested.treasury || coverage.treasury) && (!requested.upgrades || coverage.upgrades);
}

/** Omitted registries stay explicitly incomplete, even when their arrays are empty. */
export async function readGovernanceSections<H, T, U>(scope: GovernanceReadScope, readers: {
  ordinary: (family: string) => Promise<H[]>;
  treasury: () => Promise<T[]>;
  upgrades: () => Promise<U[]>;
}) {
  const coverage = governanceReadPlan(scope);
  const [families, treasury, upgrades] = await Promise.all([
    Promise.all(coverage.ordinary.map(family => readers.ordinary(family))),
    coverage.treasury ? readers.treasury() : Promise.resolve([] as T[]),
    coverage.upgrades ? readers.upgrades() : Promise.resolve([] as U[]),
  ]);
  return { history: families.flat(), treasury, upgrades, coverage };
}
