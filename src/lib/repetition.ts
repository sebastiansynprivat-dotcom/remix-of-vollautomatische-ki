// =========================================================================
// Anti-Wiederholung.
//
// In langen Auto-Chats fällt die KI in Phrasen-Schleifen ("hehe…", "wetten
// du…", "glaube du…") — einzelne Zeilen kamen hunderte Male wortgleich.
// Dieses Modul liefert dafür drei Dinge:
//   1. `usedLines`  — die letzten Model-Nachrichten als Verbots-Liste,
//   2. `usedOpeners`— verbrauchte Satzanfänge (Cooldown),
//   3. `isTooSimilar` / `filterFresh` — harte Nachprüfung vor dem Senden.
//
// Rein textbasiert und deterministisch, damit Browser-Autopilot und
// Server-Simulation exakt dieselbe Bewertung benutzen.
// =========================================================================
import type { Message } from "@/data/mockData";

/** So viele der letzten Model-Nachrichten gelten als "verbraucht". */
export const REPEAT_WINDOW = 60;
/** Ab diesem Token-Overlap gilt eine Nachricht als Wiederholung. */
export const SIMILARITY_LIMIT = 0.6;
/** So viele Satzanfänge kommen in die Cooldown-Liste. */
export const OPENER_WINDOW = 12;

const STOPWORDS = new Set([
  "ich", "du", "ist", "das", "die", "der", "und", "so", "mal", "noch", "auch",
  "mir", "dir", "mich", "dich", "ein", "eine", "einen", "wie", "was", "wenn",
  "aber", "schon", "gar", "nicht", "mein", "dein", "es", "im", "in", "am",
  "zu", "bei", "für", "auf", "mit", "den", "dem", "eigentlich", "grad",
  "gerade", "jetzt", "hier", "da", "ja", "ne", "oder",
]);

export function normalizeLine(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalizeLine(text).split(" ").filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/** Token-Overlap (Jaccard) zweier Zeilen, 0…1. */
export function similarity(a: string, b: string): number {
  const na = normalizeLine(a), nb = normalizeLine(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = new Set(tokens(a)), tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let hits = 0;
  ta.forEach(t => { if (tb.has(t)) hits++; });
  return hits / Math.min(ta.size, tb.size);
}

/** Satzanfang (erste 4 bedeutungstragenden Wörter). */
export function openerOf(text: string): string {
  return normalizeLine(text).split(" ").slice(0, 4).join(" ");
}

/** Ist der Kandidat zu ähnlich zu einer der letzten Model-Nachrichten? */
export function isTooSimilar(candidate: string, recent: readonly string[]): boolean {
  const cand = normalizeLine(candidate);
  if (cand.length < 8) return false; // "hehe", "hey 🙈" darf sich wiederholen
  const candOpener = openerOf(candidate);
  for (const line of recent) {
    if (similarity(candidate, line) >= SIMILARITY_LIMIT) return true;
    if (candOpener && candOpener === openerOf(line) && cand.length < 90) return true;
  }
  return false;
}

/**
 * Die letzten Model-Texte (inkl. PPV-Captions) als Verbots-Liste,
 * neueste zuerst.
 */
export function usedLines(
  messages: readonly Message[],
  isModel: (m: Message) => boolean,
  limit = REPEAT_WINDOW,
): string[] {
  const out: string[] = [];
  for (let i = messages.length - 1; i >= 0 && out.length < limit; i--) {
    const m = messages[i];
    if (!isModel(m)) continue;
    const text = m.contentType === "ppv" ? m.ppv?.caption : m.content;
    if (typeof text === "string" && text.trim()) out.push(text.trim());
  }
  return out;
}

/** Häufigste verbrauchte Satzanfänge aus den letzten Model-Nachrichten. */
export function usedOpeners(lines: readonly string[], limit = OPENER_WINDOW): string[] {
  const seen = new Map<string, number>();
  for (const l of lines) {
    const o = openerOf(l);
    if (o) seen.set(o, (seen.get(o) ?? 0) + 1);
  }
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([o]) => o);
}

/**
 * Filtert Wiederholungen aus einem Multi-Reply-Zug: gegen die Historie UND
 * gegen die schon akzeptierten Teile desselben Zugs.
 */
export function filterFresh(parts: readonly string[], recent: readonly string[]): {
  fresh: string[];
  dropped: string[];
} {
  const fresh: string[] = [];
  const dropped: string[] = [];
  for (const p of parts) {
    const text = p.trim();
    if (!text) continue;
    if (isTooSimilar(text, [...recent, ...fresh])) dropped.push(text);
    else fresh.push(text);
  }
  return { fresh, dropped };
}

/** Prompt-Block: was gerade verbraucht ist und deshalb nicht wieder kommt. */
export function repetitionRules(lines: readonly string[]): string[] {
  if (lines.length === 0) return [];
  const openers = usedOpeners(lines);
  return [
    `=== VERBRAUCHT — NICHT WIEDERHOLEN (harte Regel) ===`,
    `Diese Nachrichten hat das Model gerade schon geschickt. Nichts davon darf`,
    `inhaltlich, im Bild oder im Satzbau noch einmal kommen — auch nicht umformuliert:`,
    ...lines.slice(0, 24).map(l => `· "${l.slice(0, 110)}"`),
    ...(openers.length
      ? [
          `Verbrauchte Satzanfänge (in diesem Zug gesperrt): ${openers.map(o => `"${o}"`).join(", ")}.`,
        ]
      : []),
    `→ Setze einen NEUEN Beat: anderes Thema, andere Sinneswahrnehmung, eigenes Erlebnis`,
    `  oder konkreter Callback auf ein Detail, das noch nicht dran war.`,
    `→ Verboten sind Dauerschleifen-Muster: "wetten du…", "glaube du…", "hehe…" als Opener,`,
    `  rhetorische Wett-Fragen und dasselbe Teaser-Bild in Variationen.`,
    "",
  ];
}
