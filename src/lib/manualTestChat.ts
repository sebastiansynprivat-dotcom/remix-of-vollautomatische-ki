import { supabase } from "@/integrations/supabase/client";

/**
 * Manueller Test-Chat pro Model-Profil.
 *
 * Ein fest angepinnter Chat, in dem der Betreiber selbst als Fan schreibt und
 * das Model vollautomatisch antwortet. Die Live-Simulation und Massen-Aktionen
 * (Master-Auto-Modus, Sim-Reset) fassen diesen Chat nie an — erkennbar an
 * `fans.external_ref = MANUAL_TEST_REF`.
 */
export const MANUAL_TEST_REF = "manual_test";

export const MANUAL_TEST_FAN_NAME = "Test-Chat (du)";

/** Legt den Test-Chat für ein Profil an, falls er noch nicht existiert. */
export async function ensureManualTestChat(modelId: string): Promise<string | null> {
  const { data: existingFan } = await supabase
    .from("fans")
    .select("id")
    .eq("model_id", modelId)
    .eq("external_ref", MANUAL_TEST_REF)
    .maybeSingle();

  let fanId = existingFan?.id ?? null;

  if (!fanId) {
    const { data: fan, error } = await supabase
      .from("fans")
      .insert({
        model_id: modelId,
        display_name: MANUAL_TEST_FAN_NAME,
        external_ref: MANUAL_TEST_REF,
        is_demo: true,
        status: "online",
      })
      .select("id")
      .single();
    if (error || !fan) return null;
    fanId = fan.id;
  }

  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("model_id", modelId)
    .eq("fan_id", fanId)
    .maybeSingle();
  if (existingConv?.id) return existingConv.id;

  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .insert({
      model_id: modelId,
      fan_id: fanId,
      is_autopilot: true,
      autopilot_enabled: true,
      last_message_preview: "Schreib hier als Fan — das Model antwortet automatisch.",
      last_message_at: new Date().toISOString(),
      last_message_from_model: false,
      unread_count: 0,
    })
    .select("id")
    .single();
  if (convError || !conv) return null;
  return conv.id;
}

/** IDs aller Test-Chat-Conversations eines Profils (für Massen-Aktionen ausschließen). */
export async function manualTestConversationIds(modelId: string): Promise<string[]> {
  const { data } = await supabase
    .from("conversations")
    .select("id, fans!inner(external_ref)")
    .eq("model_id", modelId)
    .eq("fans.external_ref", MANUAL_TEST_REF);
  return (data ?? []).map((r) => (r as { id: string }).id);
}
