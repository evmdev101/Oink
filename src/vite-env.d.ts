/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on?: (event: string, handler: () => void) => void;
    removeListener?: (event: string, handler: () => void) => void;
  };
}
