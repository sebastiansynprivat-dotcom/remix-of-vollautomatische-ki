import { createFileRoute } from "@tanstack/react-router";
import { aggregate, TELEMETRY_COLUMNS, type TelemetryRow } from "@/lib/simTelemetry";

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
    .select(TELEMETRY_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json(aggregate((data ?? []) as TelemetryRow[]));
}

export const Route = createFileRoute("/api/public/sim-telemetry")({
  server: {
    handlers: {
      GET: handler,
    },
  },
});
