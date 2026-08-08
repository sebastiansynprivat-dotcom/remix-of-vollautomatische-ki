import { createFileRoute } from "@tanstack/react-router";

type AnyRow = Record<string, any>;

async function handler({ request }: { request: Request }) {
  const secret = process.env["SIM_TICK_SECRET"];
  const url = new URL(request.url);
  const provided = request.headers.get("x-sim-secret") ?? url.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rawLimit = Number(url.searchParams.get("limit") ?? 50);
  const limit = Math.min(200, Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50);
  const runIdFilter = url.searchParams.get("run_id");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as { from: (t: string) => any };

  let runQuery = admin
    .from("sim_runs")
    .select("id, persona, sim_day, turn_count, state, conversation_id");
  if (runIdFilter) {
    runQuery = runQuery.eq("id", runIdFilter);
  } else {
    runQuery = runQuery.neq("state", "completed");
  }
  const { data: runs, error: runError } = await runQuery.order("id", { ascending: true });
  if (runError) return Response.json({ ok: false, error: runError.message }, { status: 500 });

  const result: AnyRow[] = [];
  for (const run of (runs ?? []) as AnyRow[]) {
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
      persona: run.persona,
      sim_day: run.sim_day,
      turn_count: run.turn_count,
      state: run.state,
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
