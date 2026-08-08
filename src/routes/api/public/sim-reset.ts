import { createFileRoute } from "@tanstack/react-router";

const PERSONAS = [
  "never_buyer",
  "whale_all",
  "dirty_talker",
  "bonder",
  "bargain_hunter",
  "skeptic",
  "shy_quiet",
  "chaos_burster",
  "ghoster",
  "starter_buyer",
] as const;

const FAN_NAMES = [
  "Lukas M.", "Ben W.", "Nico F.", "Erik H.", "Paul S.",
  "Tim R.", "Jan K.", "Leon B.", "Max D.", "Felix G.",
];

type AnyRow = Record<string, any>;

async function handler({ request }: { request: Request }) {
  const url = new URL(request.url);
  const secret = process.env["SIM_TICK_SECRET"];
  const provided = request.headers.get("x-sim-secret") ?? url.searchParams.get("secret");
  if (secret && provided !== secret) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as { from: (t: string) => any };

  // 0) Referenzen der bestehenden Sim-Runs einsammeln
  const { data: runs, error: runsError } = await admin
    .from("sim_runs")
    .select("id, conversation_id, persona");
  if (runsError) return Response.json({ ok: false, error: runsError.message }, { status: 500 });

  const runRows = (runs ?? []) as AnyRow[];
  const convIds = runRows.map(r => r.conversation_id).filter(Boolean);

  let convRows: AnyRow[] = [];
  if (convIds.length > 0) {
    const { data } = await admin
      .from("conversations")
      .select("id, model_id, fan_id")
      .in("id", convIds);
    convRows = (data ?? []) as AnyRow[];
  }
  const fanIds = convRows.map(c => c.fan_id).filter(Boolean);

  // 1) Telemetrie löschen
  const { count: telemetryCount } = await admin
    .from("sim_telemetry")
    .delete({ count: "exact" })
    .not("id", "is", null);

  // 2) Nachrichten der Sim-Konversationen löschen
  let messagesCount = 0;
  if (convIds.length > 0) {
    const { count } = await admin
      .from("messages")
      .delete({ count: "exact" })
      .in("conversation_id", convIds);
    messagesCount = count ?? 0;
  }

  // 3) Fan-Brain der Sim-Fans löschen
  let brainsCount = 0;
  if (fanIds.length > 0) {
    const { count } = await admin
      .from("fan_brain")
      .delete({ count: "exact" })
      .in("fan_id", fanIds);
    brainsCount = count ?? 0;
  }

  // 4) Konversationen zurücksetzen
  if (convIds.length > 0) {
    await admin
      .from("conversations")
      .update({
        last_message_preview: null,
        unread_count: 0,
        last_message_from_model: false,
        last_message_at: new Date().toISOString(),
      })
      .in("id", convIds);
  }

  // 5) Sim-Runs löschen
  const { count: runsCount } = await admin
    .from("sim_runs")
    .delete({ count: "exact" })
    .not("id", "is", null);

  // 6) Ziel-Model bestimmen
  let modelId: string | null = convRows.find(c => c.model_id)?.model_id ?? null;
  if (!modelId) {
    const { data: models } = await admin.from("model_profiles").select("id").limit(1);
    modelId = ((models ?? []) as AnyRow[])[0]?.id ?? null;
  }
  if (!modelId) {
    return Response.json({ ok: false, error: "Kein Model-Profil vorhanden" }, { status: 400 });
  }

  // 7) Konversationen für die 10 Personas bereitstellen
  const usable = convRows.filter(c => c.model_id === modelId).map(c => c.id as string);
  const targetConvIds: string[] = [...usable];

  for (let i = targetConvIds.length; i < PERSONAS.length; i++) {
    const { data: fan, error: fanError } = await admin
      .from("fans")
      .insert({ model_id: modelId, display_name: FAN_NAMES[i] ?? `Sim-Fan ${i + 1}`, is_demo: true })
      .select("id")
      .single();
    if (fanError) return Response.json({ ok: false, error: fanError.message }, { status: 500 });

    const { data: conv, error: convError } = await admin
      .from("conversations")
      .insert({ model_id: modelId, fan_id: (fan as AnyRow).id, is_autopilot: true })
      .select("id")
      .single();
    if (convError) return Response.json({ ok: false, error: convError.message }, { status: 500 });

    targetConvIds.push((conv as AnyRow).id);
  }

  // 8) 10 frische Sim-Runs anlegen
  const nowIso = new Date().toISOString();
  const rows = PERSONAS.map((persona, i) => ({
    conversation_id: targetConvIds[i],
    persona,
    state: "running",
    sim_day: 1,
    turn_count: 0,
    session_turn: 0,
    phase: "active",
    purchases_in_session: 0,
    max_sim_days: 14,
    last_followup_day: 0,
    gap_hours: 0,
    next_run_at: nowIso,
    started_at: nowIso,
    locked_at: null,
  }));

  const { error: insertError } = await admin.from("sim_runs").insert(rows);
  if (insertError) return Response.json({ ok: false, error: insertError.message }, { status: 500 });

  return Response.json({
    ok: true,
    deleted: {
      messages: messagesCount,
      telemetry: telemetryCount ?? 0,
      brains: brainsCount,
      runs: runsCount ?? runRows.length,
    },
    created: rows.length,
  });
}

export const Route = createFileRoute("/api/public/sim-reset")({
  server: {
    handlers: {
      POST: handler,
    },
  },
});
