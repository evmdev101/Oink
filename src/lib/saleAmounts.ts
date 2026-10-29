const UNIT = 10n ** 18n;
const ceilDiv = (value: bigint, divisor: bigint) => (value + divisor - 1n) / divisor;

// Invert both integer divisions used by the sale, rounding payment upward.
export function saleAmountMath(price: bigint, paymentPrice: bigint | null, decimals: number) {
  if (price <= 0n || (paymentPrice !== null && paymentPrice <= 0n) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw Error("Sale price unavailable.");
  const scale = 10n ** BigInt(36 - decimals);
  const output = (payment: bigint) => {
    const pls = paymentPrice === null ? payment : payment * scale / paymentPrice;
    return pls * price / UNIT;
  };
  const payment = (desired: bigint) => {
    const pls = ceilDiv(desired * UNIT, price);
    return paymentPrice === null ? pls : ceilDiv(pls * paymentPrice, scale);
  };
  const maximum = (balance: bigint, inventory: bigint) => {
    const inventoryLimit = payment(inventory + 1n) - 1n;
    return output(balance < inventoryLimit ? balance : inventoryLimit);
  };
  // Largest output the sale can fund, independent of any wallet balance.
  // Payment tokens such as HEX have discrete units, so the raw inventory may
  // require a rounded-up payment whose output would exceed that inventory.
  const inventoryMaximum = (inventory: bigint) => output(payment(inventory + 1n) - 1n);
  return { output, payment, maximum, inventoryMaximum };
}

// Keep an estimated two-million-gas buffer when spending native PLS.
export function saleSpendableBalance(balance: bigint, gasPrice: bigint | null) {
  if(balance < 0n || (gasPrice !== null && gasPrice <= 0n)) throw Error('Wallet balance or fee estimate unavailable.');
  const reserve=gasPrice === null ? 0n : gasPrice * 2_000_000n;
  return { reserve, spendable: balance > reserve ? balance-reserve : 0n };
}
