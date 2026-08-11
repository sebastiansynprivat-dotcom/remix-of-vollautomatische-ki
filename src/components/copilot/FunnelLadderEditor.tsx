import { useEffect, useState } from "react";
import {
  getFunnelStages, setFunnelStages, resetFunnelStages, subscribeFunnelStages,
  type FunnelStageConfig,
} from "@/lib/funnelConfig";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "6px 8px", borderRadius: 8, fontSize: 12,
  background: "color-mix(in oklab, var(--fg) 6%, transparent)",
  border: "1px solid color-mix(in oklab, var(--fg) 14%, transparent)",
  color: "var(--fg)",
};

/** Von dir gepflegte Stufen-Liste: Label, Preis, Medientyp, Intensität, Aufbau. */
export function FunnelLadderEditor({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<FunnelStageConfig[]>(() => getFunnelStages().map(s => ({ ...s })));

  useEffect(() => subscribeFunnelStages(() => setRows(getFunnelStages().map(s => ({ ...s })))), []);

  const patch = (i: number, p: Partial<FunnelStageConfig>) =>
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  const move = (i: number, dir: -1 | 1) =>
    setRows(rs => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = () => { setFunnelStages(rows); onClose(); };

  return (
    <div
      role="dialog"
      aria-label="Verkaufs-Stufen"
      style={{
        position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center",
        background: "hsla(0,0%,0%,0.55)", backdropFilter: "blur(4px)", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(760px, 100%)", maxHeight: "84vh", overflow: "auto",
          background: "var(--bg-elev, var(--bg))", color: "var(--fg)",
          border: "1px solid color-mix(in oklab, var(--accent) 24%, transparent)",
          borderRadius: 16, padding: 18,
          boxShadow: "0 24px 60px hsla(0,0%,0%,0.5)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>Verkaufs-Stufen</h2>
        <p style={{ margin: "6px 0 14px", fontSize: 11.5, opacity: 0.7, lineHeight: 1.5 }}>
          Reihenfolge = Ablauf der Angebote. Der Auto-Pilot geht pro Angebot maximal eine Intensitäts-Stufe
          weiter; größere Sprünge brauchen doppelten Aufbau. Vor jedem Angebot kommt eine Brücken-Nachricht.
        </p>

        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(140px,1fr) 78px 92px 74px 88px auto",
                gap: 8, alignItems: "center",
                padding: 8, borderRadius: 10,
                background: "color-mix(in oklab, var(--fg) 4%, transparent)",
              }}
            >
              <input
                aria-label={`Label Stufe ${i + 1}`} style={inputStyle} value={r.label}
                onChange={e => patch(i, { label: e.target.value })}
              />
              <input
                aria-label={`Preis Stufe ${i + 1}`} type="number" min={0} step={1} style={inputStyle}
                value={r.priceEur} onChange={e => patch(i, { priceEur: Number(e.target.value) })}
              />
              <select
                aria-label={`Medientyp Stufe ${i + 1}`} style={inputStyle} value={r.mediaType}
                onChange={e => patch(i, { mediaType: e.target.value === "video" ? "video" : "photo" })}
              >
                <option value="photo">Foto</option>
                <option value="video">Video</option>
              </select>
              <input
                aria-label={`Intensität Stufe ${i + 1}`} type="number" min={1} max={5} style={inputStyle}
                value={r.intensity} onChange={e => patch(i, { intensity: Number(e.target.value) })}
              />
              <input
                aria-label={`Aufbau Stufe ${i + 1}`} type="number" min={1} max={20} style={inputStyle}
                value={r.minFanTurns} onChange={e => patch(i, { minFanTurns: Number(e.target.value) })}
              />
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => move(i, -1)} aria-label="Nach oben" style={miniBtn}>↑</button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Nach unten" style={miniBtn}>↓</button>
                <button
                  type="button" aria-label="Stufe entfernen" style={miniBtn}
                  onClick={() => setRows(rs => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs))}
                >✕</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, fontSize: 10.5, opacity: 0.55, margin: "8px 2px 16px" }}>
          <span>Label</span><span>Preis €</span><span>Medium</span><span>Intensität 1–5</span><span>Aufbau (Fan-Nachrichten)</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button" style={ghostBtn}
              onClick={() => setRows(rs => [...rs, {
                id: `s${Date.now()}`, label: `Stufe ${rs.length + 1}`,
                priceEur: (rs[rs.length - 1]?.priceEur ?? 0) + 10,
                minPriceEur: (rs[rs.length - 1]?.priceEur ?? 0) + 10,

                mediaType: rs[rs.length - 1]?.mediaType ?? "photo",
                intensity: Math.min(5, (rs[rs.length - 1]?.intensity ?? 1) + 1),
                minFanTurns: (rs[rs.length - 1]?.minFanTurns ?? 4) + 1,
              }])}
            >+ Stufe</button>
            <button type="button" style={ghostBtn} onClick={() => resetFunnelStages()}>Zurücksetzen</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={ghostBtn} onClick={onClose}>Abbrechen</button>
            <button type="button" style={goldBtn} onClick={save}>Speichern</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 8, cursor: "pointer",
  background: "color-mix(in oklab, var(--fg) 8%, transparent)",
  border: "1px solid color-mix(in oklab, var(--fg) 14%, transparent)",
  color: "var(--fg)", fontSize: 12, lineHeight: 1,
};

const ghostBtn: React.CSSProperties = {
  padding: "7px 13px", borderRadius: 999, cursor: "pointer", fontSize: 11.5, fontWeight: 600,
  background: "transparent", color: "var(--fg)",
  border: "1px solid color-mix(in oklab, var(--fg) 18%, transparent)",
};

const goldBtn: React.CSSProperties = {
  padding: "7px 15px", borderRadius: 999, cursor: "pointer", fontSize: 11.5, fontWeight: 700,
  background: "var(--accent)", color: "var(--bg)", border: "none",
  boxShadow: "0 6px 18px hsla(40,55%,55%,0.3)",
};
