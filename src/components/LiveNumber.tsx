import { useState, type HTMLAttributes } from "react";
import { numericDirection, type NumericDirection } from "../lib/numericChange";
import "./live-number.css";

type LiveNumberProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  value: string | number | null | undefined;
  format?: (value: string) => string;
  placeholder?: string;
};

type Display = { raw: string | null; text: string; sequence: number; direction: NumericDirection };

/** Shows the confirmed value immediately; the tick only draws attention to a change. */
export function LiveNumber({ value, format, placeholder = "—", className = "", ...props }: LiveNumberProps) {
  const raw = value == null || (typeof value === "number" && !Number.isFinite(value)) ? null : String(value);
  const text = raw == null ? placeholder : format ? format(raw) : raw;
  const [display, setDisplay] = useState<Display>(() => ({ raw, text, sequence: 0, direction: null }));
  if (display.raw !== raw || display.text !== text) {
    const changed = display.text !== text;
    setDisplay({
      raw,
      text,
      sequence: display.sequence + (changed ? 1 : 0),
      direction: changed ? display.raw != null && raw != null ? numericDirection(display.raw, raw) : null : display.direction,
    });
  }
  return <span {...props} className={"live-number " + className}>
    <span key={display.sequence} className={display.direction ? "live-number-tick live-number-" + display.direction : undefined}>{text}</span>
  </span>;
}
