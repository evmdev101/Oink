import { useEffect, useRef, useState } from "react";
import { waitForForegroundDisplayReads } from "../lib/displayReadPriority";

/** Render the full section immediately; postpone only its expensive requests. */
export function useDeferredDisplayRead() {
  const sectionRef = useRef<HTMLElement>(null);
  const [nearby, setNearby] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") { setNearby(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNearby(true); observer.disconnect(); }
    }, { rootMargin: "600px" });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!nearby) return;
    const controller = new AbortController();
    let started = false;
    const start = () => {
      if (document.hidden || started) return;
      started = true;
      void waitForForegroundDisplayReads(controller.signal).then(() => {
        if (!controller.signal.aborted) setReady(true);
      }).catch(() => {});
    };
    document.addEventListener("visibilitychange", start);
    start();
    return () => { controller.abort(); document.removeEventListener("visibilitychange", start); };
  }, [nearby]);
  return { sectionRef, readReady: ready };
}
