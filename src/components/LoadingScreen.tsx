import type { ReactNode } from "react";

export function LoadingScreen({
  fullscreen = false,
  label = "Loading…",
  error = "",
  onRetry,
  recovery,
}: {
  fullscreen?: boolean;
  label?: string;
  error?: string;
  onRetry?: () => void;
  recovery?: ReactNode;
}) {
  return (
    <main
      className={`app-loading-screen${fullscreen ? " is-fullscreen" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="app-loading-content">
        <span className="app-loading-spinner" aria-hidden="true" />
        <span className="app-loading-label">{label}</span>
        {error && <p className="app-loading-error">{error}</p>}
        {error && onRetry && <button className="app-loading-retry" type="button" onClick={onRetry}>Retry now</button>}
        {error && recovery}
      </div>
    </main>
  );
}
