import { TIME_MINER_CONTRACTS } from "./contracts";

// Explorer sources independently compiled with solc 0.8.20, optimizer 200.
// Executable runtimes match at block 27528508 (2026-09-12). Compiler-declared
// immutables are checked through live wiring reads; metadata is excluded from
// compilation comparison, but the complete deployed runtime is pinned below.
// Reproduce: node scripts/verify-miner-builds.mjs. This is not a security audit.
const models = [
  [30, 3, 2500, 786, 10, "0xf4eaf87667404f08c130ff341f94e10372ef296d25eea48b614027d1803d1850"],
  [91, 5, 3500, 382, 10, "0x50d577d4ee85cb50ee53f42444bbe9638d52e4056a62b21a23332939a7d845a6"],
  [181, 7, 4200, 231, 10, "0xa1255b33feaa253996e7e2cbe89bd44bf2c3528f3841edc177001d8f7f95bfa7"],
  [365, 14, 5000, 1337, 100, "0x22bd9e2d735743b479cf8641a3e037f0f59d6b72f263c1e26b692451a5dd9de2"],
  [1095, 14, 6900, 629, 100, "0xf8c50e7a076752a85b5833e243075d1b13cdd2f2aa8a249ae86194f20d67f476"],
  [1826, 21, 8200, 4269, 1000, "0xd484990684500583cb32e326cdc9dc981cdf188bd47449b907a3949e9bbd4d39"],
] as const;
export const MINER_PREVIEW_SPECS = TIME_MINER_CONTRACTS.map((miner, index) => {
  const [durationDays, graceDays, maxPenaltyBps, dailyNumerator, dailyDenominator, runtimeCodeHash] = models[index];
  return { ...miner, poolId: index, durationDays, graceDays, maxPenaltyBps, dailyNumerator, dailyDenominator, runtimeCodeHash };
});
