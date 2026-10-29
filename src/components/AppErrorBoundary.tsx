import { Component, type ErrorInfo, type ReactNode } from "react";
import { LoadingScreen } from "./LoadingScreen";

type Props = { children: ReactNode };
type State = { error: Error | null; retryCount: number };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryCount: 0 };
  private retryTimer: number | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("OINK application error", error, info);
    if (this.state.retryCount > 0 || this.retryTimer !== null) return;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.setState((current) => ({
        error: null,
        retryCount: current.retryCount + 1,
      }));
    }, 900);
  }

  componentWillUnmount() {
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.state.retryCount > 0) {
      return (
        <main className="app-error-screen" role="alert">
          <span className="section-kicker">Interface error</span>
          <h1>OINK could not load this page.</h1>
          <p>{this.state.error.message}</p>
          <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        </main>
      );
    }
    return <LoadingScreen fullscreen />;
  }
}
