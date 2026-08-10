import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AssetLibrary } from "@/components/cloud/AssetLibrary";

const CARD_BG = "#131316";
const BORDER = "#1E1E22";

interface Props {
  modelId: string;
  displayName: string;
  avatarUrl?: string | null;
}

/**
 * Profil-Kopfleiste: Master-Auto-Modus für alle Conversations eines Profils
 * plus Schnellzugriff auf die Asset-Bibliothek des Profils.
 */
export function ProfileMasterBar({ modelId, displayName, avatarUrl }: Props) {
  const [total, setTotal] = useState(0);
  const [autoOn, setAutoOn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id, autopilot_enabled")
      .eq("model_id", modelId);
    const rows = data ?? [];
    setTotal(rows.length);
    setAutoOn(rows.filter(r => r.autopilot_enabled).length);
  }, [modelId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const allOn = total > 0 && autoOn === total;

  const apply = async (next: boolean) => {
    setBusy(true);
    const { error } = await supabase
      .from("conversations")
      .update({ autopilot_enabled: next })
      .eq("model_id", modelId);
    setBusy(false);
    if (error) { toast.error("Änderung fehlgeschlagen: " + error.message); return; }
    setAutoOn(next ? total : 0);
    if (next) toast.success("Auto-Modus für alle Conversations aktiviert");
    else toast.warning("Auto-Modus für alle Conversations deaktiviert");
    void refresh();
  };

  const onToggle = () => {
    if (busy) return;
    if (allOn) setConfirmOff(true);
    else void apply(true);
  };

  return (
    <div style={{ padding: "0 16px 12px" }}>
      <div style={{
        background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12,
        padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2"
            stroke={allOn ? "#818cf8" : "var(--text-subtle)"}>
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-strong)" }}>Auto-Modus</div>
            <div className="tabular" style={{ fontSize: 11, color: "var(--text-subtle)" }}>
              {autoOn} von {total} Conversations automatisiert
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setAssetsOpen(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 10,
              padding: "7px 11px", fontSize: 11.5, fontWeight: 600,
              color: "var(--text-muted)", cursor: "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" />
              <path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L3 21" />
            </svg>
            Assets
          </button>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <button
              onClick={onToggle}
              disabled={busy || total === 0}
              aria-label="Auto-Modus für alle Conversations umschalten"
              style={{
                width: 56, height: 28, borderRadius: 999, border: "none", position: "relative",
                cursor: busy || total === 0 ? "not-allowed" : "pointer",
                opacity: total === 0 ? 0.5 : 1,
                background: allOn ? "linear-gradient(135deg,#6366f1,#a855f7)" : "#2A2A30",
                boxShadow: allOn ? "0 0 18px rgba(129,140,248,0.45)" : "none",
                transition: "background 200ms cubic-bezier(.34,1.56,.64,1), box-shadow 200ms ease",
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: allOn ? 31 : 3,
                width: 22, height: 22, borderRadius: "50%", background: "#fff",
                display: "grid", placeItems: "center",
                transition: "left 200ms cubic-bezier(.34,1.56,.64,1)",
              }}>
                {busy && <Spinner />}
              </span>
            </button>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6,
              color: allOn ? "#a5b4fc" : "var(--text-subtle)",
            }}>{allOn ? "Alle an" : "Alle aus"}</span>
          </div>
        </div>
      </div>

      {confirmOff && (
        <ConfirmDialog
          count={total}
          onCancel={() => setConfirmOff(false)}
          onConfirm={() => { setConfirmOff(false); void apply(false); }}
        />
      )}

      {assetsOpen && (
        <AssetsPanel
          modelId={modelId}
          displayName={displayName}
          avatarUrl={avatarUrl}
          onClose={() => setAssetsOpen(false)}
        />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3"
      style={{ animation: "spin 700ms linear infinite" }}>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
    </svg>
  );
}

function ConfirmDialog({ count, onCancel, onConfirm }: {
  count: number; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(420px, 100%)", background: CARD_BG, border: `1px solid ${BORDER}`,
        borderRadius: 16, padding: 22, boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
      }}>
        <div className="display" style={{ fontSize: 16, color: "var(--text-strong)", marginBottom: 8 }}>
          Auto-Modus für alle {count} Conversations deaktivieren?
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-subtle)", margin: "0 0 18px" }}>
          Die KI wird keine Nachrichten mehr automatisch senden.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={{
            background: "transparent", border: "none", color: "var(--text-muted)",
            fontSize: 12.5, padding: "9px 14px", borderRadius: 10, cursor: "pointer",
          }}>Abbrechen</button>
          <button onClick={onConfirm} style={{
            background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.45)",
            color: "#fcd34d", fontSize: 12.5, fontWeight: 600,
            padding: "9px 14px", borderRadius: 10, cursor: "pointer",
          }}>Alle deaktivieren</button>
        </div>
      </div>
    </div>
  );
}

function AssetsPanel({ modelId, displayName, avatarUrl, onClose }: {
  modelId: string; displayName: string; avatarUrl?: string | null; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 85, background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(8px)", display: "flex", justifyContent: "flex-end",
    }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(896px, 100%)", height: "100%", background: CARD_BG,
          borderLeft: `1px solid ${BORDER}`, boxShadow: "-24px 0 70px rgba(0,0,0,0.65)",
          display: "flex", flexDirection: "column", padding: "16px 20px",
          animation: "sx-slide-in 260ms cubic-bezier(.22,1,.36,1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} aria-label="Schließen" style={{
            background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <AssetLibrary modelId={modelId} profile={{ displayName, avatarUrl }} />
      </div>
      <style>{`@keyframes sx-slide-in{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}
