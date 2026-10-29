import { useState } from "react";
import { formatEther, parseEther } from "ethers";
import type { FarmYield } from "../lib/farmYield";
import { displayFarmAmount } from "../lib/farmDisplay";

export function FarmRewardEstimate({ estimate, staked, balance, symbol }: { estimate: FarmYield | null; staked: string | null; balance: string; symbol: string }) {
  const [assetPrice, setAssetPrice] = useState("");
  const [rewardPrice, setRewardPrice] = useState("");
  if (!estimate) return <div className="farm-estimate"><p>Reward projections are unavailable until this vault’s emission model and live contract configuration are verified.</p></div>;
  const pool = parseEther(balance);
  const deposited = staked == null ? null : parseEther(staked);
  const dailyPool = parseEther(estimate.dailyPool);
  const daily = deposited == null || pool === 0n ? null : dailyPool * deposited / pool;
  const payout = BigInt(estimate.directBps);
  const price = (value: string) => /^\d{1,20}(\.\d{1,18})?$/.test(value) ? parseEther(value) : 0n;
  const principalUsd = pool * price(assetPrice);
  const annualUsd = dailyPool * 365n * price(rewardPrice);
  const apr = (value: bigint) => principalUsd > 0n && price(rewardPrice) > 0n ? (Number(value * 10000n / principalUsd) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "%" : "—";
  return <div className="farm-estimate">
    <h3>Projected rewards</h3>
    <p>Current-rate estimate · OINK · no compounding</p>
    <table><thead><tr><th>Period</th><th>Your gross</th><th>Direct wallet</th></tr></thead><tbody>{([['Day', 1n], ['Week', 7n], ['Year', 365n]] as const).map(([label, days]) => <tr key={label}><th>{label}</th><td>{daily == null ? "—" : displayFarmAmount(formatEther(daily * days))}</td><td>{daily == null ? "—" : displayFarmAmount(formatEther(daily * days * payout / 10000n))}</td></tr>)}</tbody></table>
    {staked == null && <p>Connect your wallet to calculate your position’s share.</p>}
    <p>Pool estimate: {displayFarmAmount(estimate.dailyPool)} gross OINK/day. Allocation: {estimate.allocation}%. Observed block interval: {estimate.secondsPerBlock.toFixed(2)} seconds.</p>
    <h3>APR calculator</h3>
    <div className="farm-estimate-prices"><label>{symbol} price (USD)<input inputMode="decimal" value={assetPrice} placeholder="Enter price" onChange={(event) => setAssetPrice(event.target.value)} /></label><label>OINK price (USD)<input inputMode="decimal" value={rewardPrice} placeholder="Enter price" onChange={(event) => setRewardPrice(event.target.value)} /></label></div>
    <dl><dt>Gross reward APR</dt><dd>{apr(annualUsd)}</dd><dt>Direct-wallet reward APR</dt><dd>{apr(annualUsd * payout / 10000n)}</dd></dl>
    <p>Uses your entered prices, not live quotes. APR excludes deposit fees, funding costs and gas; it is not net profit. Direct payout is {Number(payout) / 100}% of gross rewards under the current setting.</p>
    <p>Based on published reward formulas and current reads. Assumes unchanged emissions, allocation, pool balance, stake and payout settings. Future blocks, funding deductions and other deposits or withdrawals change the result. Long-term estimates are illustrative; they do not establish claim availability.</p>
  </div>;
}
