import { memo, useEffect, useMemo, useRef, useState } from "react";
import { assetUrl } from "../lib/assets";
import { useNftCardMotion } from "./useNftCardMotion";
import "./oink-contract-showcase.css";

type CodeToken = { text: string; kind: string };

const SourceCode = memo(function SourceCode({ source }: { source: string }) {
  const lines = useMemo(() => {
    const rows: CodeToken[][] = [[]];
    const append = (text: string, kind: string) => text.split("\n").forEach((part, index) => {
      if (index) rows.push([]);
      if (part) rows[rows.length - 1].push({ text: part, kind });
    });
    const tokens = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:pragma|solidity|import|interface|contract|is|using|for|uint\d*|int\d*|bytes\d*|address|bool|string|function|constructor|modifier|public|private|internal|external|view|pure|virtual|returns|return|require|onlyOwner|constant|immutable|override|memory|storage|calldata|mapping|event|indexed|emit|if|else|new|true|false)\b|\b(?:0x[\da-fA-F]+|\d[\d_]*(?:\.\d+)?)\b/g;
    let cursor = 0;
    for (const match of source.matchAll(tokens)) {
      append(source.slice(cursor, match.index), "plain");
      const text = match[0];
      append(text, text.startsWith("/") ? "comment" : /^["']/.test(text) ? "string" : /^\d/.test(text) ? "number" : "keyword");
      cursor = match.index! + text.length;
    }
    append(source.slice(cursor), "plain");
    return rows;
  }, [source]);
  return <code>{lines.map((line, index) => <span className="contract-code-line" data-line={index + 1} key={index}><span className="contract-line-number" aria-hidden="true">{index + 1}</span><span className="contract-line-text">{line.map((token, part) => <span className={"contract-code-" + token.kind} key={part}>{token.text}</span>)}{"\n"}</span></span>)}</code>;
});

export function OinkContractShowcase() {
  const [sourceFile, setSourceFile] = useState("OINK-XPD-explorer.sol");
  const [sources, setSources] = useState<Record<string, string>>({});
  const source = sources[sourceFile] ?? "";
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [lightOn, setLightOn] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const { stage, card } = useNftCardMotion(motionPaused || expanded);
  const viewport = useRef<HTMLPreElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useEffect(() => {
    if (expanded) dialog.current?.showModal();
    else dialog.current?.close();
  }, [expanded]);
  useEffect(() => {
    if (source) return;
    const controller = new AbortController();
    setError("");
    fetch(assetUrl("contracts/" + sourceFile), { signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error("Source unavailable");
      const text = (await response.text()).replace(/\r\n/g, "\n");
      if (!text.includes("contract XPD") || text.length > 300000) throw Error("Source unavailable");
      if (!controller.signal.aborted) setSources(current => ({ ...current, [sourceFile]: text }));
    }).catch(() => { if (!controller.signal.aborted) setError("Source unavailable. Select Retry source to try again."); });
    return () => controller.abort();
  }, [sourceFile, source, retry]);
  const copy = async (value: string, label: string) => {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(""), 2000);
    } catch { setCopyError("Select the text to copy it; clipboard access is unavailable."); }
  };
  const jumpToToken = () => {
    const line = source.split("\n").findIndex(text => /^\s*contract XPD\b/.test(text));
    const row = viewport.current?.querySelector<HTMLElement>('[data-line="' + (line + 1) + '"]');
    if (row && viewport.current) { viewport.current.scrollTop = row.offsetTop - 14; viewport.current.focus({ preventScroll: true }); }
  };
  const codeView = (isExpanded = false) => <pre ref={isExpanded ? undefined : viewport} key={sourceFile} className={"contract-source-code" + (wrap ? " is-wrapped" : "")} tabIndex={0} role="region" aria-label={isExpanded ? "Expanded OINK Solidity source code" : "OINK Solidity source code"}>{source ? <SourceCode source={source} /> : <span className="contract-source-message" role="status">{error || "Loading OINK Solidity source…"}</span>}</pre>;

  return <article className="oink-contract-showcase" aria-label="OINK contract source">
    <div className="contract-tilt-stage" ref={stage}>
    <div className="contract-editor" ref={card} data-light={lightOn ? "on" : "off"}>
      <div className="contract-editor-title"><span className="contract-window-dots" aria-hidden="true"><i /><i /><i /></span><span>XPD.sol</span><span>{source ? source.split("\n").length.toLocaleString() + " lines" : "Solidity"}</span></div>
      <label className="contract-source-select"><span className="contract-sr-only">Contract source file</span><select value={sourceFile} onChange={event => { setError(""); setSourceFile(event.target.value); }}><option value="OINK-XPD-explorer.sol">Full contract + dependencies</option><option value="OINK-XPD.sol">Token contract only · project source</option></select></label>
      <div className="contract-source-toolbar"><button type="button" disabled={!source} onClick={jumpToToken}>Jump to OINK</button><label><input type="checkbox" checked={wrap} onChange={event => setWrap(event.target.checked)} />Wrap lines</label><button type="button" disabled={!source} onClick={() => setExpanded(true)}>Expand ↗</button></div>
      {codeView()}
      <div className="contract-editor-footer"><span>{sourceFile === "OINK-XPD-explorer.sol" ? "Explorer source · XPD" : "Published project source · XPD"}</span>{error ? <button type="button" onClick={() => setRetry(value => value + 1)}>Retry source</button> : <button type="button" disabled={!source} onClick={() => void copy(source, "code")}>{copied === "code" ? "Copied!" : "Copy code"}</button>}</div>
      <div className="contract-editor-sheen" aria-hidden="true" />
    </div>
    </div>
    <div className="contract-effects-controls">
      <button type="button" aria-pressed={lightOn} onClick={() => setLightOn(value => !value)}>{lightOn ? "Light Off" : "Light On"}</button>
      <button type="button" aria-pressed={motionPaused} title="Pause the card’s movement for reading" onClick={() => setMotionPaused(value => !value)}>{motionPaused ? "Resume motion" : "Pause motion"}</button>
    </div>
    <span className="contract-copy-status contract-sr-only" role="status">{copyError || (copied ? "Code copied." : "")}</span>
    <dialog className="contract-source-dialog" ref={dialog} aria-labelledby="expanded-contract-title" onCancel={() => setExpanded(false)} onClose={() => setExpanded(false)}>{expanded && <><header><h3 id="expanded-contract-title">OINK · Solidity source</h3><button type="button" onClick={() => setExpanded(false)}>Close</button></header>{codeView(true)}</>}</dialog>
  </article>;
}

