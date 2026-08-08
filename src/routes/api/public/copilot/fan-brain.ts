import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const factsSchema = z
  .object({
    name: z.string().max(120).optional(),
    age: z.union([z.number().int().min(0).max(150), z.string().max(10)]).optional(),
    job: z.string().max(200).optional(),
    location: z.string().max(200).optional(),
    relationship_status: z.string().max(120).optional(),
    kinks: z.array(z.string().max(120)).max(40).optional(),
    turn_offs: z.array(z.string().max(120)).max(40).optional(),
    hobbies: z.array(z.string().max(120)).max(40).optional(),
    inside_jokes: z.array(z.string().max(200)).max(40).optional(),
    other: z.array(z.string().max(200)).max(40).optional(),
  })
  .partial();

const postSchema = z.object({
  external_ref: z.string().min(1).max(200),
  display_name: z.string().min(1).max(200).optional(),
  notes: z.string().max(4000).optional(),
  facts: factsSchema.optional(),
});

export const Route = createFileRoute("/api/public/copilot/fan-brain")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { preflight } = await import("@/lib/copilot-auth.server");
        return preflight();
      },
      GET: async ({ request }) => {
        const {
          verifyCopilotKey,
          corsJson,
          jsonError,
          httpError,
        } = await import("@/lib/copilot-auth.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        try {
          const key = await verifyCopilotKey(request);
          const url = new URL(request.url);
          const ext = url.searchParams.get("external_ref")?.trim();
          if (!ext) throw httpError(400, "missing_external_ref");

          const { data: model } = await supabaseAdmin
            .from("model_profiles")
            .select(
              "id, display_name, handle, avatar_url, bio, age, birthday, job, location, relationship_status, hobbies, languages, fun_facts, persona, tone_of_voice, writing_style, dos, donts",
            )
            .eq("id", key.model_id)
            .maybeSingle();

          const { data: fan } = await supabaseAdmin
            .from("fans")
            .select("id, display_name")
            .eq("model_id", key.model_id)
            .eq("external_ref", ext)
            .maybeSingle();
          if (!fan) {
            return new Response(
              JSON.stringify({ ok: true, model, fan: null, brain: null }),
              { headers: corsJson() },
            );
          }
          const { data: brain } = await supabaseAdmin
            .from("fan_brain")
            .select("identity, preferences, relationship, notes_freeform, confidence, updated_at")
            .eq("fan_id", fan.id)
            .maybeSingle();
          return new Response(JSON.stringify({ ok: true, model, fan, brain }), {
            headers: corsJson(),
          });
        } catch (e) {
          return jsonError(e);
        }
      },
      POST: async ({ request }) => {
        const {
          verifyCopilotKey,
          corsJson,
          jsonError,
          httpError,
          mergeStringArrays,
        } = await import("@/lib/copilot-auth.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        try {
          const key = await verifyCopilotKey(request);
          const raw = await request.text();
          if (raw.length > 16_000) throw httpError(413, "payload_too_large");
          const json = JSON.parse(raw);
          const body = postSchema.parse(json);

          // Upsert fan on (model_id, external_ref)
          const display = body.display_name || body.facts?.name || body.external_ref;
          const { data: upsertedFan, error: fanErr } = await supabaseAdmin
            .from("fans")
            .upsert(
              {
                model_id: key.model_id,
                external_ref: body.external_ref,
                display_name: display,
              },
              { onConflict: "model_id,external_ref" },
            )
            .select("id")
            .single();
          if (fanErr || !upsertedFan) throw httpError(500, "fan_upsert_failed", fanErr?.message);

          const fanId = upsertedFan.id;

          // Read current brain (trigger seeds a row on fan insert)
          const { data: existing } = await supabaseAdmin
            .from("fan_brain")
            .select("identity, preferences, relationship, notes_freeform")
            .eq("fan_id", fanId)
            .maybeSingle();

          const facts = body.facts ?? {};
          const idIn = (existing?.identity as Record<string, unknown> | null) ?? {};
          const prefIn = (existing?.preferences as Record<string, unknown> | null) ?? {};
          const relIn = (existing?.relationship as Record<string, unknown> | null) ?? {};

          const nextIdentity: Record<string, unknown> = { ...idIn };
          for (const k of ["name", "age", "job", "location", "relationship_status"] as const) {
            const v = facts[k];
            if (v != null && v !== "" && (idIn[k] == null || idIn[k] === "")) {
              nextIdentity[k] = v;
            }
          }
          const nextPrefs: Record<string, unknown> = {
            ...prefIn,
            kinks: mergeStringArrays(prefIn.kinks, facts.kinks),
            turn_offs: mergeStringArrays(prefIn.turn_offs, facts.turn_offs),
            content_format_pref: prefIn.content_format_pref ?? [],
          };
          const nextRel: Record<string, unknown> = {
            ...relIn,
            inside_jokes: mergeStringArrays(relIn.inside_jokes, facts.inside_jokes),
            hobbies: mergeStringArrays((relIn as { hobbies?: unknown }).hobbies, facts.hobbies),
          };
          const otherNote = (facts.other ?? []).filter(Boolean).join("\n• ");
          const incomingNotes = [body.notes?.trim(), otherNote ? "• " + otherNote : ""]
            .filter(Boolean)
            .join("\n");
          const mergedNotes = [existing?.notes_freeform?.trim(), incomingNotes.trim()]
            .filter(Boolean)
            .join("\n---\n")
            .slice(0, 16000);

          const { error: upErr } = await supabaseAdmin
            .from("fan_brain")
            .upsert(
              {
                fan_id: fanId,
                model_id: key.model_id,
                identity: nextIdentity as never,
                preferences: nextPrefs as never,
                relationship: nextRel as never,
                notes_freeform: mergedNotes || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "fan_id" },
            );
          if (upErr) throw httpError(500, "brain_upsert_failed", upErr.message);

          return new Response(
            JSON.stringify({
              ok: true,
              fan_id: fanId,
              brain: {
                identity: nextIdentity,
                preferences: nextPrefs,
                relationship: nextRel,
                notes_freeform: mergedNotes || null,
              },
            }),
            { headers: corsJson() },
          );
        } catch (e) {
          if (e instanceof z.ZodError) {
            const { jsonError, httpError } = await import("@/lib/copilot-auth.server");
            return jsonError(httpError(400, "invalid_body", e.flatten()));
          }
          const { jsonError } = await import("@/lib/copilot-auth.server");
          return jsonError(e);
        }
      },
    },
  },
});
