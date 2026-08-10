import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ModelProfile, Conversation, Message } from "@/data/mockData";
import { ingestCloudMessages, registerCloudConversations } from "@/lib/chatStore";

/**
 * Loads all model profiles (admin-only app).
 * Maps DB rows → ModelProfile shape consumed by Sidebar/ConversationList.
 */
export function useAssignedModels(): { models: ModelProfile[]; loading: boolean; reload: () => void } {
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setModels([]);
      setLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from("model_profiles")
      .select("id,display_name,handle,avatar_url,subscribers,is_flex");

    // Sum unread per model for badges
    const { data: convs } = await supabase
      .from("conversations")
      .select("model_id,unread_count");
    const unreadByModel = new Map<string, number>();
    (convs ?? []).forEach((c) => {
      unreadByModel.set(c.model_id, (unreadByModel.get(c.model_id) ?? 0) + (c.unread_count ?? 0));
    });
    const mapped: ModelProfile[] = (rows ?? []).map((r) => ({
      id: r.id,
      displayName: r.display_name,
      handle: r.handle.startsWith("@") ? r.handle : `@${r.handle}`,
      avatarUrl: r.avatar_url ?? "",
      subscribers: r.subscribers ?? 0,
      unread: unreadByModel.get(r.id) ?? 0,
      isFlex: r.is_flex ?? false,
    }));
    setModels(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { models, loading, reload: load };
}

/**
 * Loads conversations for one model, mapped to the legacy Conversation shape.
 * Subscribes to realtime updates on `conversations` rows for this model.
 */
export function useConversationsForModel(modelId: string | null): Conversation[] {
  const [convs, setConvs] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!modelId) { setConvs([]); return; }
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("conversations")
        .select(`
          id, model_id, fan_id, last_message_preview, last_message_at,
          last_message_from_model, unread_count, is_autopilot, autopilot_enabled,
          fans!inner(id, display_name, status, total_spent_cents, tip_volume_cents)
        `)
        .eq("model_id", modelId)
        .order("last_message_at", { ascending: false });
      if (cancelled) return;
      const mapped: Conversation[] = (data ?? []).map((c: any) => ({
        id: c.id,
        profileId: c.model_id,
        participant: {
          id: c.fans.id,
          displayName: c.fans.display_name,
          avatarUrl: null,
          status: c.fans.status,
        },
        lastMessage: {
          content: c.last_message_preview ?? "",
          createdAt: c.last_message_at,
          fromMe: c.last_message_from_model,
        },
        unreadCount: c.unread_count ?? 0,
        tipVolume: c.fans.tip_volume_cents ?? 0,
        totalSpent: c.fans.total_spent_cents ?? 0,
        isAutopilot: !!c.is_autopilot,
        autopilotEnabled: c.autopilot_enabled !== false,
      }));
      setConvs(mapped);
      registerCloudConversations(mapped);
    };

    load();

    const channel = supabase
      .channel(`conv-${modelId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `model_id=eq.${modelId}` },
        () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [modelId]);

  return convs;
}

/** Wie viele der neuesten Nachrichten pro Chat geladen werden. */
const MESSAGE_WINDOW = 240;

/**
 * Side effect: when activeId changes, fetch messages for that conversation
 * once + subscribe to new ones, feeding them into the chatStore message map.
 */

export function useMessagesLoader(activeId: string | null) {
  useEffect(() => {
    if (!activeId) return;
    if (activeId.startsWith("conv-ai")) return; // skip AI demo
    let cancelled = false;

    const load = async () => {
      // Nur das aktuelle Ende laden: die Schnittstelle liefert max. 1000 Zeilen,
      // aufsteigend sortiert wären das bei langen Chats die ÄLTESTEN — dann
      // rechnete der Auto-Chat mit uralten Angeboten und schickte kein PPV mehr.
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: false })
        .limit(MESSAGE_WINDOW);
      if (cancelled || !data) return;
      const msgs: Message[] = [...data].reverse().map(rowToMessage);
      ingestCloudMessages(activeId, msgs);

    };
    load();

    const channel = supabase
      .channel(`msg-${activeId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          ingestCloudMessages(activeId, [rowToMessage(payload.new as any)], { append: true });
        })
      .on("postgres_changes",
        // UPDATE (z. B. PPV gekauft) und DELETE → Verlauf neu laden
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        () => { void load(); })
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        () => { void load(); })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [activeId]);
}

function rowToMessage(r: any): Message {
  const fromMe = r.sender_type === "model";
  return {
    id: r.id,
    senderId: fromMe ? "user-001" : `fan-${r.conversation_id}`,
    contentType: r.content_type,
    content: r.content ?? undefined,
    ppv: r.content_type === "ppv" ? {
      price: r.ppv_price_cents ?? 0,
      currency: "EUR",
      mediaType: (r.ppv_media_type ?? "photo") as "photo" | "video",
      mediaCount: r.ppv_media_count ?? 1,
      previewUrl: null,
      isPurchased: !!r.ppv_is_purchased,
      caption: r.content ?? undefined,
    } : undefined,
    tip: r.content_type === "tip" ? {
      amount: r.tip_amount_cents ?? 0,
      currency: "EUR",
      message: r.tip_message ?? "",
    } : undefined,
    createdAt: r.created_at,
    status: r.status ?? "delivered",
  };
}
