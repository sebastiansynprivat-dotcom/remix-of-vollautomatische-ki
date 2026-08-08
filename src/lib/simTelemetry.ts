export type TelemetryRow = {
  offer_no: number | null;
  offer_price_cents: number | null;
  offer_purchased: boolean | null;
  model_msg_count: number | null;
  fan_msg_count: number | null;
  model_total_chars: number | null;
  fan_total_chars: number | null;
  repetition_dropped: number | null;
  persona: string | null;
};

export type TelemetrySummary = {
  total_turns: number;
  total_model_msgs: number;
  total_fan_msgs: number;
  total_purchases: number;
  total_offers: number;
  overall_conversion_pct: number | null;
  total_revenue_eur: number;
  total_repetitions_dropped: number;
  avg_msgs_per_turn: number;
};

export type StageRow = {
  offer_no: number | null;
  price_eur: number | null;
  total_offers: number;
  purchases: number;
  conversion_pct: number | null;
  avg_model_chars: number;
  avg_fan_chars: number;
  total_repetitions_dropped: number;
};

export type PersonaRow = {
  persona: string;
  turns: number;
  purchases: number;
  total_repetitions: number;
};

/** Aggregiert Roh-Telemetrie zu Stufen- und Persona-Auswertung. */
export function aggregate(rows: TelemetryRow[]): { byStage: StageRow[]; byPersona: PersonaRow[] } {
  const stages = new Map<string, TelemetryRow[]>();
  const personas = new Map<string, TelemetryRow[]>();
  for (const r of rows) {
    const sk = `${r.offer_no ?? "-"}|${r.offer_price_cents ?? "-"}`;
    stages.set(sk, [...(stages.get(sk) ?? []), r]);
    const pk = r.persona ?? "-";
    personas.set(pk, [...(personas.get(pk) ?? []), r]);
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;

  const byStage: StageRow[] = [...stages.values()]
    .map((group) => {
      const total = group.length;
      const purchases = group.filter((r) => r.offer_purchased === true).length;
      return {
        offer_no: group[0].offer_no,
        price_eur: group[0].offer_price_cents == null ? null : group[0].offer_price_cents / 100,
        total_offers: total,
        purchases,
        conversion_pct: total ? round1((100 * purchases) / total) : null,
        avg_model_chars: Math.round(group.reduce((s, r) => s + (r.model_total_chars ?? 0), 0) / (total || 1)),
        avg_fan_chars: Math.round(group.reduce((s, r) => s + (r.fan_total_chars ?? 0), 0) / (total || 1)),
        total_repetitions_dropped: group.reduce((s, r) => s + (r.repetition_dropped ?? 0), 0),
      };
    })
    .sort((a, b) => (a.offer_no ?? 0) - (b.offer_no ?? 0));

  const byPersona: PersonaRow[] = [...personas.entries()]
    .map(([persona, group]) => ({
      persona,
      turns: group.length,
      purchases: group.filter((r) => r.offer_purchased === true).length,
      total_repetitions: group.reduce((s, r) => s + (r.repetition_dropped ?? 0), 0),
    }))
    .sort((a, b) => b.turns - a.turns);

  return { byStage, byPersona };
}

export const TELEMETRY_COLUMNS =
  "offer_no, offer_price_cents, offer_purchased, model_total_chars, fan_total_chars, repetition_dropped, persona";
