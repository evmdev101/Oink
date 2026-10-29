export function positionWindow(deposited: bigint, duration: bigint, grace: bigint, mandatory: bigint, now: bigint) {
  const maturity = deposited + duration;
  const graceEnd = maturity + grace;
  const mandatoryUntil = deposited + mandatory;
  return { maturity: Number(maturity), graceEnd: Number(graceEnd), mandatoryUntil: Number(mandatoryUntil),
    status: now <= mandatoryUntil ? "Mandatory lock active" : now < maturity ? "Before maturity — early fee may apply" : now <= graceEnd ? "Within nominal exit window — execution unverified" : "Past grace period — late fee may apply" };
}

export function grossShareValue(shares: bigint, poolBalance: bigint, totalShares: bigint) {
  if (totalShares === 0n) {
    if (shares !== 0n) throw new Error("Nonzero position in a zero-share pool.");
    return 0n;
  }
  return shares * poolBalance / totalShares;
}

export function boundedPositionCount(count: bigint) {
  if (count < 0n || count > 1000n) throw new Error("More than 1,000 positions: complete discovery unavailable; no partial total is shown.");
  return Number(count);
}
