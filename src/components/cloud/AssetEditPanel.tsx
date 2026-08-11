// Seitenansicht zum Bearbeiten eines Mediums — speichert automatisch.
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useResolvedUrl, type ModelAsset } from "@/lib/modelAssets";
import { getFunnelStages, stepIndexForValueCents, type FunnelStageConfig } from "@/lib/funnelConfig";

const FIELD: React.CSSProperties = {
  width: "100%", background: "#0A0A0B", border: "1px solid #1E1E22",
  borderRadius: 10, padding: "9px 12px", color: "var(--text-strong)",
  fontSize: 13, outline: "none", resize: "vertical",
};
const LBL: React.CSSProperties = {
  fontSize: 10.5, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: 0.6,
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function AssetEditPanel({ asset, steps, onClose, onSaved }: {
  asset: ModelAsset;
  /** Stufen des Models — Preis kommt aus der gewählten Stufe. */
  steps?: FunnelStageConfig[];
  onClose: () => void;
  onSaved: (patch: Partial<ModelAsset>) => void;
}) {
  const stages = steps && steps.length > 0 ? steps : getFunnelStages();
  const thumb = useResolvedUrl(asset.thumbnail_url ?? asset.url);
  const [description, setDescription] = useState(asset.description ?? "");
  const [stepIdx, setStepIdx] = useState(
    Math.max(0, stepIndexForValueCents(stages, asset.value_cents ?? 0) - 1),
  );
  const [state, setState] = useState<SaveState>("idle");
  const stage = stages[Math.min(stepIdx, stages.length - 1)] ?? stages[0];

  const assetId = asset.id;
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wechsel des Mediums: Felder neu laden, keinen Autosave auslösen.
  useEffect(() => {
    dirty.current = false;
    setDescription(asset.description ?? "");
    setStepIdx(Math.max(0, stepIndexForValueCents(stages, asset.value_cents ?? 0) - 1));
    setState("idle");
  }, [assetId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty.current) return;
    if (asset.is_placeholder) return;
    if (timer.current) clearTimeout(timer.current);
    setState("saving");
    timer.current = setTimeout(async () => {
      const patch = {
        description: description.trim() || null,
        value_cents: Math.max(0, Math.round((stage?.priceEur ?? 0) * 100)),
        tier: stage?.intensity ?? 1,
      };
      const { error } = await supabase.from("model_assets").update(patch as never).eq("id", assetId);
      if (error) { setState("error"); toast.error(error.message); return; }
      setState("saved");
      onSaved(patch as Partial<ModelAsset>);
    }, 900);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [description, stepIdx, assetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const touch = <T,>(setter: (v: T) => void) => (v: T) => { dirty.current = true; setter(v); };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60,
      }} />
      <aside style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px, 92vw)", zIndex: 61,
        background: "#131316", borderLeft: "1px solid #1E1E22", padding: 20,
        display: "flex", flexDirection: "column", gap: 16, overflowY: "auto",
        animation: "sbSlideInRight 200ms ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>Medium bearbeiten</div>
          <button onClick={onClose} aria-label="Schließen" style={{
            background: "transparent", border: "none", color: "var(--text-subtle)", cursor: "pointer", fontSize: 18,
          }}>×</button>
        </div>

        <div style={{
          width: "100%", aspectRatio: "4 / 3", borderRadius: 12, overflow: "hidden",
          background: "#0A0A0B", display: "grid", placeItems: "center", color: "var(--text-subtle)",
        }}>
          {thumb
            ? (asset.media_type === "video"
              ? <video src={thumb} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />)
            : <span style={{ fontSize: 12 }}>Keine Vorschau</span>}
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={LBL}>Titel / Beschreibung</span>
          <textarea rows={3} value={description} onChange={(e) => touch(setDescription)(e.target.value)}
            placeholder="Beschreibe was im Bild oder Video zu sehen ist" style={FIELD} />
        </label>

        <div style={{ display: "grid", gap: 8 }}>
          <span style={LBL}>Stufe</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {stages.map((st, i) => {
              const active = i === Math.min(stepIdx, stages.length - 1);
              return (
                <button key={st.id} onClick={() => touch(setStepIdx)(i)} title={st.label} style={{
                  padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 11.5, fontWeight: 600,
                  color: active ? "#fff" : "var(--text-subtle)",
                  background: active ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "transparent",
                  border: `1px solid ${active ? "transparent" : "#1E1E22"}`,
                }}>{i + 1} · {st.priceEur === 0 ? "gratis" : `${st.priceEur} €`}</button>
              );
            })}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>
            {stage?.label} — Preis {stage?.priceEur === 0 ? "gratis" : `${stage?.priceEur} €`}
            {stage && stage.minPriceEur < stage.priceEur ? ` · Rabatt bis ${stage.minPriceEur} €` : " · kein Rabatt"}
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: state === "error" ? "var(--danger, #ef4444)" : "var(--text-subtle)" }}>
          {asset.is_placeholder
            ? "Beispiel-Medium — Änderungen werden nicht gespeichert."
            : state === "saving" ? "Speichert…"
            : state === "saved" ? "✓ Automatisch gespeichert"
            : state === "error" ? "Speichern fehlgeschlagen"
            : "Änderungen werden automatisch gespeichert."}
        </div>
      </aside>
    </>
  );
}
