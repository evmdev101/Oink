import { Contract, formatEther } from "ethers";
import { useEffect, useState } from "react";
import { OINK_TOKEN, TREASURY_WALLET } from "../config/links";
import { getPublicProvider } from "../lib/chain";

const WPLS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27";
const DAI = "0xefD766cCb38EaF1dfd701853BFCe31359239F305";
const PULSEX_FACTORIES = [
  "0x29eA7545DEf87022BAdc76323F373EA1e707C523", // V1
  "0x1715a3E4A142d8b698131108995174F37aEBA10D", // V2
];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const FACTORY_ABI = [
  "function getPair(address, address) view returns (address)",
];
const PAIR_ABI = [
  "function getReserves() view returns (uint112, uint112, uint32)",
  "function token0() view returns (address)",
];
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

/** Mid price of `base` in `quote` from the deepest PulseX pair, or null. */
async function pairPrice(base: string, quote: string) {
  const provider = await getPublicProvider();
  let best: { price: number; depth: number } | null = null;
  for (const factoryAddress of PULSEX_FACTORIES) {
    try {
      const factory = new Contract(factoryAddress, FACTORY_ABI, provider);
      const pairAddress: string = await factory.getPair(base, quote);
      if (pairAddress === ZERO_ADDRESS) continue;
      const pair = new Contract(pairAddress, PAIR_ABI, provider);
      const [[reserve0, reserve1], token0] = await Promise.all([
        pair.getReserves() as Promise<[bigint, bigint, bigint]>,
        pair.token0() as Promise<string>,
      ]);
      const baseIsToken0 = token0.toLowerCase() === base.toLowerCase();
      const baseReserve = Number(
        formatEther(baseIsToken0 ? reserve0 : reserve1),
      );
      const quoteReserve = Number(
        formatEther(baseIsToken0 ? reserve1 : reserve0),
      );
      if (baseReserve <= 0 || quoteReserve <= 0) continue;
      const candidate = { price: quoteReserve / baseReserve, depth: baseReserve };
      if (!best || candidate.depth > best.depth) best = candidate;
    } catch {
      /* try next factory */
    }
  }
  return best?.price ?? null;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUsdPrice(value: number) {
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  const decimals = Math.min(18, -Math.floor(Math.log10(value)) + 3);
  return `$${value.toFixed(decimals)}`;
}

type Stats = {
  priceUsd: string;
  treasuryOink: string;
  treasuryPls: string;
  totalSupply: string;
};

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const provider = await getPublicProvider();
        const oink = new Contract(OINK_TOKEN, ERC20_ABI, provider);
        const [oinkInPls, plsInDai, treasuryOink, treasuryPls, totalSupply] =
          await Promise.all([
            pairPrice(OINK_TOKEN, WPLS),
            pairPrice(WPLS, DAI),
            oink.balanceOf(TREASURY_WALLET) as Promise<bigint>,
            provider.getBalance(TREASURY_WALLET),
            oink.totalSupply() as Promise<bigint>,
          ]);
        if (cancelled) return;
        const priceUsd =
          oinkInPls !== null && plsInDai !== null
            ? formatUsdPrice(oinkInPls * plsInDai)
            : "—";
        setStats({
          priceUsd,
          treasuryOink: `${formatCompact(Number(formatEther(treasuryOink)))} OINK`,
          treasuryPls: `${formatCompact(Number(formatEther(treasuryPls)))} PLS`,
          totalSupply: `${formatCompact(Number(formatEther(totalSupply)))} OINK`,
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // RPC unreachable — hide the strip rather than showing a row of dashes.
  if (failed) return null;

  const value = (text?: string) =>
    stats ? (text ?? "—") : <span className="oink-stat-loading">…</span>;

  return (
    <section className="oink-section" style={{ marginBottom: 52 }}>
      <div className="oink-section-label">Live From the Trough 🐽 (PulseChain)</div>
      <div className="oink-stats">
        <div className="oink-stat">
          <div className="oink-stat-label">OINK Price</div>
          <div className="oink-stat-val">{value(stats?.priceUsd)}</div>
        </div>
        <div className="oink-stat">
          <div className="oink-stat-label">Treasury OINK</div>
          <div className="oink-stat-val">{value(stats?.treasuryOink)}</div>
        </div>
        <div className="oink-stat">
          <div className="oink-stat-label">Treasury PLS</div>
          <div className="oink-stat-val">{value(stats?.treasuryPls)}</div>
        </div>
        <div className="oink-stat">
          <div className="oink-stat-label">Total Supply</div>
          <div className="oink-stat-val">{value(stats?.totalSupply)}</div>
        </div>
      </div>
    </section>
  );
}
