// =========================================================================
// Sim-Runs — Client-Anbindung an die serverseitig laufenden Test-Chats.
//
// Der Chat-Verlauf wird vom Server (Route /api/public/sim-tick, per Cron)
// erzeugt. Hier lesen wir nur den Status und schalten Pause/Weiter.
// =========================================================================
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SimRun {
  id: string;
  conversationId: string;
  persona: string;
  state: "running" | "paused" | "completed";
  nextRunAt: string;
  simDay: number;
  turnCount: number;
  lastError: string | null;
  /** Session-Rhythmus: aktiv, in Pause, Follow-up fällig oder fertig. */
  phase: "active" | "break" | "followup_due" | "done";
  sessionTurn: number;
  gapHours: number;
  purchasesInSession: number;
  maxSimDays: number;
}

const simConvIds = new Set<string>();
const runsByConv = new Map<string, SimRun>();
const listeners = new Set<() => void>();

/** True, wenn dieser Chat vom Server gesteuert wird (kein Browser-Autopilot). */
export function isSimConv(convId: string): boolean {
  return simConvIds.has(convId);
}

export function getSimRun(convId: string): SimRun | undefined {
  return runsByConv.get(convId);
}

function emit() {
  listeners.forEach((l) => l());
}

function mapRow(r: Record<string, unknown>): SimRun {
  const phase = String(r.phase ?? "active");
  return {
    id: String(r.id),
    conversationId: String(r.conversation_id),
    persona: String(r.persona),
    state: r.state === "paused" ? "paused" : r.state === "completed" ? "completed" : "running",
    nextRunAt: String(r.next_run_at),
    simDay: Number(r.sim_day ?? 1),
    turnCount: Number(r.turn_count ?? 0),
    lastError: (r.last_error as string | null) ?? null,
    phase: (["active", "break", "followup_due", "done"].includes(phase) ? phase : "active") as SimRun["phase"],
    sessionTurn: Number(r.session_turn ?? 0),
    gapHours: Number(r.gap_hours ?? 0),
    purchasesInSession: Number(r.purchases_in_session ?? 0),
    maxSimDays: Number(r.max_sim_days ?? 14),
  };
}


async function loadRuns() {
  const { data, error } = await supabase.from("sim_runs").select("*");
  if (error) {
    console.error("sim_runs load failed", error);
    return;
  }
  runsByConv.clear();
  simConvIds.clear();
  (data ?? []).forEach((r) => {
    const run = mapRow(r as Record<string, unknown>);
    runsByConv.set(run.conversationId, run);
    simConvIds.add(run.conversationId);
  });
  emit();
}

let subscribed = false;
function ensureSubscription() {
  if (subscribed) return;
  subscribed = true;
  supabase
    .channel("sim-runs")
    .on("postgres_changes", { event: "*", schema: "public", table: "sim_runs" }, () => {
      void loadRuns();
    })
    .subscribe();
}

/** Lädt alle Sim-Läufe und hält sie aktuell. */
export function useSimRuns(): { runs: Map<string, SimRun>; version: number } {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    listeners.add(bump);
    void loadRuns();
    ensureSubscription();
    return () => { listeners.delete(bump); };
  }, []);

  return { runs: runsByConv, version };
}

/** Status eines einzelnen Sim-Chats (re-rendert bei Änderungen). */
export function useSimRun(convId: string | null): SimRun | null {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    listeners.add(bump);
    return () => { listeners.delete(bump); };
  }, []);
  return convId ? runsByConv.get(convId) ?? null : null;
}

export async function setSimState(convId: string, state: "running" | "paused") {
  const run = runsByConv.get(convId);
  if (run) {
    runsByConv.set(convId, { ...run, state });
    emit();
  }
  const patch = state === "running"
    ? { state, next_run_at: new Date().toISOString() }
    : { state };
  const { error } = await supabase.from("sim_runs").update(patch).eq("conversation_id", convId);
  if (error) {
    console.error("setSimState failed", error);
    void loadRuns();
  }
}

export async function setAllSimStates(state: "running" | "paused") {
  runsByConv.forEach((run, id) => runsByConv.set(id, { ...run, state }));
  emit();
  const patch = state === "running"
    ? { state, next_run_at: new Date().toISOString() }
    : { state };
  const { error } = await supabase.from("sim_runs").update(patch).neq("state", state);
  if (error) console.error("setAllSimStates failed", error);
  void loadRuns();
}

/** Nach einer Löschung: Lauf sofort fortsetzen und neu generieren lassen. */
export async function resumeSimNow(convId: string) {
  await setSimState(convId, "running");
}
