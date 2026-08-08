import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { aggregate, TELEMETRY_COLUMNS, type StageRow, type PersonaRow, type TelemetryRow } from "@/lib/simTelemetry";

const cell: React.CSSProperties = {
  border: "1px solid hsla(0,0%,100%,0.08)",
  padding: "7px 10px",
  textAlign: "left",
  fontSize: 13,
  color: "var(--text-strong)",
};
const head: React.CSSProperties = {
  ...cell,
  background: "hsla(40,30%,18%,0.3)",
  color: "var(--gold)",
  fontWeight: 700,
};

export function TelemetriePanel() {
  const [byStage, setByStage] = useState<StageRow[]>([]);
  const [byPersona, setByPersona] = useState<PersonaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sim_telemetry")
      .select(TELEMETRY_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      const agg = aggregate((data ?? []) as unknown as TelemetryRow[]);
      setByStage(agg.byStage);
      setByPersona(agg.byPersona);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--gold)", margin: 0 }}>Sim-Telemetrie</h2>
        <button
          onClick={() => void load()}
          style={{
            padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 7,
            background: "hsla(0,0%,100%,0.06)", color: "var(--text-strong)",
          }}
        >
          Aktualisieren
        </button>
        {loading && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>lädt…</span>}
        {error && <span style={{ fontSize: 12, color: "tomato" }}>{error}</span>}
      </div>

      <div className="premium-card" style={{ padding: "20px 22px", overflowX: "auto" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: "var(--text-strong)" }}>Pro Stufe</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={head}>Stufe</th>
              <th style={head}>Preis</th>
              <th style={head}>Angebote</th>
              <th style={head}>Käufe</th>
              <th style={head}>Konversion</th>
              <th style={head}>Ø Zeichen Model</th>
              <th style={head}>Ø Zeichen Fan</th>
              <th style={head}>Wiederholungen</th>
            </tr>
          </thead>
          <tbody>
            {byStage.length === 0 && !loading && (
              <tr><td style={cell} colSpan={8}>Noch keine Daten.</td></tr>
            )}
            {byStage.map((r) => (
              <tr key={`${r.offer_no}-${r.price_eur}`}>
                <td style={cell}>{r.offer_no ?? "–"}</td>
                <td style={cell}>{r.price_eur == null ? "–" : `${r.price_eur.toFixed(2)} €`}</td>
                <td style={cell}>{r.total_offers}</td>
                <td style={cell}>{r.purchases}</td>
                <td style={cell}>{r.conversion_pct == null ? "–" : `${r.conversion_pct} %`}</td>
                <td style={cell}>{r.avg_model_chars}</td>
                <td style={cell}>{r.avg_fan_chars}</td>
                <td style={cell}>{r.total_repetitions_dropped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="premium-card" style={{ padding: "20px 22px", overflowX: "auto" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: "var(--text-strong)" }}>Pro Persona</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={head}>Persona</th>
              <th style={head}>Turns</th>
              <th style={head}>Käufe</th>
              <th style={head}>Wiederholungen</th>
            </tr>
          </thead>
          <tbody>
            {byPersona.length === 0 && !loading && (
              <tr><td style={cell} colSpan={4}>Noch keine Daten.</td></tr>
            )}
            {byPersona.map((r) => (
              <tr key={r.persona}>
                <td style={cell}>{r.persona}</td>
                <td style={cell}>{r.turns}</td>
                <td style={cell}>{r.purchases}</td>
                <td style={cell}>{r.total_repetitions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
