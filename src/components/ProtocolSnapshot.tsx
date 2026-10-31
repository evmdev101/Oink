import { Contract, formatEther, formatUnits } from "ethers";
import { useEffect, useState } from "react";
import {
  CORE_CONTRACTS,
  GOVERNANCE_CONTRACTS,
  OINK_TOKEN,
  TIME_MINER_CONTRACTS,
  TREASURY_WALLET,
} from "../config/contracts";
import { getPublicProvider } from "../lib/chain";

const TOKEN_READ_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
] as const;

type Snapshot = {
  blockNumber: number;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  treasuryOink: string;
  treasuryPls: string;
  verifiedDeployments: number;
  checkedDeployments: number;
};

function compact(value: bigint, decimals: number) {
  const parsed = Number(formatUnits(value, decimals));
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 3,
  }).format(parsed);
}

export function ProtocolSnapshot() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const provider = await getPublicProvider();
        const token = new Contract(OINK_TOKEN, TOKEN_READ_ABI, provider);
        const deployments = [
          ...CORE_CONTRACTS,
          ...TIME_MINER_CONTRACTS,
          ...GOVERNANCE_CONTRACTS,
        ];
        const [
          blockNumber,
          name,
          symbol,
          decimalsRaw,
          totalSupply,
          treasuryOink,
          treasuryPls,
          bytecodes,
        ] = await Promise.all([
          provider.getBlockNumber(),
          token.name() as Promise<string>,
          token.symbol() as Promise<string>,
          token.decimals() as Promise<bigint>,
          token.totalSupply() as Promise<bigint>,
          token.balanceOf(TREASURY_WALLET) as Promise<bigint>,
          provider.getBalance(TREASURY_WALLET),
          Promise.all(deployments.map((contract) => provider.getCode(contract.address))),
        ]);
        if (cancelled) return;
        const decimals = Number(decimalsRaw);
        setSnapshot({
          blockNumber,
          name,
          symbol,
          decimals,
          totalSupply: compact(totalSupply, decimals),
          treasuryOink: compact(treasuryOink, decimals),
          treasuryPls: new Intl.NumberFormat("en", {
            notation: "compact",
            maximumFractionDigits: 3,
          }).format(Number(formatEther(treasuryPls))),
          verifiedDeployments: bytecodes.filter((code) => code !== "0x").length,
          checkedDeployments: deployments.length,
        });
      } catch {
        if (!cancelled) {
          setError("The public PulseChain RPC did not return a complete snapshot.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = (content?: string | number) =>
    snapshot ? content : <span className="snapshot-loading">Loading</span>;

  return (
    <section className="snapshot-panel" aria-label="Read-only PulseChain snapshot">
      <div className="section-heading section-heading-inline">
        <div>
          <span className="section-kicker">Public RPC</span>
          <h2>Read-only protocol snapshot</h2>
        </div>
        <span className={`status-pill ${error ? "status-warning" : "status-safe"}`}>
          {error ? "RPC unavailable" : "No wallet required"}
        </span>
      </div>
      {error ? (
        <p className="inline-notice">{error} Contract links and the verified feature map remain available below.</p>
      ) : (
        <div className="snapshot-grid">
          <div>
            <span>Token identity</span>
            <strong>{value(snapshot ? `${snapshot.name} (${snapshot.symbol})` : undefined)}</strong>
          </div>
          <div>
            <span>Token decimals</span>
            <strong>{value(snapshot?.decimals)}</strong>
          </div>
          <div>
            <span>Total supply</span>
            <strong>{value(snapshot ? `${snapshot.totalSupply} OINK` : undefined)}</strong>
          </div>
          <div>
            <span>Treasury OINK</span>
            <strong>{value(snapshot ? `${snapshot.treasuryOink} OINK` : undefined)}</strong>
          </div>
          <div>
            <span>Treasury PLS</span>
            <strong>{value(snapshot ? `${snapshot.treasuryPls} PLS` : undefined)}</strong>
          </div>
          <div>
            <span>Contracts with bytecode</span>
            <strong>
              {value(
                snapshot
                  ? `${snapshot.verifiedDeployments} of ${snapshot.checkedDeployments}`
                  : undefined,
              )}
            </strong>
          </div>
        </div>
      )}
    </section>
  );
}
