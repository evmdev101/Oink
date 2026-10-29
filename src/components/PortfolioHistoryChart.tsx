import { useEffect, useId, useRef, useState } from "react";
import { formatEther } from "ethers";
import { displayFarmAmount } from "../lib/farmDisplay";

export type HistorySeries = { label:string; color:string; points:{ timestamp:number; value:string }[] };
const shortDate = (timestamp:number) => new Date(timestamp * 1000).toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" });
const compactAmount = (value:bigint) => new Intl.NumberFormat("en-US", { notation:"compact", maximumFractionDigits:2 }).format(Number(formatEther(value)));

export function HistoryChart({ series, end, label }: { series:HistorySeries[]; end:number; label:string }) {
  const host = useRef<HTMLDivElement>(null);
  const [width,setWidth] = useState(900);
  const [selected,setSelected] = useState<number | null>(null);
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240,entry.contentRect.width)));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const points = series.flatMap(line => line.points);
  const start = points.length ? Math.min(...points.map(point => point.timestamp)) - 1 : end - 86400;
  const finish = Math.max(end,start + 86400);
  const max = points.reduce((value,point) => BigInt(point.value) > value ? BigInt(point.value) : value,1n);
  const left = width < 500 ? 54 : 80, right = width - 12, top = 34, bottom = 218;
  const x = (timestamp:number) => left + (timestamp - start) / (finish - start) * (right - left);
  const y = (value:string) => bottom - Number(BigInt(value) * BigInt(bottom - top) * 100n / max) / 100;
  const timestamp = selected == null ? null : Math.max(start,Math.min(finish,selected));
  const valueAt = (line:HistorySeries) => {
    let value = "0";
    for (const point of line.points) { if (point.timestamp > (timestamp ?? finish)) break; value = point.value; }
    return value;
  };
  const values = series.map(line => ({ ...line, value:valueAt(line) }));
  const dates = [...new Set([start,...points.map(point => point.timestamp),finish])].sort((a,b) => a - b);
  const tooltipWidth = Math.min(270,width - 8);
  const tooltipLeft = timestamp == null ? 0 : Math.max(4,Math.min(width - tooltipWidth - 4,x(timestamp) + 12));
  return <><div ref={host} className="portfolio-interactive-chart">
    {!points.length ? <div className="portfolio-chart-empty">No matching events in the loaded history.</div> : <>
      <div className="portfolio-chart-input" tabIndex={0} role="slider" aria-label={label + ". Use arrow keys to explore events."}
        aria-valuemin={start} aria-valuemax={finish} aria-valuenow={timestamp ?? finish}
        aria-valuetext={shortDate(timestamp ?? finish) + ": " + values.map(line => line.label + " " + displayFarmAmount(formatEther(line.value)) + " OINK").join(", ")}
        onFocus={() => setSelected(finish)} onBlur={() => setSelected(null)}
        onKeyDown={event => {
          if (!["ArrowLeft","ArrowRight","Home","End","Escape"].includes(event.key)) return;
          event.preventDefault();
          const current = timestamp ?? finish;
          if (event.key === "Escape") setSelected(null);
          else if (event.key === "Home") setSelected(start);
          else if (event.key === "End") setSelected(finish);
          else if (event.key === "ArrowLeft") setSelected(dates.filter(date => date < current).at(-1) ?? start);
          else setSelected(dates.find(date => date > current) ?? finish);
        }}
        onPointerMove={event => {
          const rect = event.currentTarget.getBoundingClientRect();
          const local = (event.clientX - rect.left) * width / rect.width;
          setSelected(Math.round(start + Math.max(0,Math.min(1,(local - left) / (right - left))) * (finish - start)));
        }}
        onPointerLeave={() => setSelected(null)}>
        <svg viewBox={`0 0 ${width} 254`} className="portfolio-history-chart" aria-hidden="true">
          <defs>{series.map((line,index) => <linearGradient key={line.label} id={`${id}-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={line.color} stopOpacity=".28" /><stop offset="100%" stopColor={line.color} stopOpacity=".015" /></linearGradient>)}</defs>
          <line x1={left} x2={right} y1={bottom} y2={bottom} stroke="currentColor" opacity=".12" />
          {series.map((line,index) => {
            if (!line.points.length) return null;
            const path = `M${left} ${bottom} ` + line.points.map(point => `H${x(point.timestamp).toFixed(2)} V${y(point.value).toFixed(2)}`).join(" ") + ` H${right}`;
            return <g key={line.label}><path d={path + ` V${bottom} H${left} Z`} fill={`url(#${id}-${index})`} /><path d={path} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinejoin="round" /></g>;
          })}
          <text x={left - 12} y={top + 4} textAnchor="end" className="portfolio-chart-axis">{compactAmount(max)}</text>
          <text x={left} y="246" className="portfolio-chart-axis">{shortDate(start)}</text>
          <text x={right} y="246" textAnchor="end" className="portfolio-chart-axis">Now</text>
          {timestamp != null && <g><line x1={x(timestamp)} x2={x(timestamp)} y1={top} y2={bottom} stroke="currentColor" opacity=".35" strokeDasharray="4 4" />{values.map(line => <circle key={line.label} cx={x(timestamp)} cy={y(line.value)} r="5" fill={line.color} stroke="var(--bg)" strokeWidth="2" />)}</g>}
        </svg>
      </div>
      {timestamp != null && <div className="portfolio-chart-tooltip" style={{ left:tooltipLeft, width:tooltipWidth }} aria-hidden="true"><time>{new Date(timestamp * 1000).toLocaleString(undefined,{ month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit" })}</time>{values.map(line => <div key={line.label}><span><i style={{ background:line.color }} />{line.label}</span><strong>{displayFarmAmount(formatEther(line.value))} <small>OINK</small></strong></div>)}</div>}
    </>}
  </div><div className="portfolio-chart-legend">{points.length > 0 && <><span className="portfolio-chart-now">Now</span>{series.map(line => <span key={line.label}><i style={{background:line.color}} />{line.label} <strong>{displayFarmAmount(formatEther(line.points.at(-1)?.value ?? "0"))} OINK</strong></span>)}</>}</div></>;
}
