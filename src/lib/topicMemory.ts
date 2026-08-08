// =========================================================================
// Themen-Gedächtnis.
//
// Problem in langen Auto-Chats: an Tag 4 fragt das Model dasselbe wie an
// Tag 1 ("wie heißt du?", "was arbeitest du?", "wie war dein tag?"). Dadurch
// klingt jeder Tag wie ein Erstkontakt statt wie ein gewachsener Chat.
//
// Dieses Modul liest den Verlauf und leitet daraus zwei Listen ab:
//   1. ERLEDIGT   — Themen, die schon besprochen wurden (gesperrt für Fragen)
//   2. OFFEN      — Dinge, die der Fan erzählt hat und auf die niemand
//                   zurückgekommen ist (bevorzugt aufgreifen)
// Dazu ein kleiner Beziehungs-Zeitstrahl, damit die KI weiß, wie lange man
// sich schon kennt.
//
// Rein textbasiert und deterministisch — Browser-Autopilot und Server-
// Simulation benutzen exakt dieselbe Ableitung.
// =========================================================================
import type { Message } from "@/data/mockData";
import { normalizeLine } from "./repetition";

export interface TopicDef {
  id: string;
  label: string;
  /** Wörter, die auf das Thema hindeuten (auf normalisiertem Text). */
  words: string[];
}

/** Themen-Katalog: bewusst grob, es geht um "war schon dran ja/nein". */
export const TOPIC_CATALOG: TopicDef[] = [
  { id: "name", label: "Name / Anrede", words: ["heisst", "heißt", "name", "nennen"] },
  { id: "job", label: "Arbeit / Beruf", words: ["arbeit", "arbeitest", "job", "beruf", "schicht", "chef", "kollegen", "büro", "buero", "baustelle", "firma"] },
  { id: "home", label: "Wohnort", words: ["wohnst", "wohne", "stadt", "gegend", "dorf", "wohnung", "zuhause"] },
  { id: "family", label: "Familie / Kinder", words: ["kinder", "kind", "sohn", "tochter", "mutter", "vater", "eltern", "bruder", "schwester", "oma"] },
  { id: "relationship", label: "Beziehung / Ex", words: ["freundin", "frau", "ex", "getrennt", "geschieden", "single", "verheiratet", "beziehung"] },
  { id: "pets", label: "Haustiere", words: ["hund", "katze", "haustier", "kater", "welpe"] },
  { id: "sport", label: "Sport / Fitness", words: ["sport", "gym", "training", "laufen", "fussball", "fußball", "fitness", "radfahren"] },
  { id: "hobby", label: "Hobbys", words: ["hobby", "hobbys", "angeln", "basteln", "schrauben", "grillen", "gitarre", "lesen", "gaming", "zocken", "playstation"] },
  { id: "travel", label: "Urlaub / Reisen", words: ["urlaub", "reise", "verreisen", "malle", "mallorca", "strand", "meer", "berge"] },
  { id: "media", label: "Musik / Filme / Serien", words: ["musik", "song", "band", "film", "serie", "netflix", "kino"] },
  { id: "food", label: "Essen / Trinken", words: ["essen", "gekocht", "kochen", "pizza", "kaffee", "bier", "wein", "frühstück", "fruehstueck"] },
  { id: "car", label: "Auto / Fahren", words: ["auto", "wagen", "motorrad", "fahren", "werkstatt"] },
  { id: "sleep", label: "Schlaf / Müdigkeit", words: ["schlaf", "geschlafen", "müde", "muede", "bett", "aufgewacht", "wecker"] },
  { id: "weekend", label: "Wochenende / Pläne", words: ["wochenende", "samstag", "sonntag", "feiertag", "frei", "pläne", "plaene", "vor"] },
  { id: "day", label: "Tagesverlauf", words: ["tag", "morgen", "abend", "feierabend", "mittag", "heute"] },
  { id: "mood", label: "Stimmung / Stress", words: ["stress", "gestresst", "einsam", "allein", "traurig", "genervt", "glücklich", "gluecklich"] },
  { id: "money", label: "Geld / Finanzen", words: ["geld", "gehalt", "miete", "teuer", "sparen", "rechnung", "konto"] },
  { id: "health", label: "Gesundheit", words: ["krank", "arzt", "rücken", "ruecken", "erkältet", "erkaeltet", "schmerz"] },
];

const MODEL_ID_HINT = "user-001";

function textOf(m: Message): string {
  if (m.contentType === "ppv") return m.ppv?.caption ?? "";
  return typeof m.content === "string" ? m.content : "";
}

function topicsIn(text: string): string[] {
  const n = ` ${normalizeLine(text)} `;
  const out: string[] = [];
  for (const t of TOPIC_CATALOG) {
    if (t.words.some(w => n.includes(` ${normalizeLine(w)}`))) out.push(t.id);
  }
  return out;
}

export interface TopicMemory {
  /** Themen, die im Verlauf schon vorkamen — Fragen dazu sind gesperrt. */
  covered: TopicDef[];
  /** Sätze des Fans, auf die das Model noch nicht eingegangen ist. */
  openThreads: string[];
  /** Wie viele Tage der Chat schon läuft (aus dem Verlauf). */
  daysKnown: number;
  /** Anzahl Fan-Nachrichten im geladenen Fenster. */
  fanMessages: number;
}

/**
 * Leitet das Themen-Gedächtnis aus dem Verlauf ab.
 * `isModel` sagt, welche Nachrichten vom Model stammen.
 */
export function buildTopicMemory(
  messages: readonly Message[],
  isModel: (m: Message) => boolean = (m) => m.senderId === MODEL_ID_HINT,
): TopicMemory {
  const covered = new Set<string>();
  const fanMsgs: Message[] = [];

  for (const m of messages) {
    const text = textOf(m);
    if (!text.trim()) continue;
    const hits = topicsIn(text);
    // Ein Thema gilt als erledigt, sobald es überhaupt im Chat vorkam —
    // egal ob das Model gefragt oder der Fan es erzählt hat.
    hits.forEach(h => covered.add(h));
    if (!isModel(m)) fanMsgs.push(m);
  }

  // Offene Fäden: persönliche Aussagen des Fans aus den letzten Nachrichten,
  // die das Model danach nicht aufgegriffen hat.
  const recentFan = fanMsgs.slice(-12);
  const openThreads: string[] = [];
  for (const fm of recentFan) {
    const text = textOf(fm).trim();
    if (text.length < 18) continue;
    const n = normalizeLine(text);
    const personal = /(\bich\b|\bmein|\bmir\b|\bmich\b|\bwir\b|\buns\b)/.test(n);
    if (!personal) continue;
    if (topicsIn(text).length === 0) continue;
    // Wurde danach von der Modelseite ein Stichwort daraus aufgegriffen?
    const idx = messages.indexOf(fm);
    const after = messages.slice(idx + 1).filter(isModel).map(textOf).join(" ");
    const keywords = n.split(" ").filter(w => w.length > 5);
    const pickedUp = keywords.some(w => normalizeLine(after).includes(w));
    if (!pickedUp) openThreads.push(text.slice(0, 140));
  }

  const first = messages[0]?.createdAt ? new Date(messages[0].createdAt).getTime() : Date.now();
  const last = messages[messages.length - 1]?.createdAt
    ? new Date(messages[messages.length - 1]!.createdAt).getTime()
    : first;
  const daysKnown = Math.max(0, Math.round((last - first) / 86_400_000));

  return {
    covered: TOPIC_CATALOG.filter(t => covered.has(t.id)),
    openThreads: openThreads.slice(-4),
    daysKnown,
    fanMessages: fanMsgs.length,
  };
}

/**
 * Prompt-Block: was schon besprochen ist, was noch offen ist und wie lange
 * man sich kennt. Wird an `sessionContext` angehängt.
 */
export function topicMemoryRules(mem: TopicMemory, args?: { fanName?: string; daysKnownHint?: number }): string[] {
  const days = args?.daysKnownHint ?? mem.daysKnown;
  const who = args?.fanName ? `mit ${args.fanName}` : "mit ihm";
  if (mem.covered.length === 0 && mem.openThreads.length === 0) return [];

  const lines = [
    `=== GEDÄCHTNIS: WAS SCHON WAR (harte Regel) ===`,
    days >= 1
      ? `Ihr schreibt ${who} seit ${days} Tag${days === 1 ? "" : "en"}. Das ist KEIN Erstkontakt — schreib wie zu jemandem, den du schon kennst: Vornamen/Kosename, Rückbezüge, Insider, gemeinsame Vorgeschichte.`
      : `Ihr schreibt heute schon länger ${who}. Kein Kennenlern-Modus mehr.`,
  ];

  if (mem.covered.length > 0) {
    lines.push(
      `ERLEDIGT — diese Themen wurden schon besprochen. NICHT nochmal fragen, sondern darauf AUFBAUEN:`,
      ...mem.covered.slice(0, 12).map(t => `· ${t.label}`),
      `→ Verboten: "wie heißt du", "was arbeitest du", "wie war dein tag", "was machst du so" und jede andere Frage zu einem erledigten Thema.`,
      `→ Stattdessen: konkret anknüpfen ("und, hat dein Chef sich beruhigt?") — als hättest du zugehört.`,
    );
  }

  if (mem.openThreads.length > 0) {
    lines.push(
      `OFFENE FÄDEN — er hat das erzählt, es ist untergegangen. Greif GENAU EINEN davon auf:`,
      ...mem.openThreads.map(t => `· "${t}"`),
    );
  }

  lines.push("");
  return lines;
}
