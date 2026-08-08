// CopilotDebugPanel — zeigt pro Nachricht, welche fanFacts der Copilot extrahiert
// und wie sie in fan_brain (identity / preferences / relationship / confidence) gemerged wurden.
import { useCopilotDebug, type CopilotDebugEntry } from "@/lib/chatStore";

const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11 };

export function CopilotDebugPanel({
  open, onClose, convId,
}: { open: boolean; onClose: () => void; convId: string }) {
  const entries = useCopilotDebug(convId);
  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "hsla(0,0%,0%,0.55)",
        backdropFilter: "blur(4px)", zIndex: 60, animation: "fadeIn 160ms ease-out",
      }} />
      <aside style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(720px, 96vw)", background: "var(--surface-1)",
        borderLeft: "1px solid var(--hairline-gold)",
        boxShadow: "-24px 0 60px hsla(0,0%,0%,0.5)", zIndex: 61,
        display: "flex", flexDirection: "column",
        animation: "slideIn 220ms cubic-bezier(.2,.8,.2,1)",
      }}>
        <div style={{
          padding: "16px 22px 14px", borderBottom: "1px solid var(--hairline)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 9.5, letterSpacing: 0.9, fontWeight: 700, color: "var(--gold)" }}>COPILOT DEBUG</div>
            <h2 className="display" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              fanFacts → fan_brain Merge-Log
            </h2>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 2 }}>
              {entries.length} Eintrag{entries.length === 1 ? "" : "e"} (neueste oben, max 30)
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: "6px 12px", borderRadius: 8, border: "1px solid var(--hairline-gold)",
            background: "hsla(0,0%,100%,0.03)", color: "var(--text-subtle)", fontSize: 12, fontWeight: 600,
          }}>Schließen</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
          {entries.length === 0 && (
            <div style={{
              padding: 24, borderRadius: 12, border: "1px dashed var(--hairline)",
              color: "var(--text-subtle)", fontSize: 13, textAlign: "center",
            }}>
              Noch keine Einträge — sobald der Copilot auf eine Fan-Nachricht reagiert,
              landet hier ein Merge-Log.
            </div>
          )}
          {entries.map((e, i) => <Entry key={`${e.ts}-${i}`} entry={e} />)}
        </div>
      </aside>
      <style>{`
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  );
}

function Entry({ entry }: { entry: CopilotDebugEntry }) {
  const ff = entry.fanFactsExtracted ?? {};
  const ffKeys = Object.keys(ff).filter(k => {
    const v = (ff as Record<string, unknown>)[k];
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.trim().length > 0;
    return true;
  });
  const before = entry.brainBefore ?? {};
  const after = entry.brainAfter ?? {};
  const confDelta = (after.confidence ?? 0) - (before.confidence ?? 0);

  return (
    <div style={{
      borderRadius: 12, border: "1px solid var(--hairline)",
      background: "hsla(0,0%,100%,0.025)", overflow: "hidden",
    }}>
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid var(--hairline)",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
        background: "hsla(40,40%,16%,0.25)",
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>
            {new Date(entry.ts).toLocaleTimeString("de-DE")}
            {entry.fanId && <span style={{ marginLeft: 8, ...mono, opacity: 0.6 }}>{entry.fanId.slice(0, 8)}…</span>}
          </div>
          {entry.triggerMessagePreview && (
            <div style={{
              fontSize: 12, color: "var(--text)", marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              <span style={{ color: "var(--text-subtle)" }}>Fan:</span> „{entry.triggerMessagePreview}"
            </div>
          )}
        </div>
        <span style={{
          padding: "3px 9px", borderRadius: 999, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6,
          background: entry.written ? "hsla(140,55%,40%,0.18)" : "hsla(0,70%,55%,0.18)",
          color: entry.written ? "hsl(140,60%,75%)" : "hsl(0,70%,80%)",
          border: `1px solid ${entry.written ? "hsla(140,55%,40%,0.4)" : "hsla(0,70%,55%,0.4)"}`,
        }}>{entry.written ? "WRITTEN" : "FAILED"}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {/* Extracted */}
        <div style={{ padding: 14, borderRight: "1px solid var(--hairline)" }}>
          <Kicker>fanFacts (vom AI extrahiert)</Kicker>
          {ffKeys.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-subtle)", fontStyle: "italic" }}>– keine –</div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
              {ffKeys.map(k => (
                <li key={k} style={{ fontSize: 12, ...mono }}>
                  <span style={{ color: "var(--gold)" }}>{k}:</span>{" "}
                  <span style={{ color: "var(--text)" }}>{fmt((ff as Record<string, unknown>)[k])}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Merge result */}
        <div style={{ padding: 14 }}>
          <Kicker>Merge in fan_brain</Kicker>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <DiffRow label="confidence"
              before={`${Math.round((before.confidence ?? 0) * 100)}%`}
              after={`${Math.round((after.confidence ?? 0) * 100)}%`}
              changed={confDelta !== 0}
            />
            <DiffRow label="identity.name"
              before={String((before.identity as Record<string, unknown> | undefined)?.name ?? "—")}
              after={String((after.identity as Record<string, unknown> | undefined)?.name ?? "—")}
              changed={changed(before.identity, after.identity, "name")}
            />
            <DiffRow label="identity.job"
              before={String((before.identity as Record<string, unknown> | undefined)?.job_hint ?? "—")}
              after={String((after.identity as Record<string, unknown> | undefined)?.job_hint ?? "—")}
              changed={changed(before.identity, after.identity, "job_hint")}
            />
            <DiffRow label="identity.city"
              before={String((before.identity as Record<string, unknown> | undefined)?.city_hint ?? "—")}
              after={String((after.identity as Record<string, unknown> | undefined)?.city_hint ?? "—")}
              changed={changed(before.identity, after.identity, "city_hint")}
            />
            <DiffRow label="prefs.kinks"
              before={fmt(before.preferences?.kinks)}
              after={fmt(after.preferences?.kinks)}
              changed={(before.preferences?.kinks?.length ?? 0) !== (after.preferences?.kinks?.length ?? 0)}
            />
            <DiffRow label="prefs.turn_offs"
              before={fmt(before.preferences?.turn_offs)}
              after={fmt(after.preferences?.turn_offs)}
              changed={(before.preferences?.turn_offs?.length ?? 0) !== (after.preferences?.turn_offs?.length ?? 0)}
            />
          </div>
        </div>
      </div>

      {entry.error && (
        <div style={{
          padding: "8px 14px", fontSize: 11, color: "hsl(0,70%,80%)",
          borderTop: "1px solid hsla(0,70%,55%,0.3)", background: "hsla(0,70%,55%,0.08)",
        }}>
          Fehler: {entry.error}
        </div>
      )}
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <div style={{
    fontSize: 9.5, fontWeight: 700, letterSpacing: 0.9,
    color: "var(--gold)", textTransform: "uppercase", marginBottom: 8,
  }}>{children}</div>;
}

function DiffRow({ label, before, after, changed }: { label: string; before: string; after: string; changed: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 12px 1fr", gap: 6, alignItems: "center", fontSize: 11, ...mono }}>
      <span style={{ color: "var(--text-subtle)" }}>{label}</span>
      <span style={{ color: "var(--text-subtle)", textDecoration: changed ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{before}</span>
      <span style={{ color: changed ? "var(--gold)" : "var(--text-subtle)" }}>→</span>
      <span style={{ color: changed ? "var(--text-strong)" : "var(--text-subtle)", fontWeight: changed ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{after}</span>
    </div>
  );
}

function changed(a: Record<string, unknown> | undefined, b: Record<string, unknown> | undefined, key: string): boolean {
  return String(a?.[key] ?? "") !== String(b?.[key] ?? "");
}

function fmt(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.length === 0 ? "[]" : `[${v.join(", ")}]`;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
