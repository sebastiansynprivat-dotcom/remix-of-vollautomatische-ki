// Content-Ordner: Gruppen von Medien, die als Einheit verschickt werden.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ModelAsset } from "@/lib/modelAssets";

export type TimeOfDay = "day" | "night" | "any";

export interface ContentSet {
  id: string;
  model_id: string | null;
  name: string;
  description: string | null;
  time_of_day: TimeOfDay;
  price_cents: number;
  tier: number;
  tags: string[];
  cover_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ContentSetWithAssets extends ContentSet {
  assets: ModelAsset[];
}

export const TIME_OF_DAY_META: Record<TimeOfDay, {
  label: string; bg: string; border: string; color: string;
}> = {
  day: { label: "Tagsüber", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.22)", color: "#FCD34D" },
  night: { label: "Nachts", bg: "rgba(99,102,241,0.10)", border: "rgba(99,102,241,0.22)", color: "#A5B4FC" },
  any: { label: "Jederzeit", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.20)", color: "#A1A1AA" },
};

export function normalizeTimeOfDay(v: unknown): TimeOfDay {
  return v === "day" || v === "night" ? v : "any";
}

/** 6–18 Uhr = Tag, sonst Nacht. */
export function timeOfDayFromHour(hour: number): "day" | "night" {
  return hour >= 6 && hour < 18 ? "day" : "night";
}

export function useContentSets(modelId: string | null | undefined) {
  const [sets, setSets] = useState<ContentSetWithAssets[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!modelId) { setSets([]); setLoading(false); return; }
    setLoading(true);
    const [{ data: rows }, { data: assets }] = await Promise.all([
      supabase.from("content_sets").select("*").eq("model_id", modelId)
        .order("created_at", { ascending: false }),
      supabase.from("model_assets").select("*").eq("model_id", modelId)
        .order("sequence_order", { ascending: true }),
    ]);
    const bySet = new Map<string, ModelAsset[]>();
    for (const a of (assets ?? []) as ModelAsset[]) {
      const sid = (a as ModelAsset & { set_id?: string | null }).set_id;
      if (!sid) continue;
      const list = bySet.get(sid) ?? [];
      list.push(a);
      bySet.set(sid, list);
    }
    setSets(((rows ?? []) as ContentSet[]).map((s) => ({
      ...s,
      time_of_day: normalizeTimeOfDay(s.time_of_day),
      tags: s.tags ?? [],
      assets: bySet.get(s.id) ?? [],
    })));
    setLoading(false);
  }, [modelId]);

  useEffect(() => { void reload(); }, [reload]);

  return { sets, loading, reload };
}

export async function createContentSet(modelId: string, name: string) {
  return supabase.from("content_sets")
    .insert({ model_id: modelId, name })
    .select("id").single();
}

export async function updateContentSet(id: string, patch: Partial<ContentSet>) {
  return supabase.from("content_sets").update(patch as never).eq("id", id);
}

export async function deleteContentSet(id: string) {
  return supabase.from("content_sets").delete().eq("id", id);
}

export async function saveSequence(assetIds: string[]) {
  await Promise.all(assetIds.map((id, i) =>
    supabase.from("model_assets").update({ sequence_order: i } as never).eq("id", id),
  ));
}

/** Deckt ein Ordner die Tageszeit ab? "any" zählt für beides. */
export function coversTime(set: ContentSet, t: "day" | "night") {
  return set.time_of_day === t || set.time_of_day === "any";
}
