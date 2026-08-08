import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin/admin/api-keys")({
  component: ApiKeysPage,
});

type Model = { id: string; display_name: string; handle: string };
type KeyRow = {
  id: string;
  model_id: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

async function sha256Hex(input: string) {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSecret(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ApiKeysPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [rows, setRows] = useState<KeyRow[]>([]);
  const [open, setOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = async () => {
    const [{ data: m }, { data: k }] = await Promise.all([
      supabase.from("model_profiles").select("id, display_name, handle").order("display_name"),
      supabase.from("extension_api_keys").select("id, model_id, key_prefix, created_at, last_used_at, revoked_at").order("created_at", { ascending: false }),
    ]);
    setModels((m ?? []) as Model[]);
    setRows((k ?? []) as KeyRow[]);
  };
  useEffect(() => { load(); }, []);

  const modelMap = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const revoke = async (id: string) => {
    if (!confirm("Diesen Key wirklich widerrufen?")) return;
    await supabase.from("extension_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const active = rows.filter((r) => !r.revoked_at).length;

  return (
    <div className="shex">
      <header className="shex-masthead reveal-stagger">
        <div className="shex-eyebrow">
          <span className="shex-bar" />
          API-KEYS &middot; N<sup>o</sup>&nbsp;03
        </div>
        <h1 className="shex-h1">
          Zugang.<br />
          <span className="shex-h1-muted">Ein Key pro Model</span>
        </h1>
        <p className="shex-lede">
          Erzeuge oder widerrufe Zugänge für die Browser-Extension und den Copilot.
          Neue Keys machen alte ungültig &mdash; das Fan-Brain bleibt erhalten.
        </p>
      </header>

      <section className="shex-section reveal-stagger">
        <div className="shex-section-head">
          <div className="shex-section-head-left">
            <span className="shex-section-index">I</span>
            <span className="shex-section-title">Dev-Anbindung</span>
          </div>
          <span className="shex-meta-faint">Endpoints &amp; Beispiele</span>
        </div>
        <details className="premium-card">
          <summary style={{ cursor: "pointer", fontSize: 13, color: "hsl(0 0% 78%)", fontWeight: 500, letterSpacing: 0.2, listStyle: "none" }}>
            <span style={{ color: "hsl(40 45% 60%)", marginRight: 10 }}>›</span>
            Ausklappen für cURL-Snippets &amp; Auth-Header
          </summary>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <DocRow label="Base URL"><code className="shex-code">{baseUrl || "https://<dein-projekt>.lovable.app"}</code></DocRow>
            <DocRow label="Auth-Header"><code className="shex-code">X-Pc-Key: pck_live_…</code></DocRow>
            <DocRow label="POST Fan-Brain">
              <pre className="shex-pre">{`curl -X POST "${baseUrl}/api/public/copilot/fan-brain" \\
  -H "X-Pc-Key: $PC_KEY" -H "Content-Type: application/json" \\
  -d '{
    "external_ref": "fan_username_123",
    "display_name": "Alex R.",
    "notes": "mag morgens kurze Sprachis",
    "facts": {
      "name": "Alex", "age": 34, "job": "Mechaniker",
      "location": "Hamburg",
      "kinks": ["feet", "voice"],
      "hobbies": ["MTB"],
      "inside_jokes": ["Käsekuchen-Sonntag"]
    }
  }'`}</pre>
            </DocRow>
            <DocRow label="GET Fan-Brain">
              <pre className="shex-pre">{`curl "${baseUrl}/api/public/copilot/fan-brain?external_ref=fan_username_123" \\
  -H "X-Pc-Key: $PC_KEY"`}</pre>
            </DocRow>
            <DocRow label="GET Sets">
              <pre className="shex-pre">{`curl "${baseUrl}/api/public/copilot/sets" -H "X-Pc-Key: $PC_KEY"`}</pre>
            </DocRow>
          </div>
        </details>
      </section>

      <section className="shex-section reveal-stagger">
        <div className="shex-section-head">
          <div className="shex-section-head-left">
            <span className="shex-section-index">II</span>
            <span className="shex-section-title">Verzeichnis</span>
          </div>
          <span className="shex-meta-faint tabular">
            {active.toLocaleString("de-DE")} aktiv &middot; {rows.length.toLocaleString("de-DE")} gesamt
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button onClick={() => { setNewKey(null); setOpen(true); }} className="shex-btn shex-btn-primary">
            + Neuen Key erstellen
          </button>
        </div>

        <div className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="shex-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Prefix</th>
                <th>Erstellt</th>
                <th>Zuletzt benutzt</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "hsl(0 0% 45%)", padding: "32px 16px" }}>Noch keine Keys.</td></tr>
              )}
              {rows.map((r) => {
                const m = modelMap.get(r.model_id);
                const revoked = !!r.revoked_at;
                return (
                  <tr key={r.id}>
                    <td style={{ color: "hsl(0 0% 92%)", fontWeight: 500 }}>
                      {m ? <>{m.display_name} <span style={{ color: "hsl(0 0% 45%)" }}>· @{m.handle}</span></> : <span style={{ color: "hsl(0 0% 45%)" }}>{r.model_id.slice(0, 8)}</span>}
                    </td>
                    <td><code className="shex-code">{r.key_prefix}••••</code></td>
                    <td className="tabular" style={{ color: "hsl(0 0% 60%)" }}>{new Date(r.created_at).toLocaleString("de-DE")}</td>
                    <td className="tabular" style={{ color: "hsl(0 0% 60%)" }}>{r.last_used_at ? new Date(r.last_used_at).toLocaleString("de-DE") : "—"}</td>
                    <td>
                      <span className={`premium-chip ${revoked ? "premium-chip-mute" : "premium-chip-gold"}`}>
                        {revoked ? "widerrufen" : "aktiv"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {!revoked && (
                        <button onClick={() => revoke(r.id)} className="shex-btn shex-btn-danger" style={{ padding: "8px 14px" }}>
                          Widerrufen
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {open && (
        <CreateKeyModal
          models={models}
          onClose={() => { setOpen(false); setNewKey(null); load(); }}
          newKey={newKey}
          setNewKey={setNewKey}
        />
      )}
    </div>
  );
}

function CreateKeyModal({
  models, onClose, newKey, setNewKey,
}: {
  models: Model[];
  onClose: () => void;
  newKey: string | null;
  setNewKey: (v: string | null) => void;
}) {
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    setErr(null);
    if (!modelId) { setErr("Model ist Pflicht."); return; }
    setBusy(true);
    try {
      const secret = "pck_live_" + randomSecret(24);
      const key_hash = await sha256Hex(secret);
      const key_prefix = secret.slice(0, 14);
      const m = models.find((x) => x.id === modelId);
      const { error } = await supabase.from("extension_api_keys").insert({
        model_id: modelId, key_prefix, key_hash, label: m?.display_name ?? "Model",
      });
      if (error) throw error;
      setNewKey(secret);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} className="shex-modal-backdrop">
      <div onClick={(e) => e.stopPropagation()} className="shex-modal">
        {!newKey ? (
          <>
            <div style={{ marginBottom: 18 }}>
              <div className="shex-eyebrow" style={{ marginBottom: 14 }}>
                <span className="shex-bar" />
                ANLEGEN
              </div>
              <h2 className="shex-h1" style={{ fontSize: 36, margin: 0 }}>Neuer API-Key.</h2>
              <p style={{ fontSize: 13, color: "hsl(0 0% 55%)", marginTop: 10, lineHeight: 1.55 }}>
                Wird genau einmal angezeigt &mdash; sofort sicher speichern. Alte Keys für dieses Model bleiben aktiv, bis du sie widerrufst.
              </p>
            </div>
            <label style={{ display: "block" }}>
              <span className="shex-field-label">Model</span>
              <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="shex-select">
                {models.length === 0 && <option value="">— Keine Models —</option>}
                {models.map((m) => (
                  <option key={m.id} value={m.id} style={{ background: "hsl(0 0% 6%)" }}>
                    {m.display_name} · @{m.handle}
                  </option>
                ))}
              </select>
            </label>
            {err && (
              <div style={{
                marginTop: 14, padding: "10px 12px", borderRadius: 8, fontSize: 12,
                background: "hsl(0 75% 58% / 0.08)",
                border: "1px solid hsl(0 75% 58% / 0.3)",
                color: "hsl(0 75% 75%)",
              }}>{err}</div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={onClose} className="shex-btn shex-btn-ghost" style={{ flex: 1 }}>Abbrechen</button>
              <button disabled={busy || !modelId} onClick={create} className="shex-btn shex-btn-primary" style={{ flex: 1 }}>
                {busy ? "…" : "Erstellen"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 18 }}>
              <div className="shex-eyebrow" style={{ marginBottom: 14 }}>
                <span className="shex-bar" />
                ERFOLGREICH
              </div>
              <h2 className="shex-h1" style={{ fontSize: 32, margin: 0 }}>Key erstellt.</h2>
              <p style={{ fontSize: 13, color: "hsl(40 45% 65%)", marginTop: 10, lineHeight: 1.55 }}>
                Wird nur jetzt angezeigt &mdash; nicht nochmal abrufbar.
              </p>
            </div>
            <pre className="shex-pre" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{newKey}</pre>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => navigator.clipboard.writeText(newKey)} className="shex-btn shex-btn-primary" style={{ flex: 1 }}>
                In Zwischenablage kopieren
              </button>
              <button onClick={onClose} className="shex-btn shex-btn-ghost" style={{ flex: 1 }}>
                Schließen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DocRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 14, alignItems: "start" }}>
      <span className="kpi-label" style={{ paddingTop: 6 }}>{label}</span>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
