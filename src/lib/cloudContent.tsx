import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MediaAsset {
  id: string;
  model_id: string;
  kind: "photo" | "video";
  storage_path: string | null;
  thumbnail_url: string | null;
  external_url: string | null;
  mime: string | null;
  duration_sec: number | null;
  title: string | null;
  tags: string[];
  status: "fresh" | "used" | "archived";
  times_sent: number;
  last_sent_at: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface PpvTemplate {
  id: string;
  model_id: string;
  title: string;
  caption: string | null;
  price_cents: number;
  media_type: "photo" | "video" | "gallery";
  media_count: number;
  asset_ids: string[];
  cover_url: string | null;
  tags: string[];
  times_sent: number;
  times_purchased: number;
  revenue_cents: number;
  is_demo: boolean;
}

export function useModelMedia(modelId: string | null) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!modelId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("media_assets")
      .select("*")
      .eq("model_id", modelId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as MediaAsset[]);
    setLoading(false);
  }, [modelId]);

  useEffect(() => {
    load();
    if (!modelId) return;
    const ch = supabase
      .channel(`media-${modelId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "media_assets", filter: `model_id=eq.${modelId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [modelId, load]);

  return { items, loading, reload: load };
}

export function useModelPpvTemplates(modelId: string | null) {
  const [items, setItems] = useState<PpvTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!modelId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("ppv_templates")
      .select("*")
      .eq("model_id", modelId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as PpvTemplate[]);
    setLoading(false);
  }, [modelId]);

  useEffect(() => {
    load();
    if (!modelId) return;
    const ch = supabase
      .channel(`ppvtpl-${modelId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "ppv_templates", filter: `model_id=eq.${modelId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [modelId, load]);

  return { items, loading, reload: load };
}

export async function recordAssetSend(assetId: string, conversationId: string) {
  await supabase.rpc("record_asset_send", {
    _asset_id: assetId,
    _conversation_id: conversationId,
  });
}

export async function recordTemplateSend(templateId: string) {
  await supabase.rpc("record_template_send", { _template_id: templateId });
}

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setIsAdmin(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setIsAdmin(!!data);
    })();
    return () => { cancelled = true; };
  }, []);
  return isAdmin;
}

/** Resolve thumbnail/preview URL from either external_url or storage_path. */
export function assetThumbUrl(a: MediaAsset): string | null {
  if (a.thumbnail_url) return a.thumbnail_url;
  if (a.external_url) return a.external_url;
  if (a.storage_path) {
    const { data } = supabase.storage.from("model-content").getPublicUrl(a.storage_path);
    return data.publicUrl;
  }
  return null;
}

/** Seed demo cloud content for a model (admin-only). */
export async function seedDemoCloud(modelId: string) {
  return await supabase.rpc("seed_demo_cloud_for_model", { _model_id: modelId });
}
