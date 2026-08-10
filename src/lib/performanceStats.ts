import { supabase } from "@/integrations/supabase/client";

/**
 * Performance-Daten je Profil und Tag.
 * Primärquelle: model_stats_daily. Ist die Tabelle leer, wird aus der
 * Simulations-Telemetrie (sim_telemetry) hochgerechnet.
 */
export type DailyStat = {
  modelId: string;
  statDate: string;
  messagesSent: number;
  messagesReceived: number;
  offersMade: number;
  offersAccepted: number;
  revenueCents: number;
  activeConversations: number;
  inactiveStops: number;
};

export type ProfileRow = {
  modelId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  template: string;
  chats: number;
  autoChats: number;
  pausedChats: number;
  messages: number;
  offers: number;
  accepted: number;
  revenueCents: number;
};

export type PerformanceData = {
  fromTelemetry: boolean;
  days: DailyStat[];
  totalProfiles: number;
};

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const daysAgoIso = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

const emptyDay = (modelId: string, statDate: string): DailyStat => ({
  modelId, statDate,
  messagesSent: 0, messagesReceived: 0, offersMade: 0, offersAccepted: 0,
  revenueCents: 0, activeConversations: 0, inactiveStops: 0,
});

/** Lädt die letzten `windowDays` Tage — echte Statistik oder Telemetrie-Fallback. */
export async function loadPerformance(windowDays = 14): Promise<PerformanceData> {
  const since = daysAgoIso(windowDays);

  const [{ count: modelCount }, { data: statRows }] = await Promise.all([
    supabase.from("model_profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("model_stats_daily")
      .select("*")
      .gte("stat_date", since)
      .order("stat_date", { ascending: true }),
  ]);

  const totalProfiles = Number(modelCount ?? 0);

  if ((statRows ?? []).length > 0) {
    const days = (statRows ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        modelId: String(row.model_id ?? ""),
        statDate: String(row.stat_date ?? ""),
        messagesSent: Number(row.messages_sent ?? 0),
        messagesReceived: Number(row.messages_received ?? 0),
        offersMade: Number(row.offers_made ?? 0),
        offersAccepted: Number(row.offers_accepted ?? 0),
        revenueCents: Number(row.revenue_cents ?? 0),
        activeConversations: Number(row.active_conversations ?? 0),
        inactiveStops: Number(row.inactive_stops ?? 0),
      } satisfies DailyStat;
    });
    return { fromTelemetry: false, days, totalProfiles };
  }

  // ---- Fallback: aus der Simulations-Telemetrie hochrechnen ----
  const { data: telRows } = await supabase
    .from("sim_telemetry")
    .select("model_id, created_at, offer_price_cents, offer_purchased, model_msg_count, fan_msg_count, conversation_id")
    .gte("created_at", `${since}T00:00:00.000Z`)
    .order("created_at", { ascending: true });

  const byKey = new Map<string, DailyStat>();
  const convSeen = new Map<string, Set<string>>();

  for (const r of telRows ?? []) {
    const row = r as Record<string, unknown>;
    const modelId = String(row.model_id ?? "");
    if (!modelId) continue;
    const statDate = String(row.created_at ?? "").slice(0, 10);
    const key = `${modelId}|${statDate}`;
    const cur = byKey.get(key) ?? emptyDay(modelId, statDate);

    cur.messagesSent += Number(row.model_msg_count ?? 0);
    cur.messagesReceived += Number(row.fan_msg_count ?? 0);
    const price = Number(row.offer_price_cents ?? 0);
    if (price > 0) {
      cur.offersMade += 1;
      if (row.offer_purchased === true) {
        cur.offersAccepted += 1;
        cur.revenueCents += price;
      }
    }
    byKey.set(key, cur);

    const convId = String(row.conversation_id ?? "");
    if (convId) {
      const set = convSeen.get(key) ?? new Set<string>();
      set.add(convId);
      convSeen.set(key, set);
    }
  }

  for (const [key, stat] of byKey) {
    stat.activeConversations = convSeen.get(key)?.size ?? 0;
  }

  const days = [...byKey.values()].sort((a, b) => a.statDate.localeCompare(b.statDate));
  return { fromTelemetry: true, days, totalProfiles };
}

export type ModelMeta = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  persona_config: unknown;
};

export async function loadModelMeta(): Promise<ModelMeta[]> {
  const { data } = await supabase
    .from("model_profiles")
    .select("id, display_name, handle, avatar_url, persona_config");
  return (data ?? []) as unknown as ModelMeta[];
}

export type ConvCounts = Record<string, { auto: number; paused: number }>;

export async function loadConvCounts(): Promise<ConvCounts> {
  const { data } = await supabase.from("conversations").select("model_id, autopilot_enabled");
  const out: ConvCounts = {};
  for (const c of data ?? []) {
    const row = c as { model_id: string; autopilot_enabled: boolean | null };
    const key = String(row.model_id);
    out[key] ??= { auto: 0, paused: 0 };
    if (row.autopilot_enabled === false) out[key].paused++;
    else out[key].auto++;
  }
  return out;
}

export function sumDays(days: DailyStat[]): Omit<DailyStat, "modelId" | "statDate"> {
  return days.reduce(
    (acc, d) => ({
      messagesSent: acc.messagesSent + d.messagesSent,
      messagesReceived: acc.messagesReceived + d.messagesReceived,
      offersMade: acc.offersMade + d.offersMade,
      offersAccepted: acc.offersAccepted + d.offersAccepted,
      revenueCents: acc.revenueCents + d.revenueCents,
      activeConversations: Math.max(acc.activeConversations, d.activeConversations),
      inactiveStops: acc.inactiveStops + d.inactiveStops,
    }),
    { messagesSent: 0, messagesReceived: 0, offersMade: 0, offersAccepted: 0, revenueCents: 0, activeConversations: 0, inactiveStops: 0 },
  );
}

export const successPct = (offers: number, accepted: number) =>
  offers > 0 ? (accepted / offers) * 100 : 0;

export const eur = (cents: number) =>
  `${Math.round(cents / 100).toLocaleString("de-DE")}€`;

export function quoteColor(pct: number): string {
  if (pct > 5) return "hsl(152 60% 55%)";
  if (pct >= 2) return "hsl(43 96% 62%)";
  return "hsl(0 78% 62%)";
}
