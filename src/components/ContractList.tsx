import type { ContractRecord } from "../config/contracts";
import { explorerUrl, sourceUrl } from "../config/contracts";

export function ContractList({
  contracts,
  compact = false,
}: {
  contracts: readonly ContractRecord[];
  compact?: boolean;
}) {
  return (
    <div className={`contract-list ${compact ? "contract-list-compact" : ""}`}>
      {contracts.map((contract) => (
        <article className="contract-row" key={contract.id}>
          <div className="contract-row-copy">
            <strong>{contract.label}</strong>
            {contract.note && <span>{contract.note}</span>}
          </div>
          <div className="contract-row-links">
            <a
              className="mono-link"
              href={explorerUrl(contract.address)}
              target="_blank"
              rel="noreferrer"
              aria-description={`Open ${contract.label} on the PulseChain explorer`}
            >
              {contract.address}
            </a>
            {contract.source && (
              <a
                className="text-link"
                href={sourceUrl(contract.source)}
                target="_blank"
                rel="noreferrer"
              >
                Source
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
