import { createFileRoute } from "@tanstack/react-router";

type Row = {
  offer_no: number | null;
  offer_price_cents: number | null;
  offer_purchased: boolean | null;
  model_total_chars: number | null;
  fan_total_chars: number | null;
  repetition_dropped: number | null;
  persona: string | null;
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

export function aggregate(rows: Row[]): { byStage: StageRow[]; byPersona: PersonaRow[] } {
  const stages = new Map<string, Row[]>();
  const personas = new Map<string, Row[]>();
  for (const r of rows) {
    const sk = `${r.offer_no ?? "-"}|${r.offer_price_cents ?? "-"}`;
    stages.set(sk, [...(stages.get(sk) ?? []), r]);
    const pk = r.persona ?? "-";
    personas.set(pk, [...(personas.get(pk) ?? []), r]);
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;

  const byStage: StageRow[] = [...stages.values()].map((group) => {
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
  }).sort((a, b) => (a.offer_no ?? 0) - (b.offer_no ?? 0));

  const byPersona: PersonaRow[] = [...personas.entries()].map(([persona, group]) => ({
    persona,
    turns: group.length,
    purchases: group.filter((r) => r.offer_purchased === true).length,
    total_repetitions: group.reduce((s, r) => s + (r.repetition_dropped ?? 0), 0),
  })).sort((a, b) => b.turns - a.turns);

  return { byStage, byPersona };
}

async function handler({ request }: { request: Request }) {
  const secret = process.env["SIM_TICK_SECRET"];
  const url = new URL(request.url);
  const provided = request.headers.get("x-sim-secret") ?? url.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as unknown as { from: (t: string) => any })
    .from("sim_telemetry")
    .select("offer_no, offer_price_cents, offer_purchased, model_total_chars, fan_total_chars, repetition_dropped, persona")
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json(aggregate((data ?? []) as Row[]));
}

export const Route = createFileRoute("/api/public/sim-telemetry")({
  server: {
    handlers: {
      GET: handler,
    },
  },
});
