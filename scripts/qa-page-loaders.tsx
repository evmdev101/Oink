// Dev-only regression fixture: independent reads, retry, navigation and refresh.
// No wallet/provider injection or network requests.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { PageLoadBoundary, usePageLoadStatus } from "../src/components/PageLoadBoundary";
import "../src/styles.css";

function Read({ id, ready, failed, retry, crash = false }: { id: string; ready: boolean; failed?: boolean; retry?: () => void; crash?: boolean }) {
  usePageLoadStatus(id, ready, failed ? "Read failed. Please retry." : null, retry);
  if (crash) throw new Error("Simulated page module/render failure");
  return <p>{id}: {ready ? "125 OINK" : "Pending"}</p>;
}
function Fixture() {
  const [page, setPage] = useState("Home");
  const [first, setFirst] = useState(false);
  const [second, setSecond] = useState(false);
  const [failed, setFailed] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const switchPage = () => { setFirst(false); setSecond(false); setFailed(false); setCrashed(false); setPage(page === "Home" ? "Miners" : "Home"); };
  return <>
    <header className="site-header">
      <button onClick={() => setFirst(true)}>Resolve first read</button>
      <button onClick={() => setSecond(true)}>Resolve second read</button>
      <button onClick={() => setFailed(true)}>Fail second read</button>
      <button onClick={() => { setFirst(false); setSecond(false); }}>Refresh data</button>
      <button onClick={switchPage}>Switch page</button>
      <button onClick={() => setCrashed(true)}>Simulate page failure</button>
    </header>
    <PageLoadBoundary key={page} label={`Loading OINK ${page}`}>
      <main>
        <h1>{page} loaded content</h1>
        <Read id="balances" ready={first} crash={crashed} />
        <Read id="rates" ready={second} failed={failed} retry={() => { setSecond(true); setFailed(false); }} />
      </main>
    </PageLoadBoundary>
  </>;
}
if (import.meta.env.DEV) createRoot(document.getElementById("root")!).render(<StrictMode><Fixture /></StrictMode>);
