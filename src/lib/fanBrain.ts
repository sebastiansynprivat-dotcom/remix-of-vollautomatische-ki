// Fan-Brain — typisiertes CRM-Memory pro Fan.
// Persistent in public.fan_brain; live über useFanBrain(fanId) abrufbar.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LifecycleStage =
  | "unknown" | "warming" | "qualified" | "first_buyer"
  | "repeat_buyer" | "whale" | "at_risk" | "dormant" | "win_back";

export type Mood = "low" | "neutral" | "high" | "horny" | "stressed" | "lonely";

export interface FanBrain {
  fan_id: string;
  display_name: string;
  updated_at: string;          // ISO
  confidence: number;          // 0..1 — wie sicher ist das Brain insgesamt

  identity: {
    name?: string;
    age_hint?: number;
    country?: string;
    city_hint?: string;
    timezone_guess?: string;
    job_hint?: string;
    relationship_status?: string;
    languages?: string[];
  };

  emotional: {
    current_mood: Mood;
    mood_history_7d: Mood[];
    loneliness_score: number;        // 0..100
    last_compliment_topic?: string;
    last_vulnerable_share?: string;  // was hat er zuletzt offenbart
    triggers_positive: string[];
    triggers_negative: string[];
  };

  preferences: {
    kinks: string[];
    turn_offs: string[];
    favorite_bridge?: "shower" | "lingerie" | "outfit" | "banana" | "gym" | "morning";
    fav_body_part?: string;
    content_format_pref?: ("photo" | "video" | "voice" | "custom")[];
    pacing?: "slow_burn" | "fast" | "varies";
  };

  commercial: {
    lifetime_spend: number;          // €
    avg_ticket: number;              // € pro Pitch
    last_purchase_at?: string;       // ISO
    last_purchase_amount?: number;
    days_since_last_buy?: number;
    ladder_step: number;             // 1..10 Preisleiter
    declined_count: number;
    refund_count: number;
  };

  relationship: {
    stage: LifecycleStage;
    days_known: number;
    inside_jokes: string[];
    promises_made: { text: string; due?: string }[];
    nicknames_for_her?: string[];
    nicknames_for_him?: string[];
    last_seen_at?: string;
  };

  red_flags: {
    broke_signals: number;           // 0..10
    aggression: number;              // 0..10
    refund_threats: number;          // 0..10
    scammer_score: number;           // 0..100
    notes: string[];
  };

  signals: {
    bridge_state: "idle" | "armed" | "fan_ack" | "pitched" | "bought" | "declined" | "recovered";
    after_care_lock_until?: string;  // ISO
    funnel_step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    ppv_moment_score: number;        // 0..100
  };
}

export const MOCK_FAN_BRAIN: FanBrain = {
  fan_id: "fan_8821",
  display_name: "Marcus K.",
  updated_at: new Date().toISOString(),
  confidence: 0.74,

  identity: {
    name: "Marcus",
    age_hint: 42,
    country: "DE",
    city_hint: "Hamburg-Umland",
    timezone_guess: "Europe/Berlin",
    job_hint: "Schichtleiter Logistik (Spätschicht)",
    relationship_status: "geschieden, 1 Sohn (8)",
    languages: ["de", "en"],
  },

  emotional: {
    current_mood: "lonely",
    mood_history_7d: ["neutral", "lonely", "stressed", "lonely", "low", "lonely", "lonely"],
    loneliness_score: 78,
    last_compliment_topic: "seine Geduld mit dem Sohn",
    last_vulnerable_share: "vermisst Abendroutine zu zweit",
    triggers_positive: ["Anerkennung als Vater", "ruhige Stimme", "feste Rituale"],
    triggers_negative: ["Druck", "andere Männer erwähnen", "Ex-Frau-Themen"],
  },

  preferences: {
    kinks: ["Voyeur (soft)", "Worship", "Morgens im Bett"],
    turn_offs: ["Härter Dirty Talk", "Anal", "Gruppen-Themen"],
    favorite_bridge: "shower",
    fav_body_part: "Rücken/Nacken",
    content_format_pref: ["voice", "video"],
    pacing: "slow_burn",
  },

  commercial: {
    lifetime_spend: 612,
    avg_ticket: 28,
    last_purchase_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
    last_purchase_amount: 39,
    days_since_last_buy: 2,
    ladder_step: 6,
    declined_count: 3,
    refund_count: 0,
  },

  relationship: {
    stage: "repeat_buyer",
    days_known: 47,
    inside_jokes: ["'Banana-Friday'", "Kaffee statt Tee Diskussion"],
    promises_made: [
      { text: "Voice am Sonntagabend", due: new Date(Date.now() + 3 * 86400_000).toISOString() },
    ],
    nicknames_for_her: ["Sunny"],
    nicknames_for_him: ["Bär"],
    last_seen_at: new Date(Date.now() - 40 * 60_000).toISOString(),
  },

  red_flags: {
    broke_signals: 1,
    aggression: 0,
    refund_threats: 0,
    scammer_score: 4,
    notes: ["sehr respektvoll, keine Eskalations-Marker"],
  },

  signals: {
    bridge_state: "armed",
    funnel_step: 5,
    ppv_moment_score: 72,
  },
};

// ---------- DB Loader ----------
// Maps a public.fan_brain row → FanBrain. Uses NEUTRAL empty defaults for missing fields
// (NOT MOCK_FAN_BRAIN — that would leak Marcus K.'s mock data into every real fan).
const EMPTY_DEFAULTS = {
  emotional: {
    current_mood: "neutral" as const,
    mood_history_7d: [],
    loneliness_score: 0,
    triggers_positive: [],
    triggers_negative: [],
  },
  preferences: { kinks: [], turn_offs: [], content_format_pref: [] },
  commercial: { lifetime_spend: 0, avg_ticket: 0, ladder_step: 1, declined_count: 0, refund_count: 0 },
  relationship: {
    stage: "unknown" as const, days_known: 0, inside_jokes: [],
    promises_made: [], nicknames_for_her: [], nicknames_for_him: [],
  },
  red_flags: { broke_signals: 0, aggression: 0, refund_threats: 0, scammer_score: 0, notes: [] },
  signals: { bridge_state: "idle" as const, funnel_step: 1 as const, ppv_moment_score: 0 },
};

function rowToBrain(row: Record<string, unknown>, displayName: string): FanBrain {
  const j = (k: string) => (row[k] as Record<string, unknown> | null) ?? {};
  const identity = j("identity") as FanBrain["identity"];
  const emotional = { ...EMPTY_DEFAULTS.emotional, ...(j("emotional") as object) } as FanBrain["emotional"];
  const preferences = { ...EMPTY_DEFAULTS.preferences, ...(j("preferences") as object) } as FanBrain["preferences"];
  const commercial = { ...EMPTY_DEFAULTS.commercial, ...(j("commercial") as object) } as FanBrain["commercial"];
  const relationship = { ...EMPTY_DEFAULTS.relationship, ...(j("relationship") as object) } as FanBrain["relationship"];
  const red_flags = { ...EMPTY_DEFAULTS.red_flags, ...(j("red_flags") as object) } as FanBrain["red_flags"];
  const signals = { ...EMPTY_DEFAULTS.signals, ...(j("signals") as object) } as FanBrain["signals"];
  return {
    fan_id: String(row.fan_id),
    display_name: displayName,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    confidence: Number(row.confidence ?? 0),
    identity, emotional, preferences, commercial, relationship, red_flags, signals,
  };
}

export async function fetchFanBrain(fanId: string, displayName: string): Promise<FanBrain | null> {
  if (!fanId) return null;
  // Mock fan-IDs ("fan-001", "fan_xxx") sind keine UUIDs → DB-Lookup überspringen
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fanId);
  if (!isUuid) return null;
  const { data, error } = await supabase
    .from("fan_brain")
    .select("*")
    .eq("fan_id", fanId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToBrain(data as Record<string, unknown>, displayName);
}

/**
 * Live-Hook: lädt fan_brain für eine fanId, fällt bei Mock-IDs / Fehlern auf MOCK zurück.
 * Subscribed auf realtime-Updates der fan_brain Zeile.
 */
export function useFanBrain(fanId: string | null, displayName = "Fan"): { brain: FanBrain; isMock: boolean; loading: boolean } {
  const [brain, setBrain] = useState<FanBrain>(MOCK_FAN_BRAIN);
  const [isMock, setIsMock] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fanId) { setBrain(MOCK_FAN_BRAIN); setIsMock(true); return; }
    let cancelled = false;
    setLoading(true);
    fetchFanBrain(fanId, displayName).then(b => {
      if (cancelled) return;
      if (b) { setBrain({ ...b, display_name: displayName }); setIsMock(false); }
      else { setBrain({ ...MOCK_FAN_BRAIN, display_name: displayName, fan_id: fanId }); setIsMock(true); }
    }).finally(() => { if (!cancelled) setLoading(false); });

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fanId);
    if (!isUuid) return () => { cancelled = true; };

    const ch = supabase
      .channel(`fan_brain:${fanId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fan_brain", filter: `fan_id=eq.${fanId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown> | null;
          if (row) { setBrain(rowToBrain(row, displayName)); setIsMock(false); }
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [fanId, displayName]);

  return { brain, isMock, loading };
}
