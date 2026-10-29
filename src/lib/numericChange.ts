export type NumericDirection = "up" | "down" | null;

function decimal(value: string) {
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(value.trim());
  if (!match || value.length > 1000) return null;
  const exponent = Number(match[4] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) return null;
  const fraction = match[3] ?? "";
  const coefficient = BigInt(match[2] + fraction) * (match[1] === "-" ? -1n : 1n);
  const scale = fraction.length - exponent;
  return scale < 0 ? { coefficient: coefficient * 10n ** BigInt(-scale), scale: 0 } : { coefficient, scale };
}

/** Compare observed quantities without losing token precision above 2^53. */
export function numericDirection(previous: string, next: string): NumericDirection {
  const left = decimal(previous), right = decimal(next);
  if (!left || !right) return null;
  const scale = Math.max(left.scale, right.scale);
  const a = left.coefficient * 10n ** BigInt(scale - left.scale);
  const b = right.coefficient * 10n ** BigInt(scale - right.scale);
  return b > a ? "up" : b < a ? "down" : null;
}
