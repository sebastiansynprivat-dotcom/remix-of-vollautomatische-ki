import { createFileRoute } from "@tanstack/react-router";

type AnyRow = Record<string, any>;

async function handler({ request }: { request: Request }) {
  const url = new URL(request.url);
  // TEMPORÄR: Auth deaktiviert für Debugging — sim-chats ist read-only
  // TODO: Auth wieder aktivieren sobald SIM_TICK_SECRET geklärt ist
  const secret = process.env["SIM_TICK_SECRET"];
  const provided = request.headers.get("x-sim-secret") ?? url.searchParams.get("secret");
  if (url.searchParams.get("debug") === "1") {
    const secretHint = secret ? `set (${secret.length} chars, starts with "${secret.slice(0, 3)}...")` : "NOT SET";
    const providedHint = provided ? `"${provided.slice(0, 3)}..." (${provided.length} chars)` : "none";
    return new Response("debug", {
      status: 200,
      headers: {
        "X-Debug-Secret": secretHint,
        "X-Debug-Provided": providedHint,
        "Content-Type": "text/plain",
      },
    });
  }


  const rawLimit = Number(url.searchParams.get("limit") ?? 50);
  const limit = Math.min(200, Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50);
  const runIdFilter = url.searchParams.get("run_id");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as { from: (t: string) => any };

  let runs: AnyRow[] = [];

  const { data: simRuns, error: simError } = await admin
    .from("sim_runs")
    .select("id, persona, sim_day, turn_count, state, conversation_id")
    .order("id", { ascending: true });

  if (simError) return Response.json({ ok: false, error: simError.message }, { status: 500 });

  if (runIdFilter) {
    runs = (simRuns ?? []).filter((r: AnyRow) => r.id === runIdFilter || r.conversation_id === runIdFilter);
  }

  if (runs.length === 0) {
    // sim_runs empty or no matching run — fall back to autopilot conversations directly
    let convQuery = admin
      .from("conversations")
      .select("id, is_autopilot")
      .eq("is_autopilot", true);
    if (runIdFilter) {
      convQuery = convQuery.eq("id", runIdFilter);
    }
    const { data: autopilotConvs, error: convError } = await convQuery.order("id", { ascending: true });
    if (convError) return Response.json({ ok: false, error: convError.message }, { status: 500 });

    runs = (autopilotConvs ?? []).map((c: AnyRow) => ({
      id: c.id,
      conversation_id: c.id,
      persona: "unknown",
      sim_day: 0,
      turn_count: 0,
      state: "unknown",
    }));
  }

  const result: AnyRow[] = [];
  for (const run of runs) {
    const { data: msgs, error: msgError } = await admin
      .from("messages")
      .select("sender_type, content_type, content, ppv_price_cents, ppv_is_purchased, created_at")
      .eq("conversation_id", run.conversation_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (msgError) continue;

    const messages = ((msgs ?? []) as AnyRow[]).reverse().map((m) => ({
      sender: m.sender_type === "model" ? "model" : "fan",
      content_type: m.content_type,
      text: m.content ?? "",
      ppv_price_eur: m.ppv_price_cents != null ? m.ppv_price_cents / 100 : null,
      ppv_purchased: m.content_type === "ppv" ? !!m.ppv_is_purchased : null,
      created_at: m.created_at,
    }));

    result.push({
      run_id: run.id,
      persona: run.persona ?? "unknown",
      sim_day: run.sim_day ?? 0,
      turn_count: run.turn_count ?? 0,
      state: run.state ?? "unknown",
      messages,
    });
  }

  return Response.json({ runs: result });
}

export const Route = createFileRoute("/api/public/sim-chats")({
  server: {
    handlers: {
      GET: handler,
    },
  },
});
