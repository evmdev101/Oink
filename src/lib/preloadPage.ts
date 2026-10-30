import { createNavigationPreloader } from "./navigationPreloader";

const pages:Record<string,() => Promise<unknown>> = {
  "/":() => import("../pages/DashboardPage"),
  "/portfolio":() => import("../pages/PortfolioPage"),
  "/mining":() => import("../pages/MiningPage"),
  "/farms":() => import("../pages/FarmsPage"),
  "/nfts":() => import("../pages/NftsPage"),
  "/governance":() => import("../pages/GovernancePage"),
  "/how-it-works":() => import("../pages/HowItWorksPage"),
  "/protocol":() => import("../pages/ProtocolPage"),
  "/docs":() => import("../pages/ProtocolPage"),
  "/maintenance":() => import("../pages/MaintenancePage"),
};
// Navigation intent warms data as well as route code. All reads are display-only;
// the same shared cache is consumed by the destination page.
const warming = new Map<string,Promise<unknown>>();
export function preloadPage(path:string, account:string|null = null) {
  const [pathname,search=""]=path.split("?");
  void pages[pathname]?.().catch(() => {});
  const key = `${path}:${account?.toLowerCase() ?? "public"}`;
  if (warming.has(key)) return warming.get(key)!;
  const work = (async () => {
    if (pathname === "/farms") {
      const [{readEcosystemVaults},{readFarmPrices}] = await Promise.all([import("./miningAccounts"),import("./farmPrices")]);
      await Promise.allSettled([readEcosystemVaults(undefined,account ?? undefined),readFarmPrices()]);
    } else if (pathname === "/mining") {
      const tab=new URLSearchParams(search).get("tab") ?? "positions";
      // Warm the section the user is actually opening, not every miner reader.
      if (tab === "deploy") {
        const reads=await import("./minerDisplayReads");
        await Promise.allSettled([reads.readPublicMinerYields(),...(account?[reads.readMinerWalletBalance(account)]:[])]);
      } else if (tab === "contracts") {
        await (await import("./minerDisplayReads")).readTimeMinerSummary();
      } else if (tab === "sale") {
        await (await import("./miningOfferDisplayReads")).readSaleDisplay("PLS","","five-year",account,undefined,"receive");
      } else if (tab === "referral" && account) {
        await (await import("./miningOfferDisplayReads")).readReferralDisplay(account);
      } else if (tab === "positions" && account) {
        await (await import("./miningAccounts")).readMinerPositions(account);
      }
    } else if (pathname === "/portfolio") {
      const reads:Promise<unknown>[] = [];
      if (account) reads.push(import("./miningAccounts").then(module => module.readMinerPositions(account)));
      if(account) reads.push(import("./miningAccounts").then(module => module.readEcosystemVaults(undefined,account)));
      reads.push(import("./farmPrices").then(module => module.readFarmPrices()));
      await Promise.allSettled(reads);
    } else if (pathname === "/governance") {
      const [{readGovernanceSummary},{loadGovernanceSnapshot}] = await Promise.all([import("./governanceSummary"),import("./governance")]);
      await Promise.allSettled([readGovernanceSummary(),loadGovernanceSnapshot(undefined,undefined,account,"ordinary:Pool allocation")]);
    }
  })().catch(() => {}).finally(() => warming.delete(key));
  warming.set(key,work);
  return work;
}

function canSpeculate() {
  if(typeof document === "undefined" || document.visibilityState !== "visible") return false;
  const connection=(navigator as Navigator & {connection?:{saveData?:boolean;effectiveType?:string}}).connection;
  return !connection?.saveData && !["slow-2g","2g"].includes(connection?.effectiveType ?? "");
}
const navigationPreloader=createNavigationPreloader({
  loadCode:path=>pages[path.split("?")[0]]?.()??Promise.resolve(),
  loadData:(path,account)=>preloadPage(path,account),
  allowed:canSpeculate,
});
export const preloadNavigationCode=(path:string)=>navigationPreloader.warmCode(path.split("?")[0]);
export const preloadNavigationIntent=(path:string,account:string|null)=>navigationPreloader.intent(path,account);
export const cancelNavigationIntent=()=>navigationPreloader.cancel();

/** Warm only likely destinations, in idle time; never start speculative chain reads. */
export function preloadRouteCode(currentPath="/") {
  const paths=["/mining","/farms","/portfolio"].filter(path=>path!==currentPath);
  let stopped=false;
  let idle:number|undefined;
  let fallback:ReturnType<typeof setTimeout>|undefined;
  const next=()=>{
    if(stopped || !canSpeculate())return;
    const path=paths.shift();if(!path)return;
    void navigationPreloader.warmCode(path).finally(()=>{if(!stopped)schedule();});
  };
  const schedule=()=>{
    if(stopped || !paths.length)return;
    if("requestIdleCallback" in window)idle=window.requestIdleCallback(next,{timeout:10000});
    else fallback=setTimeout(next,2000);
  };
  // Leave the first paint and active-page reads alone before considering extra code.
  fallback=setTimeout(schedule,2000);
  return()=>{stopped=true;if(idle!==undefined)window.cancelIdleCallback(idle);clearTimeout(fallback);};
}
if(typeof window!=="undefined"){
  window.addEventListener("oink-positions-changed",()=>navigationPreloader.invalidate());
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState!=="visible")navigationPreloader.cancel();});
}
