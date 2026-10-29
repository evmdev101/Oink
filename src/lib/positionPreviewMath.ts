// Integer ordering follows the published OINK vault/miner contracts.
// These are snapshot estimates, never minimum-output guarantees.
export function farmFundingAmounts(amount: bigint, lastAction: bigint, fundingChanged: bigint, fundingRate: bigint, now: bigint) {
  if ([amount, lastAction, fundingChanged, fundingRate, now].some((v) => v < 0n) || fundingRate > 250n) throw new Error("Invalid farm funding settings.");
  const since = lastAction > fundingChanged ? lastAction : fundingChanged;
  if (since > now) throw new Error("Position timestamp is ahead of the snapshot.");
  const hours = (now - since) / 3600n;
  const uncapped = hours * amount * fundingRate / 1000000n;
  const cap = amount * 2n / 10n;
  const fundingFee = uncapped > cap ? cap : uncapped;
  return { fundingFee, principalAfterFee: amount - fundingFee };
}

export function farmExitAmounts(amount: bigint, debt: bigint, accumulator: bigint, lastAction: bigint, fundingChanged: bigint, fundingRate: bigint, payoutBps: bigint, now: bigint) {
  if ([debt, accumulator, payoutBps].some((v) => v < 0n) || payoutBps > 10000n || accumulator < debt) throw new Error("Invalid farm accounting or payout settings.");
  const funding = farmFundingAmounts(amount, lastAction, fundingChanged, fundingRate, now);
  // Rewards are calculated BEFORE payFee reduces the recorded principal.
  const grossReward = amount * (accumulator - debt) / 1000000000000n;
  const rewardReceived = grossReward * payoutBps / 10000n;
  return { ...funding, grossReward, rewardReceived, governorReward: grossReward - rewardReceived };
}

export type MinerPenaltyRules = { durationDays: number; graceDays: number; maxPenaltyBps: number; dailyNumerator: number; dailyDenominator: number };
export function minerExitAmounts(gross: bigint, deposited: bigint, mandatory: bigint, now: bigint, rules: MinerPenaltyRules) {
  if ([gross, deposited, mandatory, now].some((v) => v < 0n) || now < deposited) throw new Error("Invalid miner accounting or timestamps.");
  const duration = BigInt(rules.durationDays) * 86400n;
  const maturity = deposited + duration;
  const graceEnd = maturity + BigInt(rules.graceDays) * 86400n;
  const maximum = BigInt(rules.maxPenaltyBps);
  let penaltyBps = 0n;
  if (now < maturity) penaltyBps = maximum - ((now - deposited) / 86400n) * BigInt(rules.dailyNumerator) / BigInt(rules.dailyDenominator);
  else if (now > graceEnd) {
    // Late fees count from maturity, not from the end of grace.
    penaltyBps = ((now - maturity) / 86400n) * BigInt(rules.dailyNumerator) / BigInt(rules.dailyDenominator);
    if (penaltyBps > maximum) penaltyBps = maximum;
  }
  if (penaltyBps < 0n || penaltyBps > 10000n) throw new Error("Miner fee is outside its modeled bounds.");
  const penalty = gross * penaltyBps / 10000n;
  return { penaltyBps, penalty, received: gross - penalty, mandatoryUntil: deposited + mandatory, locked: now <= deposited + mandatory, maturity, graceEnd };
}
