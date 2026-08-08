import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { aggregate, TELEMETRY_COLUMNS, type StageRow, type PersonaRow, type TelemetryRow, type TelemetrySummary } from "@/lib/simTelemetry";

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

const EMPTY_SUMMARY: TelemetrySummary = {
  total_turns: 0, total_model_msgs: 0, total_fan_msgs: 0, total_purchases: 0,
  total_offers: 0, overall_conversion_pct: null, total_revenue_eur: 0,
  total_repetitions_dropped: 0, avg_msgs_per_turn: 0,
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: "hsla(0,0%,100%,0.03)",
      border: "1px solid hsla(0,0%,100%,0.06)",
      borderRadius: 10,
      padding: "12px 14px",
    }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--gold)", letterSpacing: -0.4 }}>{value}</div>
    </div>
  );
}

export function TelemetriePanel() {
  const [byStage, setByStage] = useState<StageRow[]>([]);
  const [byPersona, setByPersona] = useState<PersonaRow[]>([]);
  const [summary, setSummary] = useState<TelemetrySummary>(EMPTY_SUMMARY);
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
      setSummary(agg.summary);
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

      <div className="premium-card" style={{ padding: "20px 22px" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: "var(--text-strong)" }}>Gesamt</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
          <Metric label="Gesamte Turns" value={summary.total_turns} />
          <Metric label="Model-Nachrichten" value={summary.total_model_msgs} />
          <Metric label="Fan-Nachrichten" value={summary.total_fan_msgs} />
          <Metric label="Käufe" value={summary.total_purchases} />
          <Metric label="Angebote" value={summary.total_offers} />
          <Metric label="Konversion" value={summary.overall_conversion_pct == null ? "–" : `${summary.overall_conversion_pct} %`} />
          <Metric label="Umsatz" value={`${summary.total_revenue_eur.toFixed(2)} €`} />
          <Metric label="Wiederholungen verworfen" value={summary.total_repetitions_dropped} />
          <Metric label="Ø Nachrichten/Turn" value={summary.avg_msgs_per_turn} />
        </div>
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
