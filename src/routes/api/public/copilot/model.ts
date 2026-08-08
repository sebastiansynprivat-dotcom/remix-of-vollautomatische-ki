import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/copilot/model")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { preflight } = await import("@/lib/copilot-auth.server");
        return preflight();
      },
      GET: async ({ request }) => {
        const { verifyCopilotKey, corsJson, jsonError, httpError } = await import(
          "@/lib/copilot-auth.server"
        );
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        try {
          const key = await verifyCopilotKey(request);
          const { data, error } = await supabaseAdmin
            .from("model_profiles")
            .select(
              "id, display_name, handle, avatar_url, bio, age, birthday, job, location, relationship_status, hobbies, languages, fun_facts, persona, tone_of_voice, writing_style, dos, donts",
            )
            .eq("id", key.model_id)
            .maybeSingle();
          if (error) throw httpError(500, "model_lookup_failed", error.message);
          if (!data) throw httpError(404, "model_not_found");
          return new Response(JSON.stringify({ ok: true, model: data }), {
            headers: corsJson(),
          });
        } catch (e) {
          return jsonError(e);
        }
      },
    },
  },
});
