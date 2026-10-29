import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./scroll-region.css";

type ScrollRegionProps = {
  children: ReactNode;
  label: string;
  className?: string;
  resetKey?: string | number;
};

export function ScrollRegion({
  children,
  label,
  className = "",
  resetKey,
}: ScrollRegionProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const element = viewport.current;
    const inner = content.current;
    if (!element || !inner) return;
    const measure = () =>
      setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(measure);
    observer?.observe(element);
    observer?.observe(inner);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [resetKey]);

  return (
    <div className="scroll-region-shell">
      <div
        ref={viewport}
        className={`scroll-region ${className}`.trim()}
        role="region"
        aria-label={label}
        tabIndex={overflowing ? 0 : undefined}
        aria-describedby={overflowing ? hintId : undefined}
      >
        <div ref={content} className="scroll-region-content">
          {children}
        </div>
      </div>
      <p className="scroll-region-hint" id={hintId} aria-hidden={!overflowing}>
        {overflowing ? "Scroll within this section to see more" : ""}
      </p>
    </div>
  );
}
