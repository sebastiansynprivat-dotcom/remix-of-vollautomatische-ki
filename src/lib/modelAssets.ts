import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ASSET_BUCKET = "model-assets";

export interface ModelAsset {
  id: string;
  model_id: string | null;
  url: string;
  thumbnail_url: string | null;
  media_type: string;
  description: string | null;
  tier: number;
  category: string;
  tags: string[];
  value_cents: number;
  note: string | null;
  use_count: number;
  response_count: number;
  revenue_total_cents: number;
  is_active: boolean;
  created_at: string;
}

export const TIERS = [
  { level: 1, label: "Basis", gradient: "linear-gradient(135deg,#64748b,#475569)" },
  { level: 2, label: "Leicht", gradient: "linear-gradient(135deg,#818cf8,#4f46e5)" },
  { level: 3, label: "Mittel", gradient: "linear-gradient(135deg,#c084fc,#7c3aed)" },
  { level: 4, label: "Expressiv", gradient: "linear-gradient(135deg,#f472b6,#db2777)" },
  { level: 5, label: "Premium", gradient: "linear-gradient(135deg,#fb7185,#dc2626)" },
] as const;

export const CATEGORIES = ["portrait", "outfit", "lifestyle", "artistic", "custom"] as const;
export const CATEGORY_LABEL: Record<string, string> = {
  portrait: "Portrait", outfit: "Outfit", lifestyle: "Lifestyle",
  artistic: "Artistic", custom: "Custom",
};

export function tierMeta(level: number) {
  return TIERS.find(t => t.level === level) ?? TIERS[0];
}

export function successRate(a: ModelAsset): number | null {
  if (!a.use_count) return null;
  return Math.round((a.response_count / a.use_count) * 100);
}

export function euro(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
}

/** Resolve a stored value (storage path or absolute URL) to a displayable URL. */
export async function resolveAssetUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  const { data } = await supabase.storage.from(ASSET_BUCKET).createSignedUrl(value, 3600);
  return data?.signedUrl ?? null;
}

export function useResolvedUrl(value: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    resolveAssetUrl(value).then(u => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [value]);
  return url;
}

export function useModelAssets(modelId: string | null | undefined) {
  const [items, setItems] = useState<ModelAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!modelId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("model_assets")
      .select("*")
      .eq("model_id", modelId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as ModelAsset[]);
    setLoading(false);
  }, [modelId]);

  useEffect(() => { void reload(); }, [reload]);

  return { items, loading, reload };
}

export async function deleteAsset(a: ModelAsset) {
  if (a.url && !/^https?:\/\//.test(a.url)) {
    await supabase.storage.from(ASSET_BUCKET).remove([a.url]).catch(() => {});
  }
  return supabase.from("model_assets").delete().eq("id", a.id);
}

export async function uploadAssetFile(file: File): Promise<{ path: string; mediaType: string }> {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || undefined,
  });
  if (error) throw error;
  return { path, mediaType: file.type.startsWith("video") ? "video" : "photo" };
}
