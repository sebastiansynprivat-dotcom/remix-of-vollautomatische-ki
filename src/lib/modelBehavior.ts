/**
 * Model-Verhalten: Tempo, Multi-Reply, Schreibstil, Aktivzeiten, Verkaufstempo.
 *
 * Die Werte liegen pro Model in `model_profiles.chat_behavior` (jsonb).
 * Fehlt ein Wert, greift der Default — und die Defaults entsprechen exakt dem
 * Verhalten, das der Auto-Chat vor dieser Einstellung hart im Code hatte.
 */

export type EmojiFrequency = "none" | "sparse" | "normal" | "many";
export type MessageLength = "short" | "medium" | "long";
export type SalesTempo = "slow" | "normal" | "fast";

/** Ein Aktiv-Fenster (lokale Uhrzeit, "HH:MM") */
export type ActiveWindow = { from: string; to: string };



export type ChatBehavior = {
  /** Wartezeit bevor die erste Nachricht rausgeht (Sekunden) */
  replyDelayMinSec: number;
  replyDelayMaxSec: number;
  /** Pause zwischen zwei Nachrichten einer Multi-Reply (Sekunden) */
  multiGapMinSec: number;
  multiGapMaxSec: number;
  /** Wartezeit vor einem PPV (Sekunden) */
  ppvDelayMinSec: number;
  ppvDelayMaxSec: number;
  /** Wie lange auf weitere Fan-Nachrichten gewartet wird (Sekunden) */
  burstWindowSec: number;
  /** Multi-Reply */
  multiReplyMin: number;
  multiReplyMax: number;
  /** Schreibstil */
  lowercase: boolean;
  messageLength: MessageLength;
  typoRate: number; // 0–100
  petNames: string[];
  /** Aktivzeiten (lokale Uhrzeit, "HH:MM") — Legacy-Feld, entspricht dem ersten Fenster */
  activeFrom: string;
  activeTo: string;
  /** Mehrere Aktiv-Fenster pro Tag (z. B. mittags + abends) */
  activeWindows: ActiveWindow[];
  /**
   * Multiplikator auf ALLE Wartezeiten außerhalb der Aktivzeiten.
   * Keine Zeiteinheit — 1 = gleich schnell, 3 = dreimal so lange Pausen.
   * Pro Antwort wird ein Zufallswert zwischen Min und Max gezogen.
   */
  offHoursDelayFactor: number;
  offHoursDelayFactorMax: number;
  /** Verkauf */
  salesStartStage: number; // 0 = erste Stufe (gratis)
  salesTempo: SalesTempo;
};


export const DEFAULT_CHAT_BEHAVIOR: ChatBehavior = {
  replyDelayMinSec: 0.9,
  replyDelayMaxSec: 2.1,
  multiGapMinSec: 1.2,
  multiGapMaxSec: 2.4,
  ppvDelayMinSec: 1.2,
  ppvDelayMaxSec: 2.2,
  burstWindowSec: 2.8,
  multiReplyMin: 1,
  multiReplyMax: 3,
  lowercase: true,
  messageLength: "short",
  typoRate: 0,
  petNames: [],
  activeFrom: "08:00",
  activeTo: "23:59",
  activeWindows: [{ from: "08:00", to: "23:59" }],
  offHoursDelayFactor: 1,
  offHoursDelayFactorMax: 1,

  salesStartStage: 0,
  salesTempo: "normal",
};

const num = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map(s => s.trim()) : [];

const time = (v: unknown, fallback: string): string =>
  typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v.trim()) ? v.trim().padStart(5, "0") : fallback;

/** Fenster-Liste aus jsonb lesen; fällt auf das alte from/to-Paar zurück. */
function resolveWindows(r: Record<string, unknown>, d: ChatBehavior): ActiveWindow[] {
  const raw = Array.isArray(r.activeWindows) ? r.activeWindows : [];
  const list: ActiveWindow[] = raw
    .filter((w): w is Record<string, unknown> => !!w && typeof w === "object")
    .map((w) => ({ from: time(w.from, "08:00"), to: time(w.to, "23:59") }))
    .slice(0, 6);
  if (list.length) return list;
  return [{ from: time(r.activeFrom, d.activeFrom), to: time(r.activeTo, d.activeTo) }];
}

/** Rohes jsonb aus der DB in ein vollständiges, valides Verhalten überführen. */
export function resolveChatBehavior(raw: unknown): ChatBehavior {
  const d = DEFAULT_CHAT_BEHAVIOR;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...d, activeWindows: [...d.activeWindows] };
  const r = raw as Record<string, unknown>;

  const lengths: MessageLength[] = ["short", "medium", "long"];
  const tempos: SalesTempo[] = ["slow", "normal", "fast"];
  const windows = resolveWindows(r, d);

  const b: ChatBehavior = {
    replyDelayMinSec: num(r.replyDelayMinSec, d.replyDelayMinSec, 0, 600),
    replyDelayMaxSec: num(r.replyDelayMaxSec, d.replyDelayMaxSec, 0, 600),
    multiGapMinSec: num(r.multiGapMinSec, d.multiGapMinSec, 0, 600),
    multiGapMaxSec: num(r.multiGapMaxSec, d.multiGapMaxSec, 0, 600),
    ppvDelayMinSec: num(r.ppvDelayMinSec, d.ppvDelayMinSec, 0, 600),
    ppvDelayMaxSec: num(r.ppvDelayMaxSec, d.ppvDelayMaxSec, 0, 600),
    burstWindowSec: num(r.burstWindowSec, d.burstWindowSec, 0, 120),
    multiReplyMin: Math.round(num(r.multiReplyMin, d.multiReplyMin, 1, 3)),
    multiReplyMax: Math.round(num(r.multiReplyMax, d.multiReplyMax, 1, 3)),
    lowercase: typeof r.lowercase === "boolean" ? r.lowercase : d.lowercase,
    messageLength: lengths.includes(r.messageLength as MessageLength) ? (r.messageLength as MessageLength) : d.messageLength,
    typoRate: Math.round(num(r.typoRate, d.typoRate, 0, 100)),
    petNames: strArr(r.petNames).slice(0, 8),
    activeFrom: windows[0].from,
    activeTo: windows[0].to,
    activeWindows: windows,
    offHoursDelayFactor: num(r.offHoursDelayFactor, d.offHoursDelayFactor, 1, 20),
    offHoursDelayFactorMax: num(r.offHoursDelayFactorMax, num(r.offHoursDelayFactor, d.offHoursDelayFactorMax, 1, 20), 1, 20),
    salesStartStage: Math.round(num(r.salesStartStage, d.salesStartStage, 0, 10)),
    salesTempo: tempos.includes(r.salesTempo as SalesTempo) ? (r.salesTempo as SalesTempo) : d.salesTempo,
  };

  // Min/Max nie verdreht
  if (b.replyDelayMaxSec < b.replyDelayMinSec) b.replyDelayMaxSec = b.replyDelayMinSec;
  if (b.multiGapMaxSec < b.multiGapMinSec) b.multiGapMaxSec = b.multiGapMinSec;
  if (b.ppvDelayMaxSec < b.ppvDelayMinSec) b.ppvDelayMaxSec = b.ppvDelayMinSec;

  if (b.multiReplyMax < b.multiReplyMin) b.multiReplyMax = b.multiReplyMin;
  return b;
}

export function resolveEmojiFrequency(raw: unknown): EmojiFrequency {
  const all: EmojiFrequency[] = ["none", "sparse", "normal", "many"];
  return all.includes(raw as EmojiFrequency) ? (raw as EmojiFrequency) : "normal";
}

/** Maximale Emojis pro Nachricht — steuert die Nachprüfung der KI-Antwort. */
export function emojiCap(freq: EmojiFrequency): number {
  switch (freq) {
    case "none": return 0;
    case "sparse": return 1;
    case "many": return 3;
    default: return 2;
  }
}

/** Liegt `now` in mindestens einem der Aktiv-Fenster? */
export function isWithinActiveHours(b: ChatBehavior, now: Date = new Date()): boolean {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return (h % 24) * 60 + (m % 60);
  };
  const cur = now.getHours() * 60 + now.getMinutes();
  const windows = b.activeWindows?.length ? b.activeWindows : [{ from: b.activeFrom, to: b.activeTo }];
  return windows.some((w) => {
    const from = toMin(w.from);
    const to = toMin(w.to);
    if (from === to) return true;
    return from < to ? cur >= from && cur <= to : cur >= from || cur <= to;
  });
}

/**
 * Delay-Faktor: außerhalb der Aktivzeiten antwortet sie langsamer.
 * Multiplikator (keine Zeiteinheit), zufällig zwischen Min und Max.
 */
export function delayFactor(b: ChatBehavior, now: Date = new Date()): number {
  if (isWithinActiveHours(b, now)) return 1;
  const min = Math.max(1, b.offHoursDelayFactor);
  const max = Math.max(min, b.offHoursDelayFactorMax ?? min);
  return min + Math.random() * (max - min);

}

export const LENGTH_LABEL: Record<MessageLength, string> = {
  short: "kurz (1 Satz)",
  medium: "mittel (1–2 Sätze)",
  long: "länger (2–3 Sätze)",
};

export const EMOJI_FREQ_LABEL: Record<EmojiFrequency, string> = {
  none: "keine",
  sparse: "sparsam",
  normal: "normal",
  many: "viele",
};

export const SALES_TEMPO_LABEL: Record<SalesTempo, string> = {
  slow: "langsam (mehr Bonding)",
  normal: "normal",
  fast: "schnell (früher Angebote)",
};

export type ModelStyleFields = {
  emojis: string[];
  emojiFrequency: EmojiFrequency;
  signaturePhrases: string[];
  tabooWords: string[];
  openers: string[];
  behavior: ChatBehavior;
};

/**
 * Der Stil-Block, der zusätzlich zum Steckbrief in den System-Prompt geht.
 * Wird auch im Admin als Vorschau angezeigt — was hier steht, sieht die KI.
 */
export function buildStyleBlock(s: ModelStyleFields): string {
  const b = s.behavior;
  const lines: string[] = [];
  lines.push(`Nachrichtenlänge: ${LENGTH_LABEL[b.messageLength]}.`);
  lines.push(b.lowercase ? "Schreibweise: konsequent klein geschrieben." : "Schreibweise: normale Groß-/Kleinschreibung.");
  lines.push(`Multi-Reply: ${b.multiReplyMin}–${b.multiReplyMax} Nachrichten pro Antwort.`);
  if (b.typoRate > 0) lines.push(`Natürlichkeit: gelegentlich (~${b.typoRate}% der Nachrichten) ein kleiner Tippfehler oder abgekürztes Wort.`);
  if (b.petNames.length) lines.push(`Kosenamen für den Fan: ${b.petNames.join(", ")}.`);
  if (s.emojiFrequency === "none") {
    lines.push("Emojis: keine verwenden.");
  } else {
    lines.push(`Emojis: ${EMOJI_FREQ_LABEL[s.emojiFrequency]} (max. ${emojiCap(s.emojiFrequency)} pro Nachricht).`);
    if (s.emojis.length) lines.push(`Ausschließlich diese Emojis verwenden: ${s.emojis.join(" ")}`);
  }
  if (s.signaturePhrases.length) lines.push(`Typische Phrasen (immer wieder einstreuen, nie alle auf einmal): ${s.signaturePhrases.map(p => `„${p}"`).join(", ")}`);
  if (s.tabooWords.length) lines.push(`TABU — diese Wörter/Themen kommen NIE vor: ${s.tabooWords.join(", ")}`);
  if (s.openers.length) lines.push(`Begrüßungsvarianten für neue Chats: ${s.openers.map(p => `„${p}"`).join(", ")}`);
  lines.push(`Verkaufstempo: ${SALES_TEMPO_LABEL[b.salesTempo]}.`);
  return lines.join("\n");
}

/** Rohzeile aus `model_profiles` in die Stil-Felder überführen. */
export function extractStyleFields(row: unknown): ModelStyleFields {
  const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
  return {
    emojis: strArr(r.emojis).slice(0, 24),
    emojiFrequency: resolveEmojiFrequency(r.emoji_frequency ?? r.emojiFrequency),
    signaturePhrases: strArr(r.signature_phrases ?? r.signaturePhrases).slice(0, 8),
    tabooWords: strArr(r.taboo_words ?? r.tabooWords).slice(0, 24),
    openers: strArr(r.openers).slice(0, 8),
    behavior: resolveChatBehavior(r.chat_behavior ?? r.chatBehavior),
  };
}
