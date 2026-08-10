import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Plattform-Verbindungen eines Profils (Platzhalter — noch keine echte API).
 * Pro Plattform ein eigener Auto-Modus-Schalter.
 */

type PlatformRow = {
  id: string;
  platform: string;
  account_handle: string | null;
  is_connected: boolean;
  auto_mode_enabled: boolean;
  last_sync_at: string | null;
  connection_status: string;
};

const PLATFORMS: { value: string; label: string }[] = [
  { value: "maloum", label: "Maloum" },
  { value: "brezzels", label: "Brezzels" },
  { value: "4based", label: "4Based" },
];

const platformLabel = (v: string) => PLATFORMS.find((p) => p.value === v)?.label ?? v;

function relativeTime(iso: string | null): string {
  if (!iso) return "nie";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `vor ${mins}min`;
  const h = Math.round(mins / 60);
  if (h < 48) return `vor ${h}h`;
  return `vor ${Math.round(h / 24)}d`;
}

export function PlatformsTab({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<PlatformRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [platform, setPlatform] = useState("maloum");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profile_platforms")
      .select("id, platform, account_handle, is_connected, auto_mode_enabled, last_sync_at, connection_status")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true });
    setRows((data ?? []) as PlatformRow[]);
    setLoading(false);
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setBusy(true);
    const { error } = await supabase.from("profile_platforms").insert({
      profile_id: profileId,
      platform,
      account_handle: handle.trim() || null,
      is_connected: false,
      connection_status: "disconnected",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setHandle("");
    setShowForm(false);
    toast.success(`${platformLabel(platform)} hinzugefügt`);
    load();
  };

  const toggleAuto = async (row: PlatformRow) => {
    setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, auto_mode_enabled: !r.auto_mode_enabled } : r));
    const { error } = await supabase
      .from("profile_platforms")
      .update({ auto_mode_enabled: !row.auto_mode_enabled })
      .eq("id", row.id);
    if (error) { toast.error(error.message); load(); }
  };

  const disconnect = async (row: PlatformRow) => {
    if (!confirm(`${platformLabel(row.platform)} wirklich trennen?`)) return;
    const { error } = await supabase.from("profile_platforms").delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plattform getrennt");
    load();
  };

  if (loading) {
    return <div style={{ padding: 32, textAlign: "center", color: "var(--text-subtle)", fontSize: 13 }}>Lade Plattformen…</div>;
  }

  return (
    <section className="premium-card" style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20, marginBottom: 16 }}>
      <div className="kpi-label" style={{
        color: "var(--text-strong)", marginBottom: 4, paddingBottom: 12,
        borderBottom: "1px solid var(--hairline)",
      }}>Plattformen</div>

      {rows.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: "40px 16px" }}>
          <div style={{ color: "var(--text-subtle)", display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <LinkIcon size={32} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-strong)", marginBottom: 6 }}>
            Noch keine Plattformen verbunden
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginBottom: 20 }}>
            Verbinde dieses Profil mit einer Plattform um es zu aktivieren
          </div>
          <button className="shex-btn shex-btn-primary" onClick={() => setShowForm(true)}>
            Plattform hinzufügen
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((r) => (
            <div key={r.id} style={{
              background: "#18181D", border: "1px solid #1E1E22",
              borderRadius: 10, padding: 16,
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: "var(--text-subtle)", display: "flex" }}><LinkIcon size={16} /></span>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-strong)" }}>
                    {platformLabel(r.platform)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>
                    {r.account_handle || "— kein Handle"}
                  </div>
                </div>

                <StatusBadge status={r.connection_status} connected={r.is_connected} />

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>Auto-Modus</span>
                  <Switch on={r.auto_mode_enabled} onClick={() => toggleAuto(r)} />
                </label>
              </div>

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, borderTop: "1px solid #1E1E22", paddingTop: 10,
              }}>
                <button
                  onClick={() => disconnect(r)}
                  style={{ fontSize: 11.5, color: "var(--text-subtle)", background: "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(0 72% 68%)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-subtle)"; }}
                >
                  Trennen
                </button>
                <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>
                  Zuletzt sync: {relativeTime(r.last_sync_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div style={{
          background: "#18181D", border: "1px solid #1E1E22", borderRadius: 10,
          padding: 16, display: "flex", flexDirection: "column", gap: 12,
        }}>
          <label style={{ display: "block" }}>
            <span className="shex-field-label" style={{ display: "block", marginBottom: 6 }}>Plattform</span>
            <select className="shex-input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          <label style={{ display: "block" }}>
            <span className="shex-field-label" style={{ display: "block", marginBottom: 6 }}>Account Handle</span>
            <input
              className="shex-input" value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@handle_auf_plattform"
            />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="shex-btn shex-btn-primary" disabled={busy} onClick={add}>
              {busy ? "Verbinde…" : "Verbinden"}
            </button>
            <button className="shex-btn shex-btn-ghost" onClick={() => setShowForm(false)}>Abbrechen</button>
          </div>
        </div>
      ) : rows.length > 0 ? (
        <button className="shex-btn shex-btn-ghost" style={{ alignSelf: "flex-start" }} onClick={() => setShowForm(true)}>
          + Plattform hinzufügen
        </button>
      ) : null}
    </section>
  );
}

function StatusBadge({ status, connected }: { status: string; connected: boolean }) {
  const state = status === "error" ? "error" : (connected || status === "connected") ? "connected" : "disconnected";
  const map = {
    connected: { color: "hsl(152 60% 70%)", dot: "var(--status-success)", label: "Verbunden" },
    disconnected: { color: "var(--text-subtle)", dot: "#3A3A42", label: "Getrennt" },
    error: { color: "hsl(0 72% 76%)", dot: "hsl(0 72% 60%)", label: "Fehler" },
  }[state];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: map.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: map.dot }} />
      {map.label}
    </span>
  );
}

export function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on}
      style={{
        width: 40, height: 22, borderRadius: 999, flexShrink: 0,
        background: on ? "var(--accent)" : "#2A2A31",
        border: "1px solid " + (on ? "var(--accent)" : "#33333B"),
        position: "relative", transition: "background-color 150ms var(--easing)",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 20 : 2,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", transition: "left 150ms var(--easing)",
      }} />
    </button>
  );
}

function LinkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
