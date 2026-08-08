// =========================================================================
// Sim-Personas — Kundentypen für die 10 vollautomatischen Test-Chats.
//
// Die Sprach-Prompts leben in der Edge Function `fan-sim-bot`
// (gleiche Keys). Hier steht das *Verhalten*: Kaufneigung, Preisgrenze,
// Rabatt-Empfindlichkeit und Tempo/Tageszeiten für den Server-Loop.
// =========================================================================

export type SimPersonaKey =
  | "never_buyer"
  | "whale_all"
  | "dirty_talker"
  | "bonder"
  | "bargain_hunter"
  | "skeptic"
  | "shy_quiet"
  | "chaos_burster"
  | "ghoster"
  | "starter_buyer";

export interface SimPersona {
  key: SimPersonaKey;
  label: string;
  /** Kurzbeschreibung für die UI. */
  summary: string;
  /** Emotionaler Grund-Score-Bias (−20 bis +20). Bestimmt wie schnell
   *  der Fan kaufbereit ist. Skeptiker = −15, Whale = +20. */
  emotionalBias: number;
  /** Wie stark Bindung (gekaufte PPVs) die Kaufwahrscheinlichkeit
   *  steigert, in Prozentpunkten pro Kauf. */
  loyaltyBonusPct: number;
  /** Chance für einen emotionalen Surge (Spontan-Kauf-Welle) pro Turn. */
  surgeChancePct: number;
  /** Kostenlose Angebote werden fast immer geöffnet. */
  freeChancePct: number;
  /** Pause zwischen zwei Zügen innerhalb einer Session (Sekunden). */
  gapSec: [number, number];
  /** Nach so vielen Zügen macht der Fan eine längere Pause. */
  sessionTurns: [number, number];
  /** Länge dieser Pause in Stunden. */
  breakHours: [number, number];
  /** Chance, dass der Fan komplett abtaucht (Prozent pro Session-Ende). */
  ghostChancePct: number;
  /** Dauer des Abtauchens in Stunden. */
  ghostHours: [number, number];
}

export const SIM_PERSONAS: Record<SimPersonaKey, SimPersona> = {
  never_buyer: {
    key: "never_buyer",
    label: "Nie-Käufer",
    summary: "Nett, redet gern, kauft grundsätzlich nichts.",
    emotionalBias: -20,
    loyaltyBonusPct: 0,
    surgeChancePct: 0,
    freeChancePct: 85,
    gapSec: [90, 420],
    sessionTurns: [4, 8],
    breakHours: [5, 14],
    ghostChancePct: 10,
    ghostHours: [20, 40],},
  whale_all: {
    key: "whale_all",
    label: "Whale · kauft alles",
    summary: "Kauft jedes Angebot sofort, Preis ist egal.",
    emotionalBias: 20,
    loyaltyBonusPct: 5,
    surgeChancePct: 8,
    freeChancePct: 100,
    gapSec: [60, 240],
    sessionTurns: [5, 10],
    breakHours: [4, 10],
    ghostChancePct: 3,
    ghostHours: [12, 24],},
  dirty_talker: {
    key: "dirty_talker",
    label: "Dirty-Talker",
    summary: "Bleibt dauerhaft im anzüglichen Register, kauft selten.",
    emotionalBias: -5,
    loyaltyBonusPct: 3,
    surgeChancePct: 5,
    freeChancePct: 100,
    gapSec: [45, 200],
    sessionTurns: [6, 12],
    breakHours: [3, 9],
    ghostChancePct: 8,
    ghostHours: [10, 26],},
  bonder: {
    key: "bonder",
    label: "Bindungs-Typ",
    summary: "Viel Alltag und Nähe, kauft langsam aber immer öfter.",
    emotionalBias: 5,
    loyaltyBonusPct: 12,
    surgeChancePct: 6,
    freeChancePct: 95,
    gapSec: [120, 600],
    sessionTurns: [5, 11],
    breakHours: [6, 16],
    ghostChancePct: 5,
    ghostHours: [14, 30],},
  bargain_hunter: {
    key: "bargain_hunter",
    label: "Schnäppchenjäger",
    summary: "Kauft praktisch nur, wenn rabattiert wird.",
    emotionalBias: -10,
    loyaltyBonusPct: 4,
    surgeChancePct: 3,
    freeChancePct: 100,
    gapSec: [90, 380],
    sessionTurns: [4, 9],
    breakHours: [5, 14],
    ghostChancePct: 12,
    ghostHours: [16, 36],},
  skeptic: {
    key: "skeptic",
    label: "Skeptiker",
    summary: "Hinterfragt Preise, braucht viele Turns bis zum ersten Kauf.",
    emotionalBias: -15,
    loyaltyBonusPct: 10,
    surgeChancePct: 4,
    freeChancePct: 70,
    gapSec: [150, 700],
    sessionTurns: [3, 7],
    breakHours: [8, 20],
    ghostChancePct: 14,
    ghostHours: [18, 40],},
  shy_quiet: {
    key: "shy_quiet",
    label: "Schüchtern",
    summary: "Sehr kurze Nachrichten, kaum Initiative.",
    emotionalBias: -8,
    loyaltyBonusPct: 8,
    surgeChancePct: 5,
    freeChancePct: 90,
    gapSec: [180, 900],
    sessionTurns: [3, 6],
    breakHours: [7, 18],
    ghostChancePct: 15,
    ghostHours: [20, 44],},
  chaos_burster: {
    key: "chaos_burster",
    label: "Chaos-Burster",
    summary: "2–3 Nachrichten am Stück, springt zwischen Themen.",
    emotionalBias: 0,
    loyaltyBonusPct: 5,
    surgeChancePct: 10,
    freeChancePct: 100,
    gapSec: [40, 180],
    sessionTurns: [6, 14],
    breakHours: [3, 8],
    ghostChancePct: 9,
    ghostHours: [10, 22],},
  ghoster: {
    key: "ghoster",
    label: "Ghoster",
    summary: "Verschwindet tagelang und kommt dann wieder zurück.",
    emotionalBias: -5,
    loyaltyBonusPct: 6,
    surgeChancePct: 7,
    freeChancePct: 80,
    gapSec: [120, 500],
    sessionTurns: [2, 5],
    breakHours: [10, 24],
    ghostChancePct: 55,
    ghostHours: [30, 70],},
  starter_buyer: {
    key: "starter_buyer",
    label: "Einsteiger-Käufer",
    summary: "Kauft die günstigen Stufen, blockt ab 20 €.",
    emotionalBias: 10,
    loyaltyBonusPct: 5,
    surgeChancePct: 6,
    freeChancePct: 100,
    gapSec: [70, 300],
    sessionTurns: [5, 10],
    breakHours: [4, 12],
    ghostChancePct: 6,
    ghostHours: [12, 28],},
};

export function simPersona(key: string): SimPersona {
  return SIM_PERSONAS[key as SimPersonaKey] ?? SIM_PERSONAS.bonder;
}

/**
 * Emotionale Kaufentscheidung.
 *
 * Statt fester buyChancePct + harter Preis-Mauer basiert die Entscheidung auf
 * PPV-Moment-Score, emotionalem Bias, Bindung, Rabatt und seltenen Surges.
 * Es gibt KEIN hartes Preis-Limit mehr.
 */
export function decidePurchase(args: {
  persona: SimPersona;
  priceCents: number;
  discountPct: number;
  purchasedCount: number;
  ppvMomentScore: number;
}): boolean {
  const { persona, priceCents, discountPct, purchasedCount, ppvMomentScore } = args;

  if (priceCents <= 0) return Math.random() * 100 < persona.freeChancePct;
  if (persona.emotionalBias <= -20) return false;

  let chance = Math.max(0, Math.min(100, ppvMomentScore + persona.emotionalBias));
  chance += Math.min(40, purchasedCount * persona.loyaltyBonusPct);
  if (discountPct > 0) chance += Math.min(20, discountPct * 0.8);
  if (Math.random() * 100 < persona.surgeChancePct) chance += 35;
  if (priceCents > 2000) {
    const stepsOver = Math.ceil((priceCents - 2000) / 1000);
    chance -= stepsOver * 8;
  }
  chance = Math.max(0, Math.min(98, chance));
  return Math.random() * 100 < chance;
}
