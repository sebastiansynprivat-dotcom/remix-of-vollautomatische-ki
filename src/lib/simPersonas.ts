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
  /** Grund-Kaufwahrscheinlichkeit in Prozent (0–100). */
  buyChancePct: number;
  /** Alles über dieser Grenze wird nie gekauft (Cent). 0 = keine Grenze. */
  maxPriceCents: number;
  /** Bonus-Prozentpunkte auf die Kaufchance, wenn rabattiert wurde. */
  discountBonusPct: number;
  /** Bonus je gekauftem PPV (Bindung wächst) in Prozentpunkten. */
  loyaltyBonusPct: number;
  /** Kostenlose Angebote (0 €) werden fast immer geöffnet. */
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
    buyChancePct: 0,
    maxPriceCents: 0,
    discountBonusPct: 0,
    loyaltyBonusPct: 0,
    freeChancePct: 85,
    gapSec: [90, 420],
    sessionTurns: [4, 8],
    breakHours: [5, 14],
    ghostChancePct: 10,
    ghostHours: [20, 40],
  },
  whale_all: {
    key: "whale_all",
    label: "Whale · kauft alles",
    summary: "Kauft jedes Angebot sofort, Preis ist egal.",
    buyChancePct: 96,
    maxPriceCents: 0,
    discountBonusPct: 0,
    loyaltyBonusPct: 0,
    freeChancePct: 100,
    gapSec: [60, 240],
    sessionTurns: [5, 10],
    breakHours: [4, 10],
    ghostChancePct: 3,
    ghostHours: [12, 24],
  },
  dirty_talker: {
    key: "dirty_talker",
    label: "Dirty-Talker",
    summary: "Bleibt dauerhaft im anzüglichen Register, kauft selten.",
    buyChancePct: 18,
    maxPriceCents: 1000,
    discountBonusPct: 10,
    loyaltyBonusPct: 3,
    freeChancePct: 100,
    gapSec: [45, 200],
    sessionTurns: [6, 12],
    breakHours: [3, 9],
    ghostChancePct: 8,
    ghostHours: [10, 26],
  },
  bonder: {
    key: "bonder",
    label: "Bindungs-Typ",
    summary: "Viel Alltag und Nähe, kauft langsam aber immer öfter.",
    buyChancePct: 35,
    maxPriceCents: 3000,
    discountBonusPct: 8,
    loyaltyBonusPct: 12,
    freeChancePct: 95,
    gapSec: [120, 600],
    sessionTurns: [5, 11],
    breakHours: [6, 16],
    ghostChancePct: 5,
    ghostHours: [14, 30],
  },
  bargain_hunter: {
    key: "bargain_hunter",
    label: "Schnäppchenjäger",
    summary: "Kauft praktisch nur, wenn rabattiert wird.",
    buyChancePct: 8,
    maxPriceCents: 2500,
    discountBonusPct: 65,
    loyaltyBonusPct: 4,
    freeChancePct: 100,
    gapSec: [90, 380],
    sessionTurns: [4, 9],
    breakHours: [5, 14],
    ghostChancePct: 12,
    ghostHours: [16, 36],
  },
  skeptic: {
    key: "skeptic",
    label: "Skeptiker",
    summary: "Hinterfragt Preise, braucht viele Turns bis zum ersten Kauf.",
    buyChancePct: 14,
    maxPriceCents: 1500,
    discountBonusPct: 22,
    loyaltyBonusPct: 10,
    freeChancePct: 70,
    gapSec: [150, 700],
    sessionTurns: [3, 7],
    breakHours: [8, 20],
    ghostChancePct: 14,
    ghostHours: [18, 40],
  },
  shy_quiet: {
    key: "shy_quiet",
    label: "Schüchtern",
    summary: "Sehr kurze Nachrichten, kaum Initiative.",
    buyChancePct: 22,
    maxPriceCents: 2000,
    discountBonusPct: 12,
    loyaltyBonusPct: 8,
    freeChancePct: 90,
    gapSec: [180, 900],
    sessionTurns: [3, 6],
    breakHours: [7, 18],
    ghostChancePct: 15,
    ghostHours: [20, 44],
  },
  chaos_burster: {
    key: "chaos_burster",
    label: "Chaos-Burster",
    summary: "2–3 Nachrichten am Stück, springt zwischen Themen.",
    buyChancePct: 30,
    maxPriceCents: 2000,
    discountBonusPct: 15,
    loyaltyBonusPct: 5,
    freeChancePct: 100,
    gapSec: [40, 180],
    sessionTurns: [6, 14],
    breakHours: [3, 8],
    ghostChancePct: 9,
    ghostHours: [10, 22],
  },
  ghoster: {
    key: "ghoster",
    label: "Ghoster",
    summary: "Verschwindet tagelang und kommt dann wieder zurück.",
    buyChancePct: 25,
    maxPriceCents: 2000,
    discountBonusPct: 18,
    loyaltyBonusPct: 6,
    freeChancePct: 80,
    gapSec: [120, 500],
    sessionTurns: [2, 5],
    breakHours: [10, 24],
    ghostChancePct: 55,
    ghostHours: [30, 70],
  },
  starter_buyer: {
    key: "starter_buyer",
    label: "Einsteiger-Käufer",
    summary: "Kauft die günstigen Stufen, blockt ab 20 €.",
    buyChancePct: 70,
    maxPriceCents: 2000,
    discountBonusPct: 20,
    loyaltyBonusPct: 5,
    freeChancePct: 100,
    gapSec: [70, 300],
    sessionTurns: [5, 10],
    breakHours: [4, 12],
    ghostChancePct: 6,
    ghostHours: [12, 28],
  },
};

export function simPersona(key: string): SimPersona {
  return SIM_PERSONAS[key as SimPersonaKey] ?? SIM_PERSONAS.bonder;
}

/** Kaufentscheidung für ein offenes Angebot. */
export function decidePurchase(args: {
  persona: SimPersona;
  priceCents: number;
  discountPct: number;
  purchasedCount: number;
}): boolean {
  const { persona, priceCents, discountPct, purchasedCount } = args;
  if (priceCents <= 0) return Math.random() * 100 < persona.freeChancePct;
  if (persona.buyChancePct <= 0) return false;
  if (persona.maxPriceCents > 0 && priceCents > persona.maxPriceCents) return false;

  let chance = persona.buyChancePct;
  if (discountPct > 0) chance += persona.discountBonusPct;
  chance += Math.min(30, purchasedCount * persona.loyaltyBonusPct);
  return Math.random() * 100 < Math.min(98, chance);
}
