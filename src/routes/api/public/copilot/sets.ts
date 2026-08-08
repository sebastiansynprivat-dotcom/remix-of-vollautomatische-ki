import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/copilot/sets")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { preflight } = await import("@/lib/copilot-auth.server");
        return preflight();
      },
      GET: async ({ request }) => {
        const { verifyCopilotKey, corsJson, jsonError } = await import(
          "@/lib/copilot-auth.server"
        );
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        try {
          const key = await verifyCopilotKey(request);
          const { data, error } = await supabaseAdmin
            .from("ppv_templates")
            .select(
              "id, title, caption, price_cents, media_type, media_count, cover_url, tags, asset_ids, times_sent, times_purchased",
            )
            .eq("model_id", key.model_id)
            .order("created_at", { ascending: false });
          if (error) throw error;
          const sets = (data ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            caption: s.caption,
            price_cents: s.price_cents,
            price_eur: (s.price_cents ?? 0) / 100,
            media_type: s.media_type,
            media_count: s.media_count,
            cover_url: s.cover_url,
            tags: s.tags ?? [],
            asset_count: Array.isArray(s.asset_ids) ? s.asset_ids.length : 0,
            times_sent: s.times_sent ?? 0,
            times_purchased: s.times_purchased ?? 0,
          }));
          return new Response(JSON.stringify({ ok: true, sets }), {
            headers: corsJson(),
          });
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
