// =========================================================================
// Session-Rhythmus — Gesprächsunterbrechungen für die Auto-Chats.
//
// Ein Chat läuft nicht als Endloskette, sondern in Sessions:
//   Session (ein paar Züge) → Pause (Stunden / Nachtruhe / Funkstille)
//   → Neustart mit neuer Stimmung → nächste Session
//
// Hat der Fan in der Session gekauft, folgt am nächsten Morgen ein
// Guten-Morgen-Follow-up (ohne Verkauf). Nach `maxSimDays` ist der Lauf fertig.
// =========================================================================
import type { SimPersona } from "@/lib/simPersonas";

/** Ab dieser Pausenlänge gilt die Stimmung als zurückgesetzt (kalter Neustart). */
export const COLD_RESTART_HOURS = 6;
/** Wach-Fenster: Pausen, die nachts landen, werden hierher verschoben. */
export const WAKE_FROM_HOUR = 7;
export const WAKE_TO_HOUR = 23;
/** Standard-Lebensdauer eines Laufs in Sim-Tagen. */
export const DEFAULT_MAX_SIM_DAYS = 14;

export type SimPhase = "active" | "break" | "followup_due" | "done";

export interface RunRhythmState {
  /** Züge in der laufenden Session. */
  sessionTurn: number;
  phase: SimPhase;
  /** Käufe in der laufenden Session. */
  purchasesInSession: number;
  simDay: number;
  maxSimDays: number;
  /** Sim-Tag, an dem zuletzt ein Follow-up rausging. */
  lastFollowupDay: number;
}

export type BreakKind = "session" | "night" | "ghost";

export interface RhythmDecision {
  /** Was in diesem Zug passiert. */
  kind: "continue" | "restart" | "followup" | "done";
  /** Vor diesem Zug zu überspringende Stunden (0 = keine Pause). */
  gapHours: number;
  /** Art der Pause, wenn gapHours > 0. */
  breakKind: BreakKind | null;
  /** Eröffnet das Model den Neustart (statt des Fans)? */
  modelOpens: boolean;
  /** Kalter Neustart: Stimmung + Verkaufsspannung sind zurückgesetzt. */
  cold: boolean;
  /** Kurznotiz fürs Log. */
  note: string;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.round(rand(a, b));

export function rhythmFromRow(row: Record<string, unknown>): RunRhythmState {
  const phase = String(row.phase ?? "active");
  return {
    sessionTurn: Number(row.session_turn ?? 0),
    phase: (["active", "break", "followup_due", "done"].includes(phase) ? phase : "active") as SimPhase,
    purchasesInSession: Number(row.purchases_in_session ?? 0),
    simDay: Number(row.sim_day ?? 1),
    maxSimDays: Number(row.max_sim_days ?? DEFAULT_MAX_SIM_DAYS) || DEFAULT_MAX_SIM_DAYS,
    lastFollowupDay: Number(row.last_followup_day ?? 0),
  };
}

/**
 * Verschiebt einen Zeitpunkt ins Wach-Fenster: alles zwischen 23:00 und 07:00
 * wird auf den nächsten Morgen (07:00–10:00) gelegt.
 */
export function clampToWakeWindow(ts: number): { ts: number; movedHours: number } {
  const d = new Date(ts);
  const h = d.getUTCHours();
  if (h >= WAKE_FROM_HOUR && h < WAKE_TO_HOUR) return { ts, movedHours: 0 };
  const target = new Date(ts);
  if (h >= WAKE_TO_HOUR) target.setUTCDate(target.getUTCDate() + 1);
  target.setUTCHours(randInt(WAKE_FROM_HOUR, 10), randInt(0, 59), randInt(0, 59), 0);
  return { ts: target.getTime(), movedHours: Math.max(0, (target.getTime() - ts) / 3_600_000) };
}

/** Nächster Morgen (07:00–10:00) nach `ts`. */
export function nextMorning(ts: number): number {
  const d = new Date(ts);
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(randInt(WAKE_FROM_HOUR, 10), randInt(0, 59), randInt(0, 59), 0);
  return d.getTime();
}

/** Sim-Tag aus dem Zeitstempel, gemessen am Startzeitpunkt des Laufs. */
export function simDayFor(startIso: string | null | undefined, ts: number): number {
  if (!startIso) return 1;
  const start = new Date(startIso).getTime();
  if (!Number.isFinite(start)) return 1;
  return Math.max(1, Math.floor((ts - start) / 86_400_000) + 1);
}

/**
 * Entscheidet, was in diesem Zug passiert: normal weiterschreiben, nach einer
 * Pause neu anfangen, ein Käufer-Follow-up schicken oder den Lauf beenden.
 *
 * @param cursorTs Zeitstempel der letzten Nachricht (Sim-Zeit).
 * @param fanWantsEnd Fan-Bot hat die Session zuletzt beendet ([END]).
 */
export function decideRhythm(args: {
  persona: SimPersona;
  state: RunRhythmState;
  cursorTs: number;
  fanWantsEnd: boolean;
}): RhythmDecision {
  const { persona, state, cursorTs, fanWantsEnd } = args;

  if (state.simDay > state.maxSimDays) {
    return { kind: "done", gapHours: 0, breakKind: null, modelOpens: false, cold: false, note: `fertig (tag ${state.simDay})` };
  }

  // Käufer-Follow-up steht an: Morgen-Nachricht vom Model, kein Fan-Zug.
  if (state.phase === "followup_due") {
    const target = nextMorning(cursorTs);
    const gapHours = Math.max(1, (target - cursorTs) / 3_600_000);
    return {
      kind: "followup",
      gapHours,
      breakKind: "night",
      modelOpens: true,
      cold: true,
      note: `followup +${gapHours.toFixed(1)}h`,
    };
  }

  // Pause fällig? Session-Ende durch [END] oder erreichte Zuglänge.
  const sessionLimit = randInt(persona.sessionTurns[0], persona.sessionTurns[1]);
  const sessionOver = fanWantsEnd || state.sessionTurn >= sessionLimit;

  if (state.phase === "break" || sessionOver) {
    const ghost = Math.random() * 100 < persona.ghostChancePct;
    const rawHours = ghost
      ? rand(persona.ghostHours[0], persona.ghostHours[1])
      : rand(persona.breakHours[0], persona.breakHours[1]);
    const { movedHours } = clampToWakeWindow(cursorTs + rawHours * 3_600_000);
    const gapHours = rawHours + movedHours;
    const breakKind: BreakKind = ghost ? "ghost" : movedHours > 0 ? "night" : "session";
    // Wer eröffnet: Ghoster/Stille-Typen melden sich seltener selbst zurück.
    const modelOpens = Math.random() * 100 < (ghost ? 70 : 40);
    return {
      kind: "restart",
      gapHours,
      breakKind,
      modelOpens,
      cold: gapHours >= COLD_RESTART_HOURS,
      note: `pause ${gapHours.toFixed(1)}h (${breakKind})${modelOpens ? " model öffnet" : ""}`,
    };
  }

  return { kind: "continue", gapHours: 0, breakKind: null, modelOpens: false, cold: false, note: "" };
}

/** Menschlich lesbare Pausenlänge ("3 Std.", "2 Tage"). */
export function gapLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} Min.`;
  if (hours < 36) return `${hours.toFixed(hours < 6 ? 1 : 0)} Std.`;
  return `${(hours / 24).toFixed(1)} Tage`;
}

/** Tageszeit-Label für den Neustart-Prompt. */
export function timeOfDayLabel(ts: number): string {
  const h = new Date(ts).getUTCHours();
  if (h < 6) return "mitten in der Nacht";
  if (h < 11) return "morgens";
  if (h < 14) return "mittags";
  if (h < 18) return "nachmittags";
  if (h < 23) return "abends";
  return "spät abends";
}
