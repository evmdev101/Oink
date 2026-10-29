import { submitMinerDirect, type MinerDirectOptions, type MinerDirectFlowDependencies, type MinerDirectStage } from "./minerDirectFlow";

export type MinerRolloverStage = MinerDirectStage;
export type MinerRolloverFlowDependencies = MinerDirectFlowDependencies;
export function submitMinerRollover(options: MinerDirectOptions, dependencies: Partial<MinerRolloverFlowDependencies> = {}) {
  return submitMinerDirect("rollover", options, dependencies);
}
