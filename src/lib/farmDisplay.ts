// Display arithmetic stays decimal-string based; token quantities can exceed
// JavaScript's safe integer range and can have different decimal precision.
export function sumFarmAmounts(values: readonly string[]): string {
  if (!values.every((value) => /^\d+(\.\d+)?$/.test(value))) throw new Error("Invalid farm amount");
  const precision = values.reduce((max, value) => Math.max(max, (value.split(".")[1] ?? "").length), 0);
  const total = values.reduce((sum, value) => {
    const [whole, fraction = ""] = value.split(".");
    return sum + BigInt(whole + fraction.padEnd(precision, "0"));
  }, 0n).toString().padStart(precision + 1, "0");
  if (!precision) return total;
  const fraction = total.slice(-precision).replace(/0+$/, "");
  return total.slice(0, -precision) + (fraction ? "." + fraction : "");
}

export function displayFarmAmount(value: string) {
  const [whole, fraction = ""] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimals = fraction.slice(0, 3).replace(/0+$/, "");
  if (whole === "0" && !decimals && /[1-9]/.test(fraction)) return "<0.001";
  return grouped + (decimals ? "." + decimals : "");
}

type WalletRow = { data: { positions: { amount: string; pending: string }[] | null; accountError: string | null } | null; special?: { kind:string; registeredShares:string|null; pending:string|null; accountError:string|null } | null };

export function farmWalletPositions(row: WalletRow) {
  if(row.special?.kind === "treasury") return []; // Protocol rewards never belong to the connected wallet.
  if(row.special?.kind === "t-share") {
    const s=row.special;
    if(s.accountError || s.registeredShares==null || s.pending==null)return null;
    return /[1-9]/.test(s.registeredShares) ? [{amount:s.registeredShares,pending:s.pending}] : [];
  }
  return row.data && !row.data.accountError ? row.data.positions : null;
}

export function summarizeFarmWallet(rows: readonly WalletRow[]) {
  const verified = rows.map(farmWalletPositions).filter(positions => positions !== null);
  const positions = verified.flat();
  return {
    verifiedFarms: verified.length,
    partial: verified.length !== rows.length,
    positionCount: positions.length,
    // Only OINK rewards are additive across these vaults, never asset balances.
    grossPending: verified.length ? sumFarmAmounts(positions.map((position) => position.pending)) : null,
  };
}
