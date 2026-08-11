import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_FUNNEL_STAGES, normalizeStepConfig, type FunnelStageConfig,
} from "@/lib/funnelConfig";

/**
 * Profil-eigene Stufen-Konfiguration.
 * Leer / nicht gesetzt → globale Standard-Stufen gelten.
 */
export function StepConfigEditor({ modelId, value, onSaved, onChange }: {
  modelId: string;
  value: unknown;
  onSaved?: (steps: FunnelStageConfig[] | null) => void;
  /** Wenn gesetzt: kein eigener Speichern-Button, Parent übernimmt Auto-Save. */
  onChange?: (steps: FunnelStageConfig[]) => void;
}) {
  const initial = useMemo(
    () => normalizeStepConfig(value) ?? DEFAULT_FUNNEL_STAGES.map(s => ({ ...s })),
    [value],
  );
  const [steps, setSteps] = useState<FunnelStageConfig[]>(initial);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) setSteps(initial);
    mounted.current = true;
  }, [initial]);

  const emit = (next: FunnelStageConfig[]) => {
    if (!onChange) return;
    const clean = normalizeStepConfig(next) ?? [];
    if (JSON.stringify(clean) !== JSON.stringify(normalizeStepConfig(value) ?? [])) onChange(clean);
  };


  const apply = (fn: (rs: FunnelStageConfig[]) => FunnelStageConfig[]) =>
    setSteps(rs => { const next = fn(rs); emit(next); return next; });

  const patch = (i: number, p: Partial<FunnelStageConfig>) =>
    apply(rs => rs.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  const removeAt = (i: number) =>
    apply(rs => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

  const addStep = () =>
    apply(rs => [...rs, {
      id: `s${Date.now()}`,
      label: `Stufe ${rs.length + 1}`,
      priceEur: (rs[rs.length - 1]?.priceEur ?? 0) + 10,
      minPriceEur: (rs[rs.length - 1]?.priceEur ?? 0) + 10,
      mediaType: rs[rs.length - 1]?.mediaType ?? "photo",
      intensity: Math.min(5, (rs[rs.length - 1]?.intensity ?? 1) + 1),
      minFanTurns: Math.min(20, (rs[rs.length - 1]?.minFanTurns ?? 8) + 2),
    }]);


  const drop = (target: number) => {
    apply(rs => {
      if (dragIdx === null || dragIdx === target) return rs;
      const next = [...rs];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(dragIdx < target ? target - 1 : target, 0, moved);
      return next;
    });
    setDragIdx(null);
    setOverIdx(null);
  };


  const resetToDefault = async () => {
    if (!confirm("Stufen wirklich auf den Standard zurücksetzen?")) return;
    const defaults = DEFAULT_FUNNEL_STAGES.map(s => ({ ...s }));
    setSteps(defaults);
    if (onChange) { onChange(defaults); return; }
    setSaving(true);
    const { error } = await supabase.from("model_profiles").update({ step_config: null } as never).eq("id", modelId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved?.(null);
    toast.success("Auf Standard zurückgesetzt");
  };


  const save = async () => {
    const clean = normalizeStepConfig(steps) ?? [];
    setSaving(true);
    const { error } = await supabase
      .from("model_profiles")
      .update({ step_config: clean } as never)
      .eq("id", modelId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setSteps(clean);
    onSaved?.(clean);
    toast.success("Stufen gespeichert");
  };

  return (
    <div style={{
      background: "#131316", border: "1px solid #1E1E22", borderRadius: 14, padding: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "hsl(0 0% 94%)" }}>
          Stufen-Konfiguration
        </h3>
        <button
          type="button" onClick={resetToDefault}
          style={{ fontSize: 12.5, color: "hsl(0 0% 58%)", background: "none", border: "none", cursor: "pointer", textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
        >
          Auf Standard zurücksetzen
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {steps.map((s, i) => (
          <div key={s.id}>
            {i > 0 && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <span style={{ width: 1, height: 16, background: "#2A2A30", display: "block" }} />
              </div>
            )}
            {overIdx === i && dragIdx !== null && dragIdx !== i && (
              <div style={{
                height: 64, borderRadius: 10, marginBottom: 8,
                background: "hsl(243 75% 59% / 0.10)", transition: "all .15s ease",
              }} />
            )}
            <div
              onDragOver={e => { e.preventDefault(); setOverIdx(i); }}
              onDrop={() => drop(i)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                background: "#18181D", border: "1px solid #1E1E22", borderRadius: 10, padding: 16,
                transition: "border-color .15s ease",
                opacity: dragIdx === i ? 0.4 : 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#2A2A30")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E1E22")}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 999, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(270 70% 58%))",
                color: "#fff", fontSize: 13, fontWeight: 600,
              }}>{i + 1}</div>

              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
                <FieldBox label="Label">
                  <input
                    value={s.label} placeholder="Einstieg"
                    onChange={e => patch(i, { label: e.target.value })}
                    onKeyDown={e => { if (e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                    style={inputStyle}
                  />
                </FieldBox>
                <FieldBox label="Betrag">
                  <div style={{ position: "relative" }}>
                    <input
                      type="number" min={0} value={s.priceEur}
                      onChange={e => patch(i, { priceEur: Number(e.target.value) })}
                      onFocus={e => (e.currentTarget.style.color = "hsl(42 60% 62%)")}
                      onBlur={e => (e.currentTarget.style.color = "hsl(0 0% 90%)")}
                      style={{ ...inputStyle, paddingRight: 24 }}
                    />
                    <span style={{ position: "absolute", right: 9, top: 8, fontSize: 12, color: "hsl(0 0% 45%)" }}>€</span>
                  </div>
                </FieldBox>
                <FieldBox label="Typ">
                  <select
                    value={s.mediaType}
                    onChange={e => patch(i, { mediaType: e.target.value === "video" ? "video" : "photo" })}
                    style={inputStyle}
                  >
                    <option value="photo">Foto</option>
                    <option value="video">Video</option>
                  </select>
                </FieldBox>
                <FieldBox label="Min. Interaktionen">
                  <input
                    type="number" min={1} max={20} value={s.minFanTurns}
                    onChange={e => patch(i, { minFanTurns: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </FieldBox>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 4 }} title={`Intensität ${s.intensity}/5`}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n} type="button" aria-label={`Intensität ${n}`}
                      onClick={() => patch(i, { intensity: n })}
                      style={{
                        width: 8, height: 8, borderRadius: 999, border: "none", cursor: "pointer", padding: 0,
                        background: n <= s.intensity ? "hsl(243 75% 59%)" : "#2A2A30",
                      }}
                    />
                  ))}
                </div>
                <span
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                  title="Zum Sortieren ziehen"
                  style={{ cursor: "grab", color: "hsl(0 0% 40%)", fontSize: 15, lineHeight: 1, userSelect: "none" }}
                >⠿</span>
                <button
                  type="button" onClick={() => removeAt(i)} aria-label="Stufe entfernen"
                  style={{ background: "none", border: "none", color: "hsl(0 0% 40%)", cursor: "pointer", fontSize: 14 }}
                >✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button" onClick={addStep}
        style={{
          width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 10,
          border: "1px dashed #2A2A30", background: "transparent",
          color: "hsl(0 0% 58%)", fontSize: 13, cursor: "pointer", transition: "border-color .15s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(243 75% 59% / 0.5)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#2A2A30")}
      >
        + Stufe hinzufügen
      </button>

      {!onChange && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button
            type="button" onClick={save} disabled={saving}
            style={{
              padding: "10px 22px", borderRadius: 999, border: "none", cursor: saving ? "default" : "pointer",
              background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(270 70% 58%))",
              color: "#fff", fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Speichere…" : "Speichern"}
          </button>
        </div>
      )}

    </div>
  );
}

function FieldBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <span style={{
        display: "block", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "hsl(0 0% 42%)", marginBottom: 5,
      }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 9px", borderRadius: 8, fontSize: 12.5,
  background: "#131316", border: "1px solid #1E1E22", color: "hsl(0 0% 90%)",
};
