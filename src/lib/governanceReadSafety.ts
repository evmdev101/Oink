import { snapshotBatchCall } from "./snapshotMulticall.ts";
import { getAddress, type ContractRunner, type Provider } from "ethers";

// Every Contract in a snapshot uses this read-only runner, including token metadata.
// An explicit caller override cannot silently move a read to another block.
export function snapshotRunner(provider: Pick<Provider, "call"> & Partial<Pick<Provider,"getCode">> & { snapshotBatching?: boolean }, blockNumber: number, signal?: AbortSignal): ContractRunner {
  let active = 0;
  const queue: Array<() => void> = [];
  const direct: NonNullable<ContractRunner["call"]> = async (transaction) => {
    signal?.throwIfAborted();
    if (active >= 12) await new Promise<void>((resolve) => queue.push(resolve));
    else active++;
    try {
      signal?.throwIfAborted();
      return await provider.call({ ...transaction, blockTag: blockNumber });
    }
    finally {
      const next = queue.shift();
      if (next) next();
      else active--;
    }
  };
  return { provider: null, call: provider.snapshotBatching && provider.getCode
    ? snapshotBatchCall({getCode:provider.getCode.bind(provider)},direct,blockNumber,signal) : direct };
}

export function allProposalIds(count: number): number[] {
  if (!Number.isSafeInteger(count) || count < 0 || count > 5000) {
    throw new Error("Proposal count exceeds the supported scan size; coverage is incomplete.");
  }
  return Array.from({ length: count }, (_, index) => count - index - 1);
}

export function decodeSenateBallots(members: string[], returnedMembers: readonly string[], ballots: readonly (readonly bigint[])[]): string[][] {
  if (returnedMembers.length !== members.length || ballots.length !== members.length) {
    throw new Error("Senate ballot response does not match the member registry.");
  }
  return members.map((member, index) => {
    if (getAddress(returnedMembers[index]) !== getAddress(member)) {
      throw new Error("Senate ballot order does not match the member registry.");
    }
    return ballots[index].map((ballot) => ballot.toString());
  });
}

export function snapshotIsStale(blockTimestamp: number, nowMs: number): boolean {
  return nowMs - blockTimestamp * 1000 >= 120_000;
}
