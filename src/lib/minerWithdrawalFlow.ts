import { submitMinerDirect, type MinerDirectOptions, type MinerDirectFlowDependencies, type MinerDirectStage } from "./minerDirectFlow";

export type MinerWithdrawalStage = MinerDirectStage;
export type MinerWithdrawalFlowDependencies = MinerDirectFlowDependencies;
export function submitMinerWithdrawal(options: MinerDirectOptions, dependencies: Partial<MinerWithdrawalFlowDependencies> = {}) {
  return submitMinerDirect("withdraw", options, dependencies);
}
