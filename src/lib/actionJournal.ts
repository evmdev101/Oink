import type { PositionRequest } from "./positionTransactions";
import type { ProtocolRequest } from "./protocolTransactions";

// Amounts and recipients do not create a new action: changing an input must
// not bypass duplicate protection. Existing positions share a pool scope:
// withdrawals can reorder position indexes, so concurrent edits would conflict.
export const positionScope = (request: PositionRequest) => request.type === "miner"
  ? `miner:${request.id}:${"index" in request.action ? "positions" : "new"}`
  : `farm:${request.id}:positions`;
export const protocolScope = (request: ProtocolRequest) => `protocol:${request.module}:${request.action}`;
export const scopedJournalKey = (base: string, scope: string) => `${base}:action:${encodeURIComponent(scope)}`;

export function journalRaws(base: string, storage: Pick<Storage, "getItem">): string[] {
  const raws = new Set<string>();
  const legacy = storage.getItem(base);
  if (legacy) raws.add(legacy);
  const enumerable = storage as Storage;
  if (typeof enumerable.key === "function") {
    for (let index = 0; index < enumerable.length; index++) {
      const key = enumerable.key(index);
      if (key?.startsWith(base + ":action:")) {
        const raw = storage.getItem(key);
        if (raw) raws.add(raw);
      }
    }
  }
  return [...raws];
}
