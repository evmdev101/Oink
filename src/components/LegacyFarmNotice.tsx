import { explorerUrl } from "../config/contracts";
import { legacyFarmSupport } from "../config/legacyFarmSupport";
import { LINKS } from "../config/links";

export function LegacyFarmNotice({ farmId }: { farmId: string }) {
  const support = legacyFarmSupport(farmId);
  if (!support) return null;
  return <section className="farm-legacy-integration" aria-label={support.label + " transaction availability"}>
    <strong>Live balances · original farm actions</strong>
    <p>{support.reason}</p>
    <details><summary>Understand the recorded balance</summary><p>{support.accounting}</p><p><a href={explorerUrl(support.tokenAddress) + "#code"} target="_blank" rel="noreferrer">Token source ↗</a>{"implementationAddress" in support && <> · <a href={explorerUrl(support.implementationAddress) + "#code"} target="_blank" rel="noreferrer">Token implementation ↗</a></>}</p></details>
    <div className="farm-legacy-links"><a href={new URL("pulse-ecosystem-mining.html", LINKS.miningMudpit).href} target="_blank" rel="noreferrer">Open original deposit page ↗</a><a href={new URL("view-pulse-ecosystem-miners.html", LINKS.miningMudpit).href} target="_blank" rel="noreferrer">Open original positions page ↗</a></div>
    <small>These links open the published OINK application. It uses the same token and vault contracts; opening a link does not approve or send a transaction.</small>
  </section>;
}
