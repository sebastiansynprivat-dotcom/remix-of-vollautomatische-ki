import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveLimits, type ProfileLimits } from "@/lib/profileLimits";

/** Schutz & Limits pro Profil — Obergrenzen und Auto-Pause. */
export function LimitsEditor({ modelId, value, onSaved, onChange }: {
  modelId: string;
  value: unknown;
  onSaved?: (limits: ProfileLimits) => void;
  /** Wenn gesetzt: kein eigener Speichern-Button, Parent übernimmt Auto-Save. */
  onChange?: (limits: ProfileLimits) => void;
}) {
  const initial = useMemo(() => resolveLimits(value), [value]);
  const [lim, setLim] = useState<ProfileLimits>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLim(initial); }, [initial]);

  const patch = (p: Partial<ProfileLimits>) => setLim((l) => {
    const next = { ...l, ...p };
    onChange?.(next);
    return next;
  });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("model_profiles")
      .update({ limits: lim as unknown as never })
      .eq("id", modelId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved?.(lim);
    toast.success("Schutz-Einstellungen gespeichert");
  };


  return (
    <section style={{
      background: "#131316", borderRadius: 12, padding: 24,
      border: "1px solid #1E1E22",
    }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "hsl(0 0% 94%)", marginBottom: 18 }}>
        Schutz &amp; Limits
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <LimitCard
          label="Max. gleichzeitige Chats"
          helper="Wie viele Conversations gleichzeitig aktiv sein dürfen"
        >
          <NumberBox
            value={lim.max_concurrent_chats}
            onChange={(n) => patch({ max_concurrent_chats: n })}
          />
        </LimitCard>

        <LimitCard
          label="Max. Nachrichten/Tag"
          helper="Begrenzt die täglichen AI-Antworten"
        >
          <NumberBox
            value={lim.max_messages_per_day}
            onChange={(n) => patch({ max_messages_per_day: n })}
          />
        </LimitCard>

        <LimitCard
          label="Min. Erfolgsquote %"
          helper="Auto-Pause wenn darunter über 24 h"
        >
          <NumberBox
            value={lim.min_success_pct}
            suffix="%"
            onChange={(n) => patch({ min_success_pct: n })}
          />
        </LimitCard>

        <LimitCard
          label="Auto-Pause"
          helper="Pausiert alle Conversations bei Unterschreitung"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <MiniToggle
              on={lim.auto_pause_low_performance}
              onToggle={() => patch({ auto_pause_low_performance: !lim.auto_pause_low_performance })}
            />
            <span style={{ fontSize: 12.5, color: "hsl(0 0% 78%)" }}>
              Bei niedriger Performance automatisch pausieren
            </span>
          </div>
        </LimitCard>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={save} disabled={saving} className="shex-btn shex-btn-primary">
          {saving ? "Speichere…" : "Speichern"}
        </button>
      </div>
    </section>
  );
}

function LimitCard({ label, helper, children }: {
  label: string; helper: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#18181D", borderRadius: 10, padding: 16,
      border: "1px solid #1E1E22", display: "flex", flexDirection: "column", gap: 10,
    }}>
      <span style={{
        fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.14em",
        fontWeight: 600, color: "hsl(0 0% 62%)",
      }}>{label}</span>
      {children}
      <span style={{ fontSize: 11.5, color: "hsl(0 0% 45%)", lineHeight: 1.5 }}>{helper}</span>
    </div>
  );
}

function NumberBox({ value, onChange, suffix }: {
  value: number; onChange: (n: number) => void; suffix?: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type="number"
        value={String(value)}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        style={{
          width: "100%", background: "#131316", border: "1px solid #1E1E22",
          borderRadius: 8, padding: "10px 12px", color: "hsl(0 0% 96%)",
          fontSize: 24, fontVariantNumeric: "tabular-nums", textAlign: "center",
          outline: "none",
        }}
      />
      {suffix && (
        <span style={{
          position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          fontSize: 14, color: "hsl(0 0% 50%)", pointerEvents: "none",
        }}>{suffix}</span>
      )}
    </div>
  );
}

function MiniToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Auto-Pause umschalten"
      onClick={onToggle}
      style={{
        width: 44, height: 24, borderRadius: 999, padding: 2,
        position: "relative", border: "none", flexShrink: 0, cursor: "pointer",
        background: on
          ? "linear-gradient(90deg, hsl(239 84% 62%), hsl(272 72% 60%))"
          : "#2A2A30",
        boxShadow: on ? "0 0 0 1px hsla(239,84%,62%,0.35), 0 6px 18px hsla(239,84%,62%,0.25)" : "none",
        transition: "background 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 22 : 2,
        width: 20, height: 20, borderRadius: 999, background: "#fff",
        boxShadow: "0 2px 6px hsla(0,0%,0%,0.35)",
        transition: "left 200ms cubic-bezier(0.34,1.56,0.64,1)",
      }} />
    </button>
  );
}
