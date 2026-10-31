import "./app-styles";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { recoverStalePage } from "./lib/stalePageRecovery";

window.addEventListener("vite:preloadError", event => {
  if (recoverStalePage((event as Event & { payload: unknown }).payload)) event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </AppErrorBoundary>
  </StrictMode>,
);
