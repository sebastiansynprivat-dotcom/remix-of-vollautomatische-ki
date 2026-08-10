import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import fahrplanMd from "../../../docs/fahrplan.md?raw";
import v1Md from "../../../docs/chatting-leitfaden-v1.md?raw";
import v2Md from "../../../docs/chatting-leitfaden-v2.md?raw";
import { TelemetriePanel } from "./TelemetriePanel";

type Variant = "fahrplan" | "v2" | "v1" | "telemetrie";

export function FahrplanView() {
  const [variant, setVariant] = useState<Variant>("fahrplan");
  const md = variant === "fahrplan" ? fahrplanMd : variant === "v2" ? v2Md : v1Md;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Variant switcher */}
      <div style={{
        display: "inline-flex", alignSelf: "flex-start",
        background: "hsla(0,0%,100%,0.04)",
        border: "1px solid hsla(0,0%,100%,0.06)",
        borderRadius: 10, padding: 4,
      }}>
        {([["fahrplan", "Fahrplan"], ["v2", "Leitfaden v2"], ["v1", "v1 (Archiv)"], ["telemetrie", "Telemetrie"]] as const).map(([id, label]) => {
          const active = variant === id;
          return (
            <button
              key={id}
              onClick={() => setVariant(id)}
              style={{
                padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 7,
                background: active ? "var(--accent)" : "transparent",
                color: active ? "hsl(40,30%,8%)" : "var(--text-muted)",
                transition: "all 200ms var(--easing)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {variant === "telemetrie" ? (
        <TelemetriePanel />
      ) : (
        <div className="leitfaden-md premium-card" style={{ padding: "28px 32px", lineHeight: 1.65, fontSize: 14, color: "var(--text-strong)" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
        </div>
      )}

      <style>{`
        .leitfaden-md h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: var(--text-strong); letter-spacing: -0.4px; }
        .leitfaden-md h2 { font-size: 17px; font-weight: 700; margin: 28px 0 10px; color: var(--accent); letter-spacing: -0.2px; }
        .leitfaden-md h3 { font-size: 14px; font-weight: 700; margin: 20px 0 8px; color: var(--text-strong); }
        .leitfaden-md h4 { font-size: 13px; font-weight: 700; margin: 14px 0 6px; color: var(--text-strong); opacity: 0.9; }
        .leitfaden-md p { margin: 0 0 10px; color: var(--text-strong); opacity: 0.92; }
        .leitfaden-md ul, .leitfaden-md ol { margin: 4px 0 12px; padding-left: 20px; }
        .leitfaden-md li { margin: 3px 0; color: var(--text-strong); opacity: 0.9; }
        .leitfaden-md strong { color: var(--text-strong); font-weight: 700; }
        .leitfaden-md em { color: var(--text-muted); font-style: italic; }
        .leitfaden-md code { background: hsla(0,0%,100%,0.06); padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; color: var(--accent); }
        .leitfaden-md pre { background: hsla(0,0%,0%,0.35); padding: 12px 14px; border-radius: 8px; overflow-x: auto; margin: 10px 0; border: 1px solid hsla(0,0%,100%,0.05); }
        .leitfaden-md pre code { background: transparent; padding: 0; color: var(--text-strong); font-size: 12px; }
        .leitfaden-md blockquote { border-left: 3px solid var(--accent); padding: 4px 14px; margin: 10px 0; color: var(--text-muted); background: hsla(40,30%,18%,0.15); border-radius: 0 6px 6px 0; }
        .leitfaden-md blockquote p { margin: 4px 0; }
        .leitfaden-md table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
        .leitfaden-md th, .leitfaden-md td { border: 1px solid hsla(0,0%,100%,0.08); padding: 8px 10px; text-align: left; vertical-align: top; }
        .leitfaden-md th { background: hsla(40,30%,18%,0.3); color: var(--accent); font-weight: 700; }
        .leitfaden-md hr { border: none; border-top: 1px solid hsla(0,0%,100%,0.08); margin: 22px 0; }
        .leitfaden-md a { color: var(--accent); text-decoration: underline; }
      `}</style>
    </div>
  );
}
