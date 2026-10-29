import { Component, createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LoadingScreen } from "./LoadingScreen";

type LoadStatus = { ready: boolean; error: string | null; retry?: () => void };
type LoadRegistry = {
  report: (id: string, status: LoadStatus) => void;
  remove: (id: string) => void;
};
const PageLoadContext = createContext<LoadRegistry | null>(null);

/** Report an initial data read without unmounting the component doing the read. */
export function usePageLoadStatus(id: string, ready: boolean, error?: string | null, retry?: () => void) {
  const registry = useContext(PageLoadContext);
  const retryRef = useRef(retry);
  useLayoutEffect(() => { retryRef.current = retry; }, [retry]);
  const retryRead = useCallback(() => retryRef.current?.(), []);
  const retryAction = retry ? retryRead : undefined;

  useLayoutEffect(() => {
    registry?.report(id, { ready, error: error || null, retry: retryAction });
  }, [registry, id, ready, error, retryAction]);
  useLayoutEffect(() => () => registry?.remove(id), [registry, id]);
}

/** Keep route content visible while its independent data reads complete. */
export function PageLoadBoundary({ label, children }: { label: string; children: ReactNode }) {
  return <PageLoadErrorBoundary label={label}><PageLoadContent label={label}>{children}</PageLoadContent></PageLoadErrorBoundary>;
}

// Suspense handles pending imports, but a missing deployment chunk rejects.
// Keep the surrounding navigation available and reload the current route so
// the browser fetches the current entry point instead of retrying a cached import.
class PageLoadErrorBoundary extends Component<{ label: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <LoadingScreen label={this.props.label} error="This page could not load. Reload the page to try again." onRetry={() => window.location.reload()} />
      : this.props.children;
  }
}

function PageLoadContent({ label, children }: { label: string; children: ReactNode }) {
  const [reads, setReads] = useState<Record<string, LoadStatus>>({});
  const report = useCallback((id: string, status: LoadStatus) => {
    setReads(current => {
      const previous = current[id];
      if (previous?.ready === status.ready && previous.error === status.error && previous.retry === status.retry) return current;
      return { ...current, [id]: status };
    });
  }, []);
  const remove = useCallback((id: string) => {
    setReads(current => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);
  const registry = useMemo(() => ({ report, remove }), [report, remove]);

  const pending = Object.values(reads).filter(read => !read.ready);
  const errors = [...new Set(pending.flatMap(read => read.error ? [read.error] : []))];
  const retries = [...new Set(pending.flatMap(read => read.retry ? [read.retry] : []))];

  return <PageLoadContext.Provider value={registry}>
    {errors.length > 0 && <div className="page-read-notice" role="status"><span>{errors.join(" ")}</span>{retries.length > 0 && <button type="button" onClick={() => retries.forEach(retry => retry())}>Retry</button>}</div>}
    <div className="page-load-content" aria-label={label.replace(/^Loading /, "")}>{children}</div>
  </PageLoadContext.Provider>;
}
