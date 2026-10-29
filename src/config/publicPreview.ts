// Source-controlled pause; changing a URL or browser preference cannot enable it.
export const GOVERNANCE_ACTIONS_DISABLED = true;
export const GOVERNANCE_ACTIONS_NOTICE = "Governance actions are temporarily disabled while we finish and test this section. Farm and miner transactions remain available.";
export const MAINTENANCE_ACTIONS_DISABLED = true;
export const MAINTENANCE_ACTIONS_NOTICE = "Protocol maintenance actions are temporarily disabled while we finish testing. Live statistics, farm transactions and miner transactions remain available.";

type Action = { module: string; action: string };
const governanceModules = new Set([
  "ordinary", "advanced-governance", "participation", "nft-allocation", "reward-maintenance",
]);
const governanceMaintenance = new Set([
  "start-event", "end-event", "harvest-senate", "publish-senate-credit",
]);

export function isGovernanceActionDisabled(request: Action): boolean {
  return (MAINTENANCE_ACTIONS_DISABLED && request.module === "community-maintenance") || (GOVERNANCE_ACTIONS_DISABLED && (
    governanceModules.has(request.module) ||
    (request.module === "miner-donation" && request.action === "propose") ||
    (request.module === "community-maintenance" && governanceMaintenance.has(request.action))
  ));
}

export function actionPauseNotice(request: Action): string {
  return MAINTENANCE_ACTIONS_DISABLED && request.module === "community-maintenance" ? MAINTENANCE_ACTIONS_NOTICE : GOVERNANCE_ACTIONS_NOTICE;
}

export function assertGovernanceActionEnabled(request: Action): void {
  if (isGovernanceActionDisabled(request)) {
    throw Object.assign(new Error(actionPauseNotice(request)), { code: 4100, walletRequestStarted: false });
  }
}
