import { preloadRouteCode } from "./lib/preloadPage";
import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { useTheme } from "./components/ThemePanel";
import { WalletProvider, useWallet } from "./components/WalletProvider";
import { TransactionMonitor } from "./components/TransactionMonitor";
import { PageLoadBoundary, usePageLoadStatus } from "./components/PageLoadBoundary";
import { ReferralNotice } from "./components/ReferralNotice";
import { PublicPreviewNotice } from "./components/PublicPreviewNotice";
import { RequestRecovery } from "./components/RequestRecovery";
import "./pages/reference-layout.css";
import "./components/distribution-charts.css";
import "./themes/frosted.css";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const MiningPage = lazy(() =>
  import("./pages/MiningPage").then((module) => ({
    default: module.MiningPage,
  })),
);
// Ecosystem farms are separate from OINK time miners.
const FarmsPage = lazy(() => import("./pages/FarmsPage").then((module) => ({ default: module.FarmsPage })));
const NftsPage = lazy(() => import("./pages/NftsPage").then((module) => ({ default: module.NftsPage })));
const GovernancePage = lazy(() =>
  import("./pages/GovernancePage").then((module) => ({
    default: module.GovernancePage,
  })),
);
const ProtocolPage = lazy(() =>
  import("./pages/ProtocolPage").then((module) => ({
    default: module.ProtocolPage,
  })),
);

const PortfolioPage = lazy(() => import("./pages/PortfolioPage").then(module => ({ default: module.PortfolioPage })));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage").then(module => ({ default: module.HowItWorksPage })));
const MaintenancePage = lazy(() => import("./pages/MaintenancePage").then(module => ({ default: module.MaintenancePage })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageRoutes() {
  const { pathname } = useLocation();
  const wallet = useWallet();
  useEffect(() => preloadRouteCode(pathname), [pathname]);
  const walletPage = pathname === "/mining" || pathname === "/governance" || pathname === "/portfolio";
  const page = ({ "/": "Dashboard", "/portfolio": "Portfolio", "/how-it-works": "How it works", "/docs": "Docs", "/mining": "Miners", "/farms": "Farms", "/nfts": "NFTs", "/governance": "Governance", "/maintenance": "Maintenance", "/protocol": "Docs" } as Record<string, string>)[pathname] ?? "Home";
  const label = `Loading OINK ${page}`;
  // In-page tab/filter changes keep the route shell mounted. Wallet changes
  // still reset private views so another account cannot inherit their state.
  const pageKey = `${pathname}:${walletPage ? `${wallet.account ?? "disconnected"}:${wallet.chainId ?? ""}` : "public"}`;
  return <Suspense key={pageKey} fallback={null}>
    <PageLoadBoundary label={label}>
      <WalletReadiness wait={walletPage && wallet.busy} />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/docs" element={<ProtocolPage />} />
        <Route path="/mining" element={<MiningPage />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route path="/nfts" element={<NftsPage />} />
        <Route path="/governance" element={<GovernancePage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/available-actions.html" element={<Navigate to="/maintenance" replace />} />
        <Route path="/protocol" element={<ProtocolPage />} />
        <Route path="/faq" element={<Navigate to="/protocol?section=faq" replace />} />
        <Route path="/oinkpaper" element={<Navigate to="/protocol" replace />} />
        <Route path="/tech" element={<Navigate to="/protocol" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageLoadBoundary>
  </Suspense>;
}

function WalletReadiness({ wait }: { wait: boolean }) {
  usePageLoadStatus("wallet-session", !wait);
  return null;
}

export default function App() {
  const { theme, setTheme } = useTheme();
  return (
    <WalletProvider><div className="app-shell">
      <Header theme={theme} setTheme={setTheme} />
      <PublicPreviewNotice />
      <RequestRecovery />
      <ScrollToTop />
      <ReferralNotice />
      <TransactionMonitor />
      <PageRoutes />
    </div></WalletProvider>
  );
}
