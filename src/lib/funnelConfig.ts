// =========================================================================
// Funnel-Konfiguration — von dir gepflegte Stufen-Liste.
//
// Jede Stufe: Label, Preis, Medientyp, Intensität (1–5) und wie viel Aufbau
// davor nötig ist. Der Auto-Pilot darf pro Angebot maximal EINE
// Intensitäts-Stufe weitergehen, dadurch springt nichts mehr von 0 auf 100.
// Persistenz: localStorage (überlebt Reloads, kein Reset bei Änderungen).
// =========================================================================

export type MediaType = "photo" | "video";

export interface FunnelStageConfig {
  id: string;
  /** Neutrales Label, das du selbst pflegst (erscheint im KI-Prompt). */
  label: string;
  /** Preis in Euro (0 = kostenlos). */
  priceEur: number;
  /**
   * Untergrenze in Euro, bis zu der die KI bei Wiederholungen rabattieren darf.
   * Gleich `priceEur` = kein Rabatt erlaubt.
   */
  minPriceEur: number;
  mediaType: MediaType;
  /** Intensität 1–5, von dir gesetzt. Steuert das Nicht-Überspringen. */
  intensity: number;
  /** Fan-Nachrichten Aufbau, die vor diesem Angebot nötig sind. */
  minFanTurns: number;
}

export const DEFAULT_FUNNEL_STAGES: FunnelStageConfig[] = [
  { id: "s1", label: "Stufe 1 — Einstieg (kostenlos)", priceEur: 0,  minPriceEur: 0,  mediaType: "photo", intensity: 1, minFanTurns: 8 },
  { id: "s2", label: "Stufe 2 — kleiner erster Kauf",  priceEur: 5,  minPriceEur: 5,  mediaType: "photo", intensity: 2, minFanTurns: 8 },
  { id: "s3", label: "Stufe 3 — Aufbau",               priceEur: 10, minPriceEur: 8,  mediaType: "photo", intensity: 3, minFanTurns: 10 },
  { id: "s4", label: "Stufe 4 — Video",                priceEur: 20, minPriceEur: 15, mediaType: "video", intensity: 4, minFanTurns: 12 },
  { id: "s5", label: "Stufe 5 — Top-Stufe",            priceEur: 30, minPriceEur: 22, mediaType: "video", intensity: 5, minFanTurns: 14 },
  { id: "s6", label: "Stufe 6 — Premium",              priceEur: 50, minPriceEur: 38, mediaType: "video", intensity: 5, minFanTurns: 16 },
  { id: "s7", label: "Stufe 7 — Top-Premium",          priceEur: 100, minPriceEur: 75, mediaType: "video", intensity: 5, minFanTurns: 20 },
];


const STORAGE_KEY = "fanbrain.funnelStages.v1";

let stages: FunnelStageConfig[] = DEFAULT_FUNNEL_STAGES.map(s => ({ ...s }));
let hydrated = false;
const listeners = new Set<() => void>();

function clampStage(s: Partial<FunnelStageConfig> & { minInteractions?: number }, i: number): FunnelStageConfig {
  const priceEur = Math.max(0, Math.round(Number(s.priceEur) || 0));
  const rawMin = s.minPriceEur === undefined || s.minPriceEur === null ? priceEur : Number(s.minPriceEur);
  return {
    id: typeof s.id === "string" && s.id ? s.id : `s${i + 1}`,
    label: typeof s.label === "string" && s.label.trim() ? s.label.trim() : `Stufe ${i + 1}`,
    priceEur,
    minPriceEur: Math.min(priceEur, Math.max(0, Math.round(Number.isFinite(rawMin) ? rawMin : priceEur))),
    mediaType: s.mediaType === "video" ? "video" : "photo",
    intensity: Math.min(5, Math.max(1, Math.round(Number(s.intensity) || 1))),
    minFanTurns: Math.min(20, Math.max(1, Math.round(Number(s.minFanTurns ?? s.minInteractions) || 3))),
  };
}

/** Stufen-Index (1-basiert) zu einem gespeicherten Medien-Wert finden. */
export function stepIndexForValueCents(steps: FunnelStageConfig[], cents: number): number {
  const i = steps.findIndex((s) => Math.round(s.priceEur * 100) === Math.round(cents || 0));
  return i >= 0 ? i + 1 : 0;
}


/**
 * Profil-eigene Stufen (JSON aus der Datenbank) in eine saubere Liste bringen.
 * Ungültig/leer → null, dann gelten die globalen Standard-Stufen.
 */
export function normalizeStepConfig(raw: unknown): FunnelStageConfig[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.map((s, i) => clampStage((s ?? {}) as Partial<FunnelStageConfig>, i));
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      stages = parsed.map(clampStage);
    }
  } catch {
    /* kaputter Eintrag → Defaults */
  }
}

export function getFunnelStages(): FunnelStageConfig[] {
  hydrate();
  return stages;
}

export function setFunnelStages(next: FunnelStageConfig[]) {
  hydrate();
  stages = (next.length > 0 ? next : DEFAULT_FUNNEL_STAGES).map(clampStage);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stages));
  } catch {
    /* Storage voll/blockiert — Änderung gilt trotzdem für diese Session */
  }
  listeners.forEach(l => l());
}

export function resetFunnelStages() {
  setFunnelStages(DEFAULT_FUNNEL_STAGES.map(s => ({ ...s })));
}

export function subscribeFunnelStages(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Stufe für Angebot Nr. n (1-basiert). Über die Liste hinaus wird die letzte
 * Stufe wiederholt: Preis und Aufbau steigen nur begrenzt, sonst landet ein
 * langer Chat irgendwann bei absurden Preisen und so viel nötigem Aufbau,
 * dass praktisch nie wieder ein Angebot rausgeht.
 */
const OVER_FAN_TURNS_MAX = 10;

export function stageConfigFor(offerNo: number, stepConfig?: FunnelStageConfig[] | null): FunnelStageConfig {
  const list = stepConfig && stepConfig.length > 0 ? stepConfig : getFunnelStages();
  const i = offerNo - 1;
  if (i < list.length) return list[i];
  const last = list[list.length - 1];
  const over = i - list.length + 1;
  return {
    ...last,
    id: `${last.id}+${over}`,
    label: `${last.label} (Wiederholung ${over})`,
    priceEur: last.priceEur,
    minFanTurns: Math.min(OVER_FAN_TURNS_MAX, last.minFanTurns + over),
  };
}

