import { useEffect } from "react";
import { useWallet } from "./WalletProvider";
import { getPublicProvider } from "../lib/chain";

/** Keeps confirmed requests from blocking future actions, without a status panel. */
export function TransactionMonitor() {
  const { account } = useWallet();
  useEffect(() => {
    if (!account) return;
    let active = true, running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      if (!active || running) return;
      clearTimeout(timer); running = true;
      try {
          // Receipt verification is unnecessary on a disconnected first visit.
          const { checkSavedReceipts } = await import("../lib/transactionMonitor");
          if (!active) return;
          const changed = await checkSavedReceipts(account, await getPublicProvider(), () => active);
          if (!active) return;
          if (changed.protocol) window.dispatchEvent(new Event("oink-protocol-confirmed"));
          if (changed.farms) window.dispatchEvent(new Event("oink-farm-journal"));
          if (changed.positions || changed.protocol || changed.farms) window.dispatchEvent(new Event("oink-positions-changed"));
      } catch { /* Action-specific errors remain available when attempting an action. */ }
      finally { running = false; if (active) timer = setTimeout(() => void check(), 15000); }
    };
    const events = ["storage", "oink-position-journal", "oink-protocol-journal", "oink-farm-journal"];
    events.forEach(event => window.addEventListener(event, check));
    void check();
    return () => { active = false; clearTimeout(timer); events.forEach(event => window.removeEventListener(event, check)); };
  }, [account]);
  return null;
}
