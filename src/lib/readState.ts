// =========================================================================
// Lesestand — merkt pro Chat, bis wohin gelesen wurde (public.conversation_reads).
// Damit steigt man beim Öffnen genau bei der ersten ungelesenen Nachricht ein.
// =========================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const readByConv = new Map<string, string>();

export function getLastReadAt(convId: string): string | null {
  return readByConv.get(convId) ?? null;
}

/**
 * Liefert den Lesestand beim Öffnen des Chats (eingefroren, damit die
 * "Neu ab hier"-Linie beim Weiterlesen nicht wegspringt) plus markRead().
 */
export function useReadMarker(convId: string | null) {
  const [entryMarker, setEntryMarker] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!convId) { setEntryMarker(null); return; }
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("conversation_reads")
        .select("last_read_at")
        .eq("conversation_id", convId)
        .maybeSingle();
      if (cancelled) return;
      const at = data?.last_read_at ?? null;
      if (at) readByConv.set(convId, at);
      loadedFor.current = convId;
      setEntryMarker(at);
    })();

    return () => { cancelled = true; };
  }, [convId]);

  const markRead = useCallback(async (at?: string) => {
    if (!convId) return;
    const stamp = at ?? new Date().toISOString();
    readByConv.set(convId, stamp);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("conversation_reads")
      .upsert(
        { user_id: user.id, conversation_id: convId, last_read_at: stamp },
        { onConflict: "user_id,conversation_id" },
      );
    if (error) console.error("markRead failed", error);
    await supabase.from("conversations").update({ unread_count: 0 }).eq("id", convId);
  }, [convId]);

  return { entryMarker, markRead, ready: loadedFor.current === convId };
}
