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
  /** true = Demo-/Testdatensatz, nicht in der Datenbank vorhanden. */
  is_placeholder?: boolean;
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

export async function uploadAssetFile(file: File, modelId?: string | null): Promise<{ path: string; mediaType: string }> {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const path = `${modelId ? `${modelId}/` : ""}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || undefined,
  });
  if (error) throw error;
  return { path, mediaType: file.type.startsWith("video") ? "video" : "photo" };
}

/* ─────────── Test-/Platzhalterdaten für die Galerie ─────────── */

const PH_IMAGES = [
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800",
  "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=800",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800",
  "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800",
];

const PH_SPEC: Array<{
  d: string; tier: number; category: string; tags: string[]; value: number;
  use: number; resp: number; rev: number;
}> = [
  { d: "Soft-Portrait im Morgenlicht", tier: 1, category: "portrait", tags: ["soft", "morgen"], value: 0, use: 42, resp: 31, rev: 0 },
  { d: "Neues Lingerie-Set, rosé", tier: 3, category: "outfit", tags: ["lingerie", "set"], value: 1499, use: 28, resp: 19, rev: 26982 },
  { d: "Gym-Selfie nach dem Training", tier: 2, category: "lifestyle", tags: ["gym", "tease"], value: 500, use: 61, resp: 40, rev: 12000 },
  { d: "Dusch-Clip, 28 Sekunden", tier: 5, category: "artistic", tags: ["shower", "video"], value: 2499, use: 14, resp: 9, rev: 22491 },
  { d: "Strandreihe bei Sonnenuntergang", tier: 2, category: "lifestyle", tags: ["beach", "outdoor"], value: 990, use: 33, resp: 21, rev: 9900 },
  { d: "Spiegel-Shot im Schlafzimmer", tier: 4, category: "artistic", tags: ["mirror", "bett"], value: 1990, use: 18, resp: 13, rev: 15920 },
  { d: "Casual Coffee-Date Look", tier: 1, category: "portrait", tags: ["casual", "date"], value: 0, use: 55, resp: 24, rev: 0 },
  { d: "Custom-Wunsch: Rotes Kleid", tier: 4, category: "custom", tags: ["custom", "rot"], value: 4900, use: 6, resp: 5, rev: 24500 },
];

/** Deterministische Demo-Assets für UI- und Upload-Tests. */
export function placeholderAssets(modelId: string | null): ModelAsset[] {
  return PH_SPEC.map((s, i) => ({
    id: `placeholder-${i}`,
    model_id: modelId,
    url: PH_IMAGES[i % PH_IMAGES.length]!,
    thumbnail_url: PH_IMAGES[i % PH_IMAGES.length]!,
    media_type: s.d.includes("Clip") ? "video" : "photo",
    description: s.d,
    tier: s.tier,
    category: s.category,
    tags: s.tags,
    value_cents: s.value,
    note: null,
    use_count: s.use,
    response_count: s.resp,
    revenue_total_cents: s.rev,
    is_active: true,
    created_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    is_placeholder: true,
  }));
}
