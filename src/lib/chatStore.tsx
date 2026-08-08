import { useSyncExternalStore, useMemo, type ReactNode } from "react";
import { mockMessages, mockCurrentUser, mockConversations, AI_CONV_ID, AI_FAN_ID, type Message } from "@/data/mockData";
import { fx } from "@/lib/feedback";
import { supabase } from "@/integrations/supabase/client";
import { computeFunnelState, funnelPayload } from "@/lib/salesFunnel";
import { filterFresh, usedLines } from "@/lib/repetition";
import { buildTopicMemory, topicMemoryRules } from "@/lib/topicMemory";
import { dailyScene, dailySceneRules, timeSlotOf } from "@/lib/dailyScene";

import { isSimConv, resumeSimNow, setSimState } from "@/lib/simRuns";
import { COLD_RESTART_HOURS, gapLabel, timeOfDayLabel } from "@/lib/sessionRhythm";
import { MIDDAY_RULES, MORNING_RULES, restartRules } from "@/lib/reengage";
import {
  type ChatBehavior, resolveChatBehavior, extractStyleFields,
  buildStyleBlock, emojiCap, delayFactor,
} from "@/lib/modelBehavior";

/**
 * Pause (in Stunden) direkt vor der letzten Nachricht. Damit erkennt der
 * Auto-Chat, dass ein Gespräch nach Funkstille neu anfängt.
 */
function gapHoursBefore(msgs: readonly Message[]): number {
  if (msgs.length < 2) return 0;
  const prev = new Date(msgs[msgs.length - 2].createdAt).getTime();
  const last = new Date(msgs[msgs.length - 1].createdAt).getTime();
  if (!Number.isFinite(prev) || !Number.isFinite(last)) return 0;
  return Math.max(0, (last - prev) / 3_600_000);
}

/**
 * Erledigte Angebote (kostenlos oder gekauft) VOR dem geladenen Fenster.
 * Ohne diesen Zähler würde die Verkaufs-Treppe bei langen Chats wieder bei
 * Stufe 1 anfangen, weil nur die letzten Nachrichten im Speicher liegen.
 */
async function clearedOffersBefore(convId: string, firstLoadedIso?: string): Promise<number> {
  if (!firstLoadedIso || !cloudConvIds.has(convId)) return 0;
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", convId)
    .eq("content_type", "ppv")
    .lt("created_at", firstLoadedIso)
    .or("ppv_price_cents.eq.0,ppv_is_purchased.is.true");
  if (error) return 0;
  return count ?? 0;
}



// =========================================================================
// Types
// =========================================================================
export type LastOverride = { content: string; createdAt: string; fromMe: boolean };

export interface FanFacts {
  name?: string;
  job?: string;
  location?: string;
  age?: string;
  relationship?: string;
  kinks?: string[];
  dislikes?: string[];
  buyingPattern?: string;
  other?: string[];
}

export interface CopilotSuggestion { tone: "safe" | "flirty" | "hard_sell"; text: string; text2?: string; why: string }
export interface PpvHint {
  ready: boolean;
  caption: string;
  suggested_price_eur: number;
  media_type: "photo" | "video";
  why: string;
}
export interface CopilotBrief {
  sentiment: { mood: "kalt" | "neutral" | "warm" | "heiß" | "sehr heiß"; score: number; trend: "up" | "flat" | "down" };
  buyIntent: { score: number; label: "neutral" | "niedrig" | "mittel" | "hoch" | "jetzt-pushen" };
  nextPriceStep: { amount_eur: number; type: "ppv" | "tip"; reason: string };
  riskFlags: string[];
  ppvHint?: PpvHint;
  suggestions: CopilotSuggestion[];
  fanFacts?: FanFacts;
  _debug?: CopilotDebugEntry;
}

export interface CopilotDebugEntry {
  ts: string;
  triggerMessageId?: string;
  triggerMessagePreview?: string;
  fanFactsExtracted?: Record<string, unknown>;
  brainBefore?: { identity?: Record<string, unknown>; preferences?: { kinks?: string[]; turn_offs?: string[] }; relationship?: Record<string, unknown>; confidence?: number };
  brainAfter?: { identity?: Record<string, unknown>; preferences?: { kinks?: string[]; turn_offs?: string[] }; relationship?: Record<string, unknown>; confidence?: number };
  written?: boolean;
  fanId?: string | null;
  error?: string;
}
export interface PpvDraft {
  caption: string;
  price_cents: number;
  media_type: "photo" | "video" | "gallery";
  media_count?: number;
  cover_url?: string;
}

export interface ReengageOpts {
  dayOffset: number;
  time: string;
  kind: "morning" | "midday";
  autoMiddayDelaySec?: number;
  middayTime?: string;
}

type AIAction =
  | { type: "text"; text: string }
  | { type: "ppv"; price_cents: number; media_type: "photo" | "video"; count?: number; teaser?: string }
  | { type: "tip_request"; amount_cents: number; reason?: string };

// =========================================================================
// Module-scoped state (shared across the app, no React re-render on writes)
// =========================================================================
const messagesMap = new Map<string, Message[]>();
const typingMap = new Map<string, boolean>();
const lastOverrideMap = new Map<string, LastOverride>();
const draftsMap = new Map<string, string>();
const ppvDraftsMap = new Map<string, PpvDraft>();

const copilotBriefMap = new Map<string, CopilotBrief>();
const copilotLoadingMap = new Map<string, boolean>();
const copilotErrorMap = new Map<string, string | undefined>();
const fanNotesMap = new Map<string, string>();
const fanFactsMap = new Map<string, FanFacts>();
const copilotDebugMap = new Map<string, CopilotDebugEntry[]>();

// AI memory & control flags
const aiProfile = new Map<string, Record<string, unknown>>();
const aiIntroDone = new Set<string>();
const postPurchaseLock = new Set<string>();
const autoFollowupTimers = new Map<string, number>();


// Model-Profile Cache (per modelId), TTL 5 min
type ModelProfileRow = Record<string, unknown> | null;
const modelProfileCache = new Map<string, { row: ModelProfileRow; ts: number }>();
const MODEL_PROFILE_TTL_MS = 5 * 60_000;

async function getModelProfileCached(modelId: string): Promise<ModelProfileRow> {
  const hit = modelProfileCache.get(modelId);
  if (hit && Date.now() - hit.ts < MODEL_PROFILE_TTL_MS) return hit.row;
  try {
    const { data } = await supabase.from("model_profiles").select("*").eq("id", modelId).maybeSingle();
    const row = (data ?? null) as ModelProfileRow;
    modelProfileCache.set(modelId, { row, ts: Date.now() });
    return row;
  } catch {
    return null;
  }
}

/** Verhalten des Models für eine Konversation (aus dem Cache, sonst Defaults). */
function behaviorForConv(convId: string): ChatBehavior {
  const conv = findConv(convId);
  const modelId = conv?.profileId ?? null;
  const hit = modelId ? modelProfileCache.get(modelId) : undefined;
  return resolveChatBehavior((hit?.row as Record<string, unknown> | undefined)?.chat_behavior);
}

function buildModelPersonaPayload(row: unknown): Record<string, unknown> {
  const fallback = { displayName: "Creatorin", style: "premium, flirty, warm" };
  if (!row || typeof row !== "object") return fallback;
  const r = row as Record<string, unknown>;
  const arr = (v: unknown): string[] => Array.isArray(v) ? (v as unknown[]).filter(x => typeof x === "string" && (x as string).trim().length > 0).map(x => x as string) : [];
  const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim().length > 0) ? v as string : undefined;
  const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v)) ? v as number : undefined;
  const style = extractStyleFields(r);
  return {
    displayName: str(r.display_name) ?? "Creatorin",
    handle: str(r.handle),
    age: num(r.age),
    job: str(r.job),
    location: str(r.location),
    relationshipStatus: str(r.relationship_status),
    persona: str(r.persona),
    toneOfVoice: str(r.tone_of_voice),
    writingStyle: str(r.writing_style),
    bio: str(r.bio),
    funFacts: str(r.fun_facts),
    hobbies: arr(r.hobbies),
    languages: arr(r.languages),
    dos: arr(r.dos),
    donts: arr(r.donts),
    // Verhaltens-Einstellungen — landen als STIL-Block im System-Prompt
    emojis: style.emojis,
    emojiFrequency: style.emojiFrequency,
    emojiCap: emojiCap(style.emojiFrequency),
    signaturePhrases: style.signaturePhrases,
    tabooWords: style.tabooWords,
    openers: style.openers,
    styleBlock: buildStyleBlock(style),
    lowercase: style.behavior.lowercase,
    messageLength: style.behavior.messageLength,
    multiReplyMin: style.behavior.multiReplyMin,
    multiReplyMax: style.behavior.multiReplyMax,
    salesTempo: style.behavior.salesTempo,
    salesStartStage: style.behavior.salesStartStage,
  };
}



// Seed
messagesMap.set("conv-001", [...mockMessages]);

const EMPTY_MESSAGES: Message[] = [];
const counter = { v: 10000 };
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m-${++counter.v}`;

// =========================================================================
// Cloud bridge — convIds backed by Supabase get persisted on send
// =========================================================================
const cloudConvIds = new Set<string>();
const cloudConvMap = new Map<string, import("@/data/mockData").Conversation>();

export function registerCloudConvIds(ids: string[]) {
  ids.forEach((id) => cloudConvIds.add(id));
}

/** Register full cloud conversations so copilot/autopilot can read fan + model meta. */
export function registerCloudConversations(convs: import("@/data/mockData").Conversation[]) {
  convs.forEach((c) => {
    cloudConvIds.add(c.id);
    cloudConvMap.set(c.id, c);
  });
  // Notizen + Fan-Facts aus der Cloud nachladen
  convs.forEach((c) => { void hydrateFanContext(c.id); });
}


/** Replace (or append) a conv's messages with rows fetched from Supabase. */
export function ingestCloudMessages(
  convId: string,
  msgs: Message[],
  opts: { append?: boolean } = {},
) {
  cloudConvIds.add(convId);
  const cur = messagesMap.get(convId) ?? EMPTY_MESSAGES;
  if (opts.append) {
    const existingIds = new Set(cur.map((m) => m.id));
    const fresh = msgs.filter((m) => !existingIds.has(m.id));
    if (fresh.length === 0) return;
    const merged = [...cur, ...fresh];
    messagesMap.set(convId, merged);
    notify("messages", convId);
    const last = fresh[fresh.length - 1];
    setLast(convId, previewOf(last), last.senderId === mockCurrentUser.id);
    return;
  }
  messagesMap.set(convId, msgs);
  notify("messages", convId);
}

function previewOf(m: Message): string {
  if (m.contentType === "text") return m.content ?? "";
  if (m.contentType === "ppv" && m.ppv) return m.ppv.price === 0 ? "📎 PPV · Kostenlos" : `📎 PPV · ${(m.ppv.price / 100).toFixed(2)} €`;
  if (m.contentType === "tip" && m.tip) return `💝 Trinkgeld · ${(m.tip.amount / 100).toFixed(2)} €`;
  return "";
}

async function persistMessage(convId: string, msg: Message) {
  if (!cloudConvIds.has(convId)) return;
  const fromMe = msg.senderId === mockCurrentUser.id;
  const { error } = await supabase.from("messages").insert({
    id: msg.id,
    conversation_id: convId,
    sender_type: fromMe ? "model" : "fan",
    content_type: msg.contentType,
    status: msg.status,
    content: msg.content ?? msg.ppv?.caption ?? null,
    ppv_price_cents: msg.ppv?.price ?? null,
    ppv_media_type: msg.ppv?.mediaType ?? null,
    ppv_media_count: msg.ppv?.mediaCount ?? null,
    ppv_is_purchased: msg.ppv?.isPurchased ?? null,
    tip_amount_cents: msg.tip?.amount ?? null,
    tip_message: msg.tip?.message ?? null,
  });
  if (error) console.error("persistMessage failed", error);
}

// =========================================================================
// Fan-Notizen + Fan-Facts → Cloud (public.fan_brain)
// =========================================================================
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fanContextTimers = new Map<string, number>();
const fanContextHydrated = new Set<string>();

function cloudFanRef(convId: string): { fanId: string; modelId: string } | null {
  const conv = findConv(convId);
  const fanId = conv?.participant.id ?? "";
  const modelId = conv?.profileId ?? "";
  if (!UUID_RE.test(fanId) || !UUID_RE.test(modelId)) return null;
  return { fanId, modelId };
}

/** Lädt gespeicherte Notiz + Facts aus fan_brain in den lokalen Store (einmal pro Conv). */
export async function hydrateFanContext(convId: string) {
  if (fanContextHydrated.has(convId)) return;
  const ref = cloudFanRef(convId);
  if (!ref) return;
  fanContextHydrated.add(convId);
  try {
    const { data } = await supabase
      .from("fan_brain")
      .select("identity, notes_freeform")
      .eq("fan_id", ref.fanId)
      .maybeSingle();
    if (!data) return;
    const note = typeof data.notes_freeform === "string" ? data.notes_freeform : "";
    if (note && !fanNotesMap.get(convId)) {
      fanNotesMap.set(convId, note);
      notify("fanNote", convId);
    }
    const identity = (data.identity ?? {}) as Record<string, unknown>;
    const stored = identity.copilot_facts;
    if (stored && typeof stored === "object") {
      mergeFanFacts(convId, stored as FanFacts, { persist: false });
    }
  } catch (e) {
    console.error("hydrateFanContext failed", e);
  }
}

async function writeFanContext(convId: string) {
  const ref = cloudFanRef(convId);
  if (!ref) return;
  const facts = fanFactsMap.get(convId) ?? {};
  const note = fanNotesMap.get(convId) ?? "";
  try {
    const { data: existing } = await supabase
      .from("fan_brain")
      .select("identity, preferences")
      .eq("fan_id", ref.fanId)
      .maybeSingle();

    const identity: Record<string, unknown> = { ...((existing?.identity ?? {}) as object) };
    identity.copilot_facts = facts;
    if (facts.name) identity.name = facts.name;
    if (facts.job) identity.job_hint = facts.job;
    if (facts.location) identity.city_hint = facts.location;
    if (facts.age) identity.age_hint = facts.age;
    if (facts.relationship) identity.relationship_status = facts.relationship;

    const preferences: Record<string, unknown> = { ...((existing?.preferences ?? {}) as object) };
    if (facts.kinks?.length) {
      preferences.kinks = Array.from(new Set([...(Array.isArray(preferences.kinks) ? preferences.kinks as string[] : []), ...facts.kinks]));
    }
    if (facts.dislikes?.length) {
      preferences.turn_offs = Array.from(new Set([...(Array.isArray(preferences.turn_offs) ? preferences.turn_offs as string[] : []), ...facts.dislikes]));
    }

    const { error } = await supabase.from("fan_brain").upsert({
      fan_id: ref.fanId,
      model_id: ref.modelId,
      identity: identity as never,
      preferences: preferences as never,
      notes_freeform: note || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "fan_id" });
    if (error) console.error("writeFanContext failed", error);
  } catch (e) {
    console.error("writeFanContext failed", e);
  }
}

/** Debounced Cloud-Save für Notiz + Facts. */
function persistFanContext(convId: string) {
  const t = fanContextTimers.get(convId);
  if (t) clearTimeout(t);
  fanContextTimers.set(convId, setTimeout(() => {
    fanContextTimers.delete(convId);
    void writeFanContext(convId);
  }, 700) as unknown as number);
}


// =========================================================================
// Per-slice listener registry — useSyncExternalStore powered
// =========================================================================
type Slice =
  | "messages" | "typing" | "lastOverride" | "draft" | "ppvDraft"
  | "copilotBrief" | "copilotLoading" | "copilotError" | "fanNote" | "fanFacts" | "copilotDebug" | "chainStatus" | "autopilotPaused";

export type ChainStatus = {
  phase: "first-sent" | "second-sent";
  total: 2;
  step: 1 | 2;
  etaMs: number; // ms until next message goes out (0 when second sent)
};
const chainStatusMap = new Map<string, ChainStatus | undefined>();

const listeners = new Map<string, Set<() => void>>();
const k = (slice: Slice, id: string) => `${slice}::${id}`;

function notify(slice: Slice, id: string) {
  const set = listeners.get(k(slice, id));
  if (!set) return;
  set.forEach(fn => fn());
}

function subscribeFactory(slice: Slice, id: string) {
  return (cb: () => void) => {
    const key = k(slice, id);
    let set = listeners.get(key);
    if (!set) { set = new Set(); listeners.set(key, set); }
    set.add(cb);
    return () => {
      set!.delete(cb);
      if (set!.size === 0) listeners.delete(key);
    };
  };
}

// =========================================================================
// Mutators (module-scoped, called by actions)
// =========================================================================
function appendMsg(convId: string, msg: Message) {
  const cur = messagesMap.get(convId) ?? EMPTY_MESSAGES;
  messagesMap.set(convId, [...cur, msg]);
  notify("messages", convId);
}
function patchMsg(convId: string, id: string, p: Partial<Message>) {
  const cur = messagesMap.get(convId);
  if (!cur) return;
  let changed = false;
  const next = cur.map(m => {
    if (m.id !== id) return m;
    changed = true;
    return { ...m, ...p };
  });
  if (!changed) return;
  messagesMap.set(convId, next);
  notify("messages", convId);
}
function setLast(convId: string, content: string, fromMe: boolean) {
  lastOverrideMap.set(convId, { content, createdAt: new Date().toISOString(), fromMe });
  notify("lastOverride", convId);
}
function setTyping(convId: string, val: boolean) {
  if ((typingMap.get(convId) ?? false) === val) return;
  typingMap.set(convId, val);
  notify("typing", convId);
}

// =========================================================================
// AI helpers (Mia-conv only)
// =========================================================================
function buildHistory(convId: string): Array<{ role: "user" | "assistant"; content: string }> {
  const msgs = messagesMap.get(convId) ?? EMPTY_MESSAGES;
  return msgs
    .map((m): { role: "user" | "assistant"; content: string } | null => {
      const fromMe = m.senderId === mockCurrentUser.id;
      const role: "user" | "assistant" = fromMe ? "user" : "assistant";
      const speaker = fromMe ? "FAN" : "MIA";
      if (m.contentType === "text" && m.content) return { role, content: `${speaker}: ${m.content}` };
      if (m.contentType === "ppv" && m.ppv) {
        const status = m.ppv.isPurchased ? "GEKAUFT" : "NICHT GEKAUFT (gesperrt, Fan hat es nie gesehen)";
        return { role: "assistant", content: `MIA: [PPV ${m.ppv.mediaType} für ${(m.ppv.price / 100).toFixed(2)} € — Status: ${status}]` };
      }
      if (m.contentType === "tip" && m.tip) {
        return { role: "user", content: `FAN: [hat ${(m.tip.amount / 100).toFixed(2)} € Trinkgeld gegeben${m.tip.message ? `: "${m.tip.message}"` : ""}]` };
      }
      return null;
    })
    .filter((x): x is { role: "user" | "assistant"; content: string } => x !== null);
}

async function callAI(convId: string, opts: {
  extraUserText?: string;
  lastEvent?: "purchased" | "skipped" | "tipped" | null;
  ppvContext?: { price_cents: number; media_type: string } | null;
}) {
  const history = buildHistory(convId);
  if (opts.extraUserText) history.push({ role: "user", content: opts.extraUserText });

  setTyping(convId, true);
  try {
    const currentProfile = aiProfile.get(convId) ?? {};

    // Load model persona from model_profiles for cloud-backed convs
    const conv = findConv(convId);
    const modelIdRaw = conv?.profileId ?? null;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isModelUuid = !!modelIdRaw && UUID_RE.test(modelIdRaw);
    const modelProfileRow = isModelUuid ? await getModelProfileCached(modelIdRaw!) : null;
    const modelPersona = modelProfileRow ? buildModelPersonaPayload(modelProfileRow) : null;

    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: {
        messages: history,
        lastEvent: opts.lastEvent ?? null,
        ppvContext: opts.ppvContext ?? null,
        profile: currentProfile,
        modelPersona,
        modelId: isModelUuid ? modelIdRaw : null,
      },
    });
    if (error) throw error;
    if (data?.profile_patch && typeof data.profile_patch === "object") {
      aiProfile.set(convId, { ...currentProfile, ...data.profile_patch });
    }
    let actions: AIAction[] = data?.actions ?? [{ type: "text", text: "…" }];
    if (postPurchaseLock.has(convId)) {
      actions = actions.filter(a => a.type === "text");
      if (actions.length === 0) actions = [{ type: "text", text: "mmh… 🥵" }];
    }
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      if (i > 0) await new Promise(r => setTimeout(r, 700));
      if (a.type === "text") {
        const msg: Message = {
          id: newId(), senderId: AI_FAN_ID, contentType: "text", content: a.text,
          createdAt: new Date().toISOString(), status: "delivered",
        };
        appendMsg(convId, msg);
        setLast(convId, a.text, false);
      } else if (a.type === "ppv") {
        const msg: Message = {
          id: newId(), senderId: AI_FAN_ID, contentType: "ppv",
          ppv: { price: a.price_cents, currency: "EUR", mediaType: a.media_type, mediaCount: a.count ?? 1, previewUrl: null, isPurchased: false },
          createdAt: new Date().toISOString(), status: "delivered",
        };
        appendMsg(convId, msg);
        setLast(convId, `📎 PPV · ${(a.price_cents / 100).toFixed(2)} €${a.teaser ? ` — ${a.teaser}` : ""}`, false);
      } else if (a.type === "tip_request") {
        const msg: Message = {
          id: newId(), senderId: AI_FAN_ID, contentType: "text",
          content: `💝 Magst du mir ${(a.amount_cents / 100).toFixed(2)} € Trinkgeld geben?${a.reason ? ` ${a.reason}` : ""}`,
          createdAt: new Date().toISOString(), status: "delivered",
        };
        appendMsg(convId, msg);
        setLast(convId, msg.content!, false);
      }
      fx.sound("receive");
      fx.haptic("tick");
    }
  } catch (e) {
    console.error("AI call failed", e);
    appendMsg(convId, {
      id: newId(), senderId: AI_FAN_ID, contentType: "text",
      content: "Mia ist kurz weg… 💤 (AI-Antwort fehlgeschlagen)",
      createdAt: new Date().toISOString(), status: "delivered",
    });
  } finally {
    setTyping(convId, false);
  }
}

// =========================================================================
// Kontext-Helfer für den Auto-Pilot
// =========================================================================
function findConv(convId: string) {
  return cloudConvMap.get(convId)
    ?? mockConversations.find(c => c.id === convId);
}
export function isAutopilotConv(convId: string): boolean {
  return !!findConv(convId)?.isAutopilot;
}

function buildCopilotHistory(convId: string): string[] {
  const msgs = messagesMap.get(convId) ?? EMPTY_MESSAGES;
  return msgs
    .map(m => {
      const fromMe = m.senderId === mockCurrentUser.id;
      const speaker = fromMe ? "MODEL" : "FAN";
      if (m.contentType === "text" && m.content) return `${speaker}: ${m.content}`;
      if (m.contentType === "ppv" && m.ppv) {
        const status = m.ppv.isPurchased ? "GEKAUFT" : "NICHT GEKAUFT";
        return `MODEL: [PPV ${m.ppv.mediaType} ${(m.ppv.price / 100).toFixed(0)}€ — ${status}]`;
      }
      if (m.contentType === "tip" && m.tip) {
        return `FAN: [Trinkgeld ${(m.tip.amount / 100).toFixed(0)}€${m.tip.message ? ` "${m.tip.message}"` : ""}]`;
      }
      return "";
    })
    .filter(Boolean);
}

// =========================================================================
// Auto-Pilot — Creator antwortet vollautomatisch (gleiche Fan-Brain-Engine)
// =========================================================================
const autopilotRunning = new Set<string>();
const autopilotPending = new Set<string>();
const autopilotTimers = new Map<string, ReturnType<typeof setTimeout>>();
const AUTOPILOT_BURST_WINDOW_MS = 2800;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const rand = (a: number, b: number) => Math.round(a + Math.random() * (b - a));

async function runAutopilotTurn(convId: string) {
  // Vollautomatische Sim-Chats werden serverseitig gefahren — der Browser
  // darf hier nicht gegenschreiben.
  if (isSimConv(convId)) return;
  if (autopilotRunning.has(convId)) return;
  autopilotPausedMap.set(convId, false);
  notify("autopilotPaused", convId);
  autopilotRunning.add(convId);
  setTyping(convId, true);

  const conv = findConv(convId);
  const fanId = conv?.participant.id ?? "fan";

  try {
    const msgs = messagesMap.get(convId) ?? EMPTY_MESSAGES;
    const lastPurchaseCents = [...msgs].reverse()
      .find(m => m.contentType === "ppv" && m.ppv?.isPurchased)?.ppv?.price ?? 0;
    const fanMeta = {
      displayName: conv?.participant.displayName ?? "Fan",
      totalSpent_eur: Math.round(((conv?.totalSpent ?? 0) / 100)),
      tipVolume_eur: Math.round(((conv?.tipVolume ?? 0) / 100)),
      lastPurchaseAmount_eur: lastPurchaseCents > 0 ? lastPurchaseCents / 100 : null,
    };

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isFanUuid = UUID_RE.test(fanId);
    const modelIdRaw = conv?.profileId ?? null;
    const isModelUuid = !!modelIdRaw && UUID_RE.test(modelIdRaw);

    const [fanBrainRow, modelProfileRow] = await Promise.all([
      isFanUuid
        ? supabase.from("fan_brain").select("*").eq("fan_id", fanId).maybeSingle().then(r => r.data ?? null, () => null)
        : Promise.resolve(null),
      isModelUuid ? getModelProfileCached(modelIdRaw!) : Promise.resolve(null),
    ]);

    const history = buildCopilotHistory(convId).map(content => ({ role: "user" as const, content }));

    // Verhalten des Models: Tempo + Multi-Reply-Grenzen + Verkaufstempo
    const behavior = resolveChatBehavior((modelProfileRow as Record<string, unknown> | null)?.chat_behavior);

    // Gesprächsunterbrechung: lag vor der letzten Nachricht eine lange Pause,
    // ist die Stimmung zurückgesetzt und der Verkauf startet neu.
    const gapBefore = gapHoursBefore(msgs);
    const isColdRestart = gapBefore >= COLD_RESTART_HOURS;
    const funnelOpts = {
      tempo: behavior.salesTempo,
      startStage: behavior.salesStartStage,
      hoursSinceLastMessage: gapBefore,
      restartAtIso: isColdRestart ? msgs[msgs.length - 1]?.createdAt : undefined,
      // Es sind nur die letzten Nachrichten geladen — frühere Käufe müssen
      // mitgezählt werden, sonst fällt die Treppe zurück auf Stufe 1.
      clearedBefore: await clearedOffersBefore(convId, msgs[0]?.createdAt),
    };


    // Deterministische Verkaufs-Treppe: entscheidet, OB und ZU WELCHEM Preis
    // jetzt ein Angebot rausgeht — nicht mehr die Laune der KI.
    const funnel = computeFunnelState(msgs, fanId, funnelOpts);
    // Nach einer Pause bekommt das Model explizite Neustart-Regeln:
    // neues Gespräch statt Fortsetzung, kein Erinnern an alte Angebote.
    const restartContext = gapBefore >= 1
      ? restartRules({
          gapLabel: gapLabel(gapBefore),
          timeOfDay: timeOfDayLabel(new Date(msgs[msgs.length - 1].createdAt).getTime()),
          cold: isColdRestart,
          modelOpens: false,
        })
      : [];

    // Gedächtnis: erledigte Themen sind für Fragen gesperrt, offene Fäden
    // werden bevorzugt aufgegriffen — kein Erstkontakt-Gefühl an Tag 4.
    const topicMem = buildTopicMemory(msgs, (m) => m.senderId === mockCurrentUser.id);
    const brainDays = Number(
      ((fanBrainRow as Record<string, any> | null)?.relationship?.days_known) ?? 0,
    );
    const daysKnown = Math.max(brainDays, topicMem.daysKnown);

    // Eigenes Leben: fester Tagesverlauf pro Chat-Tag.
    const scene = dailyScene(convId, daysKnown + 1);
    const nowTs = new Date(msgs[msgs.length - 1]?.createdAt ?? Date.now()).getTime();

    const sessionContext = [
      ...restartContext,
      ...topicMemoryRules(topicMem, {
        fanName: (fanMeta.displayName ?? "").split(" ")[0] || undefined,
        daysKnownHint: daysKnown,
      }),
      ...dailySceneRules(scene, timeSlotOf(nowTs)),
    ];

    // Anti-Wiederholung: die letzten Model-Zeilen sind für diesen Zug gesperrt.
    const avoidLines = usedLines(msgs, (m) => m.senderId === mockCurrentUser.id);

    const askCopilot = async (extraAvoid: string[] = []) => {
      const { data, error } = await supabase.functions.invoke("chat-copilot", {
        body: {
          messages: history,
          fanMeta,
          modelPersona: buildModelPersonaPayload(modelProfileRow),
          knownFacts: fanFactsMap.get(convId) ?? {},
          fanId: isFanUuid ? fanId : null,
          fanBrain: fanBrainRow,
          autopilot: true,
          sessionContext,
          avoidLines: [...avoidLines.slice(0, 30), ...extraAvoid],
          salesFunnel: funnelPayload(funnel),
        },
      });
      if (error) throw error;
      if (!data || (data as any).error) throw new Error((data as any)?.error ?? "no_data");
      return data as CopilotBrief;
    };

    let brief = await askCopilot();
    copilotBriefMap.set(convId, brief);
    notify("copilotBrief", convId);
    if (brief.fanFacts && typeof brief.fanFacts === "object") mergeFanFacts(convId, brief.fanFacts);

    // Verhalten des Models (oben aus dem Profil aufgelöst) steuert das Tempo

    const f = delayFactor(behavior);
    const secs = (min: number, max: number) => Math.round(rand(min * 1000, max * 1000) * f);

    const readParts = (b: CopilotBrief) => {
      const s = b.suggestions?.[0];
      return [s?.text, s?.text2, (s as any)?.text3]
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    };

    let { fresh: parts, dropped } = filterFresh(readParts(brief), avoidLines);
    // War alles schon da → genau EIN neuer Versuch mit erweiterter Sperrliste.
    if (parts.length === 0 && dropped.length > 0) {
      brief = await askCopilot(dropped);
      copilotBriefMap.set(convId, brief);
      notify("copilotBrief", convId);
      parts = filterFresh(readParts(brief), avoidLines).fresh;
    }
    if (parts.length === 0) parts.push("hey 🙈");

    // Mehr Slots als erlaubt → zusammenfassen, statt sie zu verlieren
    if (parts.length > behavior.multiReplyMax) {
      const keep = parts.slice(0, behavior.multiReplyMax - 1);
      keep.push(parts.slice(behavior.multiReplyMax - 1).join(" "));
      parts = keep;
    }

    // Realistisches Tempo: kurz "tippen", dann Nachricht für Nachricht
    await sleep(secs(behavior.replyDelayMinSec, behavior.replyDelayMaxSec));
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        setTyping(convId, true);
        await sleep(secs(behavior.multiGapMinSec, behavior.multiGapMaxSec));
      }
      setTyping(convId, false);
      sendText(convId, fanId, parts[i]);
      await sleep(250);
    }


    // Angebot nur, wenn die Treppe es freigibt — die Stufe bestimmt den Preis.
    // Der Zustand wird nach den gesendeten Texten neu berechnet, damit ein
    // parallel gelöschtes/gekauftes PPV korrekt berücksichtigt wird.
    const funnelNow = computeFunnelState(messagesMap.get(convId) ?? EMPTY_MESSAGES, fanId, funnelOpts);

    const hint = brief.ppvHint;
    if (funnelNow.canOffer) {
      setTyping(convId, true);
      await sleep(secs(behavior.ppvDelayMinSec, behavior.ppvDelayMaxSec));

      setTyping(convId, false);
      // Die Überleitung steht als Caption UNTER den Medien — kein separater
      // Text-Ping mehr, damit der Fan nicht zweimal dasselbe liest.
      const caption = hint?.caption?.trim();
      sendPPV(
        convId,
        funnelNow.stage.priceCents,
        funnelNow.stage.config.mediaType,
        1,
        caption && caption.length > 0 ? caption : "hab da grad was für dich 🙈",
      );
    }

  } catch (e) {
    console.error("autopilot failed", e);
    copilotErrorMap.set(convId, "AI kurz weg…");
    notify("copilotError", convId);
  } finally {
    setTyping(convId, false);
    autopilotRunning.delete(convId);
    if (autopilotPending.delete(convId)) {
      setTimeout(() => { void runAutopilotTurn(convId); }, 600);
    }
  }
}


// =========================================================================
// Public actions
// =========================================================================
function sendText(convId: string, _fanId: string, text: string) {
  const id = newId();
  const msg: Message = {
    id, senderId: mockCurrentUser.id, contentType: "text", content: text,
    createdAt: new Date().toISOString(), status: "sent",
  };
  appendMsg(convId, msg);
  setLast(convId, text, true);
  void persistMessage(convId, msg);
  setTimeout(() => patchMsg(convId, id, { status: "delivered" }), 650);

  if (convId === AI_CONV_ID) {
    postPurchaseLock.delete(convId);
    setTimeout(() => patchMsg(convId, id, { status: "read" }), 900);
    void callAI(convId, { extraUserText: text });
    return;
  }
  setTimeout(() => patchMsg(convId, id, { status: "read" }), 900);
}

function sendChain(convId: string, fanId: string, text: string, text2: string, delayMs = 900) {
  sendText(convId, fanId, text);
  chainStatusMap.set(convId, { phase: "first-sent", total: 2, step: 1, etaMs: delayMs });
  notify("chainStatus", convId);
  setTimeout(() => {
    sendText(convId, fanId, text2);
    chainStatusMap.set(convId, { phase: "second-sent", total: 2, step: 2, etaMs: 0 });
    notify("chainStatus", convId);
    setTimeout(() => {
      chainStatusMap.set(convId, undefined);
      notify("chainStatus", convId);
    }, 1600);
  }, delayMs);
}

function sendTip(convId: string, fanId: string, amount: number, message: string) {
  const msg: Message = {
    id: newId(), senderId: fanId, contentType: "tip",
    tip: { amount, currency: "EUR", message },
    createdAt: new Date().toISOString(), status: "delivered",
  };
  appendMsg(convId, msg);
  setLast(convId, `Trinkgeld: ${(amount / 100).toFixed(2)} €`, false);
  void persistMessage(convId, msg);
  fx.sound("tip"); fx.haptic("snap");
}

function sendPPV(convId: string, price: number, mediaType: "photo" | "video" | "gallery", count: number, caption?: string) {
  const visualType: "photo" | "video" = mediaType === "video" ? "video" : "photo";
  const id = newId();
  const msg: Message = {
    id, senderId: mockCurrentUser.id, contentType: "ppv",
    ppv: { price, currency: "EUR", mediaType: visualType, mediaCount: count, previewUrl: null, isPurchased: false, caption },
    createdAt: new Date().toISOString(), status: "sent",
  };
  appendMsg(convId, msg);
  setLast(convId, caption?.trim() ? caption : (price === 0 ? "📎 PPV · Kostenlos" : `📎 PPV · ${(price / 100).toFixed(2)} €`), true);
  void persistMessage(convId, msg);
  setTimeout(() => patchMsg(convId, id, { status: "delivered" }), 700);
  fx.haptic("soft");
}

function purchasePPV(convId: string, msgId: string) {
  const cur = messagesMap.get(convId);
  if (!cur) return;
  messagesMap.set(convId, cur.map(m =>
    m.id === msgId && m.ppv ? { ...m, ppv: { ...m.ppv, isPurchased: true } } : m
  ));
  notify("messages", convId);
  fx.haptic("snap"); fx.sound("tip");
  // Kauf-Status in der Cloud festschreiben, damit er Reloads/Änderungen übersteht
  if (cloudConvIds.has(convId)) {
    void supabase
      .from("messages")
      .update({ ppv_is_purchased: true })
      .eq("id", msgId)
      .then(({ error }) => { if (error) console.error("purchasePPV persist failed", error); });
  }
}


function skipPPV(convId: string, msgId: string) {
  const m = (messagesMap.get(convId) ?? EMPTY_MESSAGES).find(x => x.id === msgId);
  fx.haptic("tick");
  if (convId === AI_CONV_ID) {
    void callAI(convId, {
      lastEvent: "skipped",
      ppvContext: m?.ppv ? { price_cents: m.ppv.price, media_type: m.ppv.mediaType } : null,
    });
  }
}

function markRead(convId: string) {
  const cur = messagesMap.get(convId);
  if (!cur) return;
  let changed = false;
  const next = cur.map(m => {
    if (m.senderId === mockCurrentUser.id) return m;
    if (m.status === "read") return m;
    changed = true;
    return { ...m, status: "read" as const };
  });
  if (!changed) return;
  messagesMap.set(convId, next);
  notify("messages", convId);
}

function ensureAIIntro(convId: string) {
  if (convId !== AI_CONV_ID) return;
  if (aiIntroDone.has(convId)) return;
  if ((messagesMap.get(convId) ?? EMPTY_MESSAGES).length > 0) { aiIntroDone.add(convId); return; }
  aiIntroDone.add(convId);
  void callAI(convId, { extraUserText: "(Fan hat den Chat gerade geöffnet, sage Hallo und starte das Gespräch.)" });
}

function triggerReengage(convId: string, opts: ReengageOpts) {
  postPurchaseLock.delete(convId);

  const dateLabel = opts.dayOffset === 0
    ? "heute (selber Tag)"
    : opts.dayOffset === 1
      ? "am nächsten Morgen (Tag +1, ca. 1 Tag Funkstille)"
      : `Tag +${opts.dayOffset} (also ${opts.dayOffset} Tage Funkstille seit der letzten Nachricht)`;

  const msgs = messagesMap.get(convId) ?? EMPTY_MESSAGES;
  const lastMia = [...msgs].reverse().find(m => m.senderId === AI_FAN_ID && m.contentType === "text" && m.content);
  const lastFan = [...msgs].reverse().find(m => m.senderId === mockCurrentUser.id && m.contentType === "text" && m.content);
  const lastMiaText = lastMia?.content?.slice(0, 240) ?? "(noch keine)";
  const lastFanText = lastFan?.content?.slice(0, 240) ?? "(Fan hat noch nichts geschrieben)";

  const recentMiaOpeners = msgs
    .filter(m => m.senderId === AI_FAN_ID && m.contentType === "text" && m.content)
    .slice(-6)
    .map(m => `• "${m.content?.slice(0, 140)}"`)
    .join("\n");

  const lastMiaEndsWithQuestion = !!lastMiaText && /[?]\s*$/.test(lastMiaText.trim());
  const fanSilent = !lastFan || (lastMia && new Date(lastMia.createdAt) > new Date(lastFan.createdAt));

  const silenceFraming = fanSilent
    ? `Letzter Stand: MIA hat zuletzt geschrieben${lastMiaEndsWithQuestion ? " und eine FRAGE gestellt die er nie beantwortet hat" : ""}. Der Fan hat seitdem NICHT geantwortet. Beziehe dich darauf — natürlich, nicht vorwurfsvoll.`
    : `Letzter Stand: Der FAN hatte zuletzt geschrieben. Knüpfe an seine letzte Aussage konkret an, als hätte sie die ganze Nacht/den Tag noch dran gedacht.`;

  // Gemeinsame Regeln mit dem Server-Loop (src/lib/reengage.ts)
  const morning = `${MORNING_RULES} ${silenceFraming}`;
  const midday = MIDDAY_RULES;


  const note = [
    `(SYSTEM-CONTEXT — NICHT zitieren, NICHT erwähnen, NICHT als Text ausgeben:`,
    `Zeit: ${dateLabel}, ${opts.time} Uhr. Mia schreibt JETZT von sich aus.`,
    ``,
    `Letzte MIA-Nachricht: "${lastMiaText}"`,
    `Letzte FAN-Nachricht: "${lastFanText}"`,
    ``,
    `Vermeide es, eine dieser zuletzt gesendeten Mia-Formulierungen zu wiederholen oder zu paraphrasieren:`,
    recentMiaOpeners || "(keine)",
    ``,
    `${opts.kind === "morning" ? morning : midday}`,
    ``,
    `Schreibe NUR die eigentliche Nachricht.)`,
  ].join("\n");

  const baselineUserCount = (messagesMap.get(convId) ?? EMPTY_MESSAGES).filter(m => m.senderId === mockCurrentUser.id).length;
  void callAI(convId, { extraUserText: note });

  const existing = autoFollowupTimers.get(convId);
  if (existing) { clearTimeout(existing); autoFollowupTimers.delete(convId); }

  if (opts.kind === "morning" && opts.autoMiddayDelaySec && opts.autoMiddayDelaySec > 0) {
    const middayTime = opts.middayTime ?? "12:30";
    autoFollowupTimers.set(convId, window.setTimeout(() => {
      autoFollowupTimers.delete(convId);
      const currentCount = (messagesMap.get(convId) ?? EMPTY_MESSAGES).filter(m => m.senderId === mockCurrentUser.id).length;
      if (currentCount <= baselineUserCount) {
        triggerReengage(convId, { dayOffset: opts.dayOffset, time: middayTime, kind: "midday" });
      }
    }, opts.autoMiddayDelaySec * 1000) as unknown as number);
  }
}

// Drafts
function setDraft(convId: string, text: string) {
  draftsMap.set(convId, text);
  notify("draft", convId);
}
function consumeDraft(convId: string): string | undefined {
  const v = draftsMap.get(convId);
  if (v == null) return undefined;
  draftsMap.delete(convId);
  notify("draft", convId);
  return v;
}
function openPpvDraft(convId: string, draft: PpvDraft) {
  ppvDraftsMap.set(convId, draft);
  notify("ppvDraft", convId);
}
function consumePpvDraft(convId: string): PpvDraft | undefined {
  const v = ppvDraftsMap.get(convId);
  if (v == null) return undefined;
  ppvDraftsMap.delete(convId);
  notify("ppvDraft", convId);
  return v;
}

function sendAsFan(convId: string, fanId: string, text: string) {
  const msg: Message = {
    id: newId(), senderId: fanId, contentType: "text", content: text,
    createdAt: new Date().toISOString(), status: "delivered",
  };
  appendMsg(convId, msg);
  setLast(convId, text, false);
  void persistMessage(convId, msg);
  fx.sound("receive"); fx.haptic("tick");
  if (isAutopilotConv(convId)) scheduleAutopilotTurn(convId);
}

/**
 * Sammelt schnell aufeinanderfolgende Fan-Nachrichten zu einem Burst,
 * damit die KI Multi-Replies (text2/text3) erzeugen kann statt nur Single-Replies.
 */
function scheduleAutopilotTurn(convId: string) {
  if (isSimConv(convId)) return; // serverseitig gesteuert
  if (autopilotPausedMap.get(convId)) return;
  const existing = autopilotTimers.get(convId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    autopilotTimers.delete(convId);
    if (autopilotPausedMap.get(convId)) return;
    if (autopilotRunning.has(convId)) {
      // Läuft noch → gleich danach nochmal versuchen, damit keine Fan-Nachricht liegen bleibt
      autopilotPending.add(convId);
      return;
    }
    void runAutopilotTurn(convId);
  }, Math.round(behaviorForConv(convId).burstWindowSec * 1000) || AUTOPILOT_BURST_WINDOW_MS);
  autopilotTimers.set(convId, t);
}

// =========================================================================
// Nachrichten löschen + Auto-Pilot pausieren / fortsetzen
// =========================================================================
const autopilotPausedMap = new Map<string, boolean>();

function setAutopilotPaused(convId: string, val: boolean) {
  if ((autopilotPausedMap.get(convId) ?? false) === val) return;
  autopilotPausedMap.set(convId, val);
  notify("autopilotPaused", convId);
}

/** Einzelne Nachricht (KI oder Fan) löschen — lokal + Cloud. Pausiert den Auto-Pilot. */
async function deleteMessage(convId: string, msgId: string) {
  const cur = messagesMap.get(convId) ?? EMPTY_MESSAGES;
  const next = cur.filter(m => m.id !== msgId);
  if (next.length !== cur.length) {
    messagesMap.set(convId, next);
    notify("messages", convId);
    const last = next[next.length - 1];
    setLast(convId, last ? previewOf(last) : "", last ? last.senderId === mockCurrentUser.id : false);
  }

  // Laufende / geplante Auto-Pilot-Turns abbrechen und pausieren
  const timer = autopilotTimers.get(convId);
  if (timer) { clearTimeout(timer); autopilotTimers.delete(convId); }
  autopilotPending.delete(convId);
  setTyping(convId, false);
  if (isAutopilotConv(convId)) setAutopilotPaused(convId, true);
  // Sim-Chat: auch den Server-Lauf anhalten, sonst schreibt er weiter
  if (isSimConv(convId)) void setSimState(convId, "paused");

  fx.haptic("tick");

  if (cloudConvIds.has(convId)) {
    const { error } = await supabase.from("messages").delete().eq("id", msgId);
    if (error) console.error("deleteMessage failed", error);
  }
}

/** Auto-Pilot nach einem Löschvorgang fortsetzen und neue Antwort generieren. */
function resumeAutopilot(convId: string) {
  setAutopilotPaused(convId, false);
  autopilotPending.delete(convId);
  fx.haptic("snap");
  if (isSimConv(convId)) {
    void resumeSimNow(convId);
    return;
  }
  void runAutopilotTurn(convId);
}



// Fan notes
function setFanNote(convId: string, text: string) {
  fanNotesMap.set(convId, text);
  notify("fanNote", convId);
  persistFanContext(convId);
}

// Fan facts (auto-collected by copilot AI)
function mergeFanFacts(convId: string, incoming: FanFacts, opts: { persist?: boolean } = {}) {
  const cur = fanFactsMap.get(convId) ?? {};
  const next: FanFacts = { ...cur };
  let changed = false;
  const strKeys: (keyof FanFacts)[] = ["name", "job", "location", "age", "relationship", "buyingPattern"];
  for (const k of strKeys) {
    const v = (incoming as any)[k];
    if (typeof v === "string" && v.trim() && v.trim() !== (cur as any)[k]) {
      (next as any)[k] = v.trim();
      changed = true;
    }
  }
  const arrKeys: (keyof FanFacts)[] = ["kinks", "dislikes", "other"];
  for (const k of arrKeys) {
    const v = (incoming as any)[k];
    if (Array.isArray(v) && v.length) {
      const merged = Array.from(new Set([...(((cur as any)[k] as string[]) ?? []), ...v.map(String).map(s => s.trim()).filter(Boolean)]));
      const trimmed = merged.slice(0, k === "other" ? 6 : 8);
      if (trimmed.length !== (((cur as any)[k] as string[]) ?? []).length) {
        (next as any)[k] = trimmed;
        changed = true;
      } else {
        (next as any)[k] = trimmed;
      }
    }
  }
  if (changed) {
    fanFactsMap.set(convId, next);
    notify("fanFacts", convId);
    if (opts.persist !== false) persistFanContext(convId);
  }
}
function clearFanFacts(convId: string) {
  fanFactsMap.delete(convId);
  notify("fanFacts", convId);
  persistFanContext(convId);
}

/**
 * Komplett-Reset einer Konversation:
 * - löscht lokal: Messages, Drafts, PPV-Drafts, Copilot-Brief, FanFacts, FanNote, Overrides, Locks, Timer
 * - bei Cloud-Konversationen: löscht alle Messages aus der DB und setzt fan_brain auf Default
 */
async function resetConversation(convId: string, fanId?: string | null) {
  // Cancel timers
  const followup = autoFollowupTimers.get(convId);
  if (followup) { clearTimeout(followup); autoFollowupTimers.delete(convId); }

  // Clear local state
  messagesMap.delete(convId);
  typingMap.delete(convId);
  lastOverrideMap.delete(convId);
  draftsMap.delete(convId);
  ppvDraftsMap.delete(convId);
  copilotBriefMap.delete(convId);
  copilotLoadingMap.delete(convId);
  copilotErrorMap.delete(convId);
  
  fanFactsMap.delete(convId);
  fanNotesMap.delete(convId);
  copilotDebugMap.delete(convId);
  postPurchaseLock.delete(convId);
  const fanCtxTimer = fanContextTimers.get(convId);
  if (fanCtxTimer) { clearTimeout(fanCtxTimer); fanContextTimers.delete(convId); }
  fanContextHydrated.delete(convId);

  // Update conversation last_message preview locally
  const conv = findConv(convId);
  if (conv) {
    conv.lastMessage = { content: "", createdAt: new Date().toISOString(), fromMe: false };
    conv.unreadCount = 0;
  }

  // Notify everyone
  (["messages","typing","lastOverride","draft","ppvDraft","copilotBrief","copilotLoading","copilotError","fanFacts","fanNote","copilotDebug"] as const).forEach(s => notify(s, convId));

  // Cloud cleanup via SECURITY DEFINER RPC (handles messages + conversation + fan_brain atomically, bypassing per-table RLS limits for chatters)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convId);
  if (cloudConvIds.has(convId) || isUuid) {
    try {
      const { error } = await (supabase as any).rpc("reset_conversation", { _conversation_id: convId });
      if (error) console.warn("reset_conversation rpc failed", error);
    } catch (e) { console.warn("reset_conversation rpc threw", e); }
  }
  void fanId;
}

// =========================================================================
// Stable actions object — identity never changes
// =========================================================================
export interface ChatActions {
  // reactive getters (non-subscribing — for use in handlers; use hooks for render)
  getMessages: (convId: string) => Message[];
  getLastOverride: (convId: string) => LastOverride | undefined;
  isTyping: (convId: string) => boolean;
  getCopilotBrief: (convId: string) => CopilotBrief | undefined;
  isCopilotLoading: (convId: string) => boolean;
  copilotError: (convId: string) => string | undefined;
  getDraft: (convId: string) => string | undefined;
  getPpvDraft: (convId: string) => PpvDraft | undefined;
  // mutators
  sendText: typeof sendText;
  sendChain: typeof sendChain;
  sendTip: typeof sendTip;
  sendPPV: typeof sendPPV;
  purchasePPV: typeof purchasePPV;
  skipPPV: typeof skipPPV;
  markRead: typeof markRead;
  ensureAIIntro: typeof ensureAIIntro;
  triggerReengage: typeof triggerReengage;
  setDraft: typeof setDraft;
  consumeDraft: typeof consumeDraft;
  openPpvDraft: typeof openPpvDraft;
  consumePpvDraft: typeof consumePpvDraft;
  runAutopilotTurn: typeof runAutopilotTurn;
  isAutopilot: (convId: string) => boolean;
  sendAsFan: typeof sendAsFan;
  setFanNote: typeof setFanNote;
  getFanNote: (convId: string) => string;
  getFanFacts: (convId: string) => FanFacts;
  clearFanFacts: typeof clearFanFacts;
  resetConversation: typeof resetConversation;
  deleteMessage: typeof deleteMessage;
  resumeAutopilot: typeof resumeAutopilot;
  isAutopilotPaused: (convId: string) => boolean;
}

const actions: ChatActions = {
  getMessages: (id) => messagesMap.get(id) ?? EMPTY_MESSAGES,
  getLastOverride: (id) => lastOverrideMap.get(id),
  isTyping: (id) => !!typingMap.get(id),
  getCopilotBrief: (id) => copilotBriefMap.get(id),
  isCopilotLoading: (id) => !!copilotLoadingMap.get(id),
  copilotError: (id) => copilotErrorMap.get(id),
  getDraft: (id) => draftsMap.get(id),
  getPpvDraft: (id) => ppvDraftsMap.get(id),
  sendText, sendChain, sendTip, sendPPV, purchasePPV, skipPPV, markRead,
  ensureAIIntro, triggerReengage,
  setDraft, consumeDraft, openPpvDraft, consumePpvDraft,
  sendAsFan, runAutopilotTurn,
  isAutopilot: isAutopilotConv,
  setFanNote,
  getFanNote: (id) => fanNotesMap.get(id) ?? "",
  getFanFacts: (id) => fanFactsMap.get(id) ?? {},
  clearFanFacts,
  resetConversation,
  deleteMessage,
  resumeAutopilot,
  isAutopilotPaused: (id) => !!autopilotPausedMap.get(id),
};

export function useAutopilotPaused(convId: string): boolean {
  const subscribe = useMemo(() => subscribeFactory("autopilotPaused", convId), [convId]);
  return useSyncExternalStore(subscribe, () => !!autopilotPausedMap.get(convId), () => false);
}

export function useFanFacts(convId: string): FanFacts {
  const subscribe = useMemo(() => subscribeFactory("fanFacts", convId), [convId]);
  return useSyncExternalStore(subscribe, () => fanFactsMap.get(convId) ?? EMPTY_FACTS, () => EMPTY_FACTS);
}
const EMPTY_FACTS: FanFacts = {};

// =========================================================================
// Public hooks
// =========================================================================
export function useChat(): ChatActions {
  return actions;
}

export function useMessages(convId: string): Message[] {
  const subscribe = useMemo(() => subscribeFactory("messages", convId), [convId]);
  return useSyncExternalStore(
    subscribe,
    () => messagesMap.get(convId) ?? EMPTY_MESSAGES,
    () => messagesMap.get(convId) ?? EMPTY_MESSAGES,
  );
}

export function useTyping(convId: string): boolean {
  const subscribe = useMemo(() => subscribeFactory("typing", convId), [convId]);
  return useSyncExternalStore(subscribe, () => !!typingMap.get(convId), () => false);
}

export function useLastOverride(convId: string): LastOverride | undefined {
  const subscribe = useMemo(() => subscribeFactory("lastOverride", convId), [convId]);
  return useSyncExternalStore(subscribe, () => lastOverrideMap.get(convId), () => undefined);
}

export function useDraft(convId: string): string | undefined {
  const subscribe = useMemo(() => subscribeFactory("draft", convId), [convId]);
  return useSyncExternalStore(subscribe, () => draftsMap.get(convId), () => undefined);
}

export function usePpvDraft(convId: string): PpvDraft | undefined {
  const subscribe = useMemo(() => subscribeFactory("ppvDraft", convId), [convId]);
  return useSyncExternalStore(subscribe, () => ppvDraftsMap.get(convId), () => undefined);
}


export function useCopilotBrief(convId: string): CopilotBrief | undefined {
  const subscribe = useMemo(() => subscribeFactory("copilotBrief", convId), [convId]);
  return useSyncExternalStore(subscribe, () => copilotBriefMap.get(convId), () => undefined);
}

export function useCopilotLoading(convId: string): boolean {
  const subscribe = useMemo(() => subscribeFactory("copilotLoading", convId), [convId]);
  return useSyncExternalStore(subscribe, () => !!copilotLoadingMap.get(convId), () => false);
}

export function useCopilotError(convId: string): string | undefined {
  const subscribe = useMemo(() => subscribeFactory("copilotError", convId), [convId]);
  return useSyncExternalStore(subscribe, () => copilotErrorMap.get(convId), () => undefined);
}

export function useFanNote(convId: string): string {
  const subscribe = useMemo(() => subscribeFactory("fanNote", convId), [convId]);
  return useSyncExternalStore(subscribe, () => fanNotesMap.get(convId) ?? "", () => "");
}

export function useChainStatus(convId: string): ChainStatus | undefined {
  const subscribe = useMemo(() => subscribeFactory("chainStatus", convId), [convId]);
  return useSyncExternalStore(subscribe, () => chainStatusMap.get(convId), () => undefined);
}

const EMPTY_DEBUG: CopilotDebugEntry[] = [];
export function useCopilotDebug(convId: string): CopilotDebugEntry[] {
  const subscribe = useMemo(() => subscribeFactory("copilotDebug", convId), [convId]);
  return useSyncExternalStore(subscribe, () => copilotDebugMap.get(convId) ?? EMPTY_DEBUG, () => EMPTY_DEBUG);
}

// =========================================================================
// Provider — kept for backward compat; no-op wrapper
// =========================================================================
export function ChatProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
