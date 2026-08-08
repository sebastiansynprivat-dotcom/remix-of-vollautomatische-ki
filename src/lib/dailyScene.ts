// =========================================================================
// Tagesszene für das Model.
//
// Ohne eigenes Leben schreibt das Model endlose Teaser-Schleifen. Hier
// bekommt jeder Sim-Tag einen kleinen, festen Tagesplan (aufgewacht, Sport,
// Arbeit, Abend allein). Alle Nachrichten des Tages hängen daran — das
// erzeugt Abwechslung von sich aus.
//
// Deterministisch aus (Seed, Tag) — Browser und Server erzeugen für denselben
// Chat und denselben Tag garantiert dieselbe Szene.
// =========================================================================

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const MORNING = [
  "spät aufgewacht, Haare noch nass vom Duschen",
  "früh raus wegen einem Shooting-Termin",
  "verschlafen, Kaffee im Bett, noch im Shirt von gestern",
  "schlecht geschlafen, Nachbarn haben renoviert",
  "wach geworden und direkt aufs Handy geschaut",
];
const DAY = [
  "Content gedreht und danach ewig sortiert",
  "beim Sport gewesen, Beine tun weh",
  "Papierkram und Einkaufen, komplett unspektakulär",
  "mit einer Freundin Kaffee trinken",
  "Wäsche, Wohnung aufräumen, Musik laut",
  "Termin beim Friseur, Farbe nachgemacht",
  "Regen, deshalb den ganzen Nachmittag drin geblieben",
];
const EVENING = [
  "Abend allein auf dem Sofa, Serie läuft im Hintergrund",
  "Wein aufgemacht und Playlist an",
  "früh ins Bett gewollt und dann doch am Handy hängen geblieben",
  "Bad eingelassen, Kerzen an",
  "Freundin abgesagt, also Abend für sich",
];
const MOODS = [
  "gut gelaunt und gesprächig",
  "ruhig, ein bisschen verträumt",
  "leicht genervt vom Tag, aber froh über ihn",
  "verspielt und neckisch",
  "müde und kuschelbedürftig",
];

export interface DailyScene {
  day: number;
  morning: string;
  day_part: string;
  evening: string;
  mood: string;
}

/** Feste Szene für (Seed, Tag). */
export function dailyScene(seed: string, day: number): DailyScene {
  const base = hash(`${seed}:${day}`);
  const pick = <T,>(arr: T[], salt: number): T => arr[(base + salt * 7919) % arr.length]!;
  return {
    day,
    morning: pick(MORNING, 1),
    day_part: pick(DAY, 2),
    evening: pick(EVENING, 3),
    mood: pick(MOODS, 4),
  };
}

export type TimeSlot = "morgen" | "mittag" | "abend" | "nacht";

export function timeSlotOf(ts: number | Date): TimeSlot {
  const h = new Date(ts).getHours();
  if (h < 11) return "morgen";
  if (h < 17) return "mittag";
  if (h < 23) return "abend";
  return "nacht";
}

/** Prompt-Block: der heutige Tag des Models. Wird an `sessionContext` angehängt. */
export function dailySceneRules(scene: DailyScene, slot: TimeSlot): string[] {
  const now =
    slot === "morgen" ? scene.morning
    : slot === "mittag" ? scene.day_part
    : scene.evening;
  const past =
    slot === "morgen" ? []
    : slot === "mittag" ? [`Heute früh: ${scene.morning}.`]
    : [`Heute früh: ${scene.morning}. Danach: ${scene.day_part}.`];

  return [
    `=== DEIN TAG (Tag ${scene.day}) ===`,
    ...past,
    `Gerade (${slot}): ${now}.`,
    `Stimmung: ${scene.mood}.`,
    `→ Beziehe dich auf DIESEN konkreten Tag, wenn du von dir erzählst — kleine echte Details statt allgemeiner Sätze.`,
    `→ Kein Widerspruch zum Tag (nicht "grad vom Sport" wenn oben etwas anderes steht), keine Erfindung eines zweiten Tagesverlaufs.`,
    `→ Erzähl von dir BEVOR du etwas fragst: erst eigenes Erlebnis, dann höchstens eine Frage.`,
    "",
  ];
}
