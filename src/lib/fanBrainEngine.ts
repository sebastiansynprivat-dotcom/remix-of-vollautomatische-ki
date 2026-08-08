// fanBrainEngine — pure computations on a FanBrain snapshot.
// Used both in the frontend (Drawer live-preview) and mirrored in the
// chat-copilot edge function (Deno copy).
import type { FanBrain } from "./fanBrain";

export type Tone = "safe" | "flirty" | "hard_sell";
export type FunnelStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type BridgeState =
  | "idle" | "armed" | "fan_ack" | "pitched" | "bought" | "declined" | "recovered";

export const FUNNEL_LABELS: Record<FunnelStep, string> = {
  1: "Hook", 2: "Qualify", 3: "Bond", 4: "Tease",
  5: "Bridge", 6: "Pitch", 7: "Close / After-Care",
};

const PRICE_LADDER_EUR = [5, 10, 20, 30, 50, 100];

export interface RecentMsg { from: "model" | "fan"; text: string; ts?: string }

// ---------------- helpers ----------------
function knownFactCount(b: FanBrain): number {
  let n = 0;
  if (b.identity?.name) n++;
  if (b.identity?.job_hint) n++;
  if (b.identity?.city_hint || b.identity?.country) n++;
  if (b.preferences?.kinks?.length) n++;
  if (b.preferences?.favorite_bridge) n++;
  if (b.emotional?.last_vulnerable_share) n++;
  return n;
}

function fanMsgCount(msgs: RecentMsg[]): number {
  return msgs.filter(m => m.from === "fan").length;
}

// ---------------- main ----------------
export function isAfterCareLocked(b: FanBrain): boolean {
  const until = b.signals?.after_care_lock_until;
  if (!until) return false;
  return new Date(until).getTime() > Date.now();
}

export function isWhale(b: FanBrain): boolean {
  return (b.commercial?.lifetime_spend ?? 0) >= 500
    || (b.commercial?.ladder_step ?? 0) >= 8
    || b.relationship?.stage === "whale";
}

export function nextLadderPriceEur(b: FanBrain): number {
  const last = b.commercial?.last_purchase_amount ?? 0;
  if (last <= 0) return 5;
  for (const step of PRICE_LADDER_EUR) {
    if (step > last) return step;
  }
  return 100;
}

export function computeFunnelStep(b: FanBrain, msgs: RecentMsg[]): FunnelStep {
  if (isAfterCareLocked(b)) return 7;
  const facts = knownFactCount(b);
  const fanCount = fanMsgCount(msgs);
  const bridge = b.signals?.bridge_state ?? "idle";

  if (bridge === "pitched") return 6;
  if (bridge === "armed" || bridge === "fan_ack") return 5;
  if (fanCount <= 1) return 1;
  if (fanCount <= 4 && facts < 2) return 2;
  if (facts < 3) return 3;
  return 4;
}

export function computeBridgeState(b: FanBrain, msgs: RecentMsg[]): BridgeState {
  // Stays primarily DB-driven — engine only nudges idle→armed when
  // a model message contains a bridge keyword and fan hasn't responded yet.
  const cur = (b.signals?.bridge_state ?? "idle") as BridgeState;
  if (cur !== "idle") return cur;
  const last3 = msgs.slice(-3);
  const lastModel = [...last3].reverse().find(m => m.from === "model");
  if (!lastModel) return "idle";
  const txt = lastModel.text.toLowerCase();
  const hit = /(dusche|shower|unterwäsche|lingerie|banane|outfit|gym|bett|morgens)/.test(txt);
  if (!hit) return "idle";
  const fanReplyAfter = msgs.slice(msgs.indexOf(lastModel) + 1).some(m => m.from === "fan");
  return fanReplyAfter ? "fan_ack" : "armed";
}

export function computePpvMomentScore(b: FanBrain, msgs: RecentMsg[]): number {
  if (isAfterCareLocked(b)) return Math.max(0, 20 - 0); // hard floor
  let s = 0;
  // Heat (0..35)
  const mood = b.emotional?.current_mood;
  if (mood === "horny") s += 35;
  else if (mood === "high") s += 22;
  else if (mood === "neutral") s += 10;
  else if (mood === "lonely") s += 14;
  // Funnel (0..25)
  const step = computeFunnelStep(b, msgs);
  if (step >= 6) s += 25; else if (step === 5) s += 18; else if (step === 4) s += 8;
  // Bridge (0..20)
  const br = b.signals?.bridge_state;
  if (br === "fan_ack") s += 20; else if (br === "armed") s += 10;
  // Spend-readiness (0..10)
  const dsl = b.commercial?.days_since_last_buy;
  if (dsl != null && dsl >= 1 && dsl <= 7) s += 10;
  else if ((b.commercial?.lifetime_spend ?? 0) > 0) s += 5;
  // Risk-clear (0..10)
  const rf = b.red_flags;
  const risk = (rf?.broke_signals ?? 0) + (rf?.aggression ?? 0) + (rf?.refund_threats ?? 0);
  if (risk === 0) s += 10; else if (risk <= 2) s += 5;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function allowedTones(b: FanBrain, msgs: RecentMsg[]): Tone[] {
  if (isAfterCareLocked(b)) return ["safe"];
  const step = computeFunnelStep(b, msgs);
  if (step <= 2) return ["safe"];
  if (step === 3) return ["safe", "flirty"];
  if (step === 4) return ["safe", "flirty"];
  // Step 5+: hard_sell allowed only when bridge is engaged and mood is up
  const score = computePpvMomentScore(b, msgs);
  if (score >= 65) return ["safe", "flirty", "hard_sell"];
  return ["safe", "flirty"];
}

export function selectCialdiniTriggers(b: FanBrain, msgs: RecentMsg[]): string[] {
  const out: string[] = [];
  const step = computeFunnelStep(b, msgs);
  if (step <= 3) out.push("Liking", "Reciprocity");
  if (step >= 4) out.push("Commitment", "Liking");
  if (step >= 5) out.push("Scarcity", "Authority");
  if (isWhale(b)) out.push("Unity");
  if (b.relationship?.promises_made?.length) out.push("Commitment");
  return Array.from(new Set(out)).slice(0, 4);
}

export function buildBrainSnapshotForPrompt(b: FanBrain): string {
  const c = b.commercial ?? ({} as any);
  const r = b.relationship ?? ({} as any);
  const e = b.emotional ?? ({} as any);
  const p = b.preferences ?? ({} as any);
  const i = b.identity ?? ({} as any);
  const rf = b.red_flags ?? ({} as any);
  const promises = (r.promises_made ?? []).slice(0, 3)
    .map((x: any) => `- "${x.text}"${x.due ? ` (bis ${x.due.slice(0,10)})` : ""}`).join("\n") || "- (keine offenen)";
  return [
    `FAN-BRAIN (vertraulich, NIE wörtlich zitieren — nutze als Hintergrundwissen):`,
    `· Identität: ${i.name ?? "?"}, ${i.job_hint ?? "?"}, ${i.city_hint ?? i.country ?? "?"}, ${i.relationship_status ?? "?"}`,
    `· Emotion: mood=${e.current_mood ?? "?"}, loneliness=${e.loneliness_score ?? 0}/100, last_share="${e.last_vulnerable_share ?? "—"}"`,
    `· Trigger ✚: ${(e.triggers_positive ?? []).join(", ") || "—"}`,
    `· Trigger ✕: ${(e.triggers_negative ?? []).join(", ") || "—"} (NIE auslösen)`,
    `· Vorlieben: kinks=${(p.kinks ?? []).join(", ") || "—"} | turn-offs=${(p.turn_offs ?? []).join(", ") || "—"}`,
    `· Bridge-Pref: ${p.favorite_bridge ?? "—"} | Pacing: ${p.pacing ?? "—"} | Format: ${(p.content_format_pref ?? []).join(", ") || "—"}`,
    `· Commerce: lifetime=${c.lifetime_spend ?? 0}€, last=${c.last_purchase_amount ?? 0}€ vor ${c.days_since_last_buy ?? "?"}d, ladder=${c.ladder_step ?? 1}/10, declined=${c.declined_count ?? 0}`,
    `· Beziehung: stage=${r.stage ?? "unknown"}, days=${r.days_known ?? 0}, jokes=${(r.inside_jokes ?? []).slice(0,2).join(" / ") || "—"}`,
    `· Spitznamen: er→sie ${(r.nicknames_for_her ?? []).join("/") || "—"}, sie→ihn ${(r.nicknames_for_him ?? []).join("/") || "—"}`,
    `· Offene Versprechen:`,
    promises,
    `· Red-Flags: broke=${rf.broke_signals ?? 0}, aggression=${rf.aggression ?? 0}, refund=${rf.refund_threats ?? 0}, scammer=${rf.scammer_score ?? 0}/100`,
  ].join("\n");
}

export function buildSpecRulesBlock(b: FanBrain, msgs: RecentMsg[]): string {
  const step = computeFunnelStep(b, msgs);
  const bridge = computeBridgeState(b, msgs);
  const score = computePpvMomentScore(b, msgs);
  const tones = allowedTones(b, msgs);
  const cialdini = selectCialdiniTriggers(b, msgs);
  const whale = isWhale(b);
  const aftercare = isAfterCareLocked(b);
  const nextPrice = nextLadderPriceEur(b);
  const stageRules: Record<FunnelStep, string> = {
    1: "Pure Aufmerksamkeit. Frage stellen, Bindung null. KEIN Sales, KEINE Sexualisierung.",
    2: "Qualifizieren: Name/Job/Tag/Stimmung herausfinden. KEIN Sales, KEINE Sexualisierung.",
    3: "Bonding: spiegeln, Kompliment, anknüpfen. KEIN Sales. Sanfte Wärme erlaubt.",
    4: "Tease: Andeutung, Spannung statt Beschreibung. Noch KEIN Pitch, KEINE Bridge im Imperativ.",
    5: "Bridge ist ARMED — die Caption/Suggestion MUSS eine Bridge cashen oder vertiefen. Noch KEIN harter Preis.",
    6: "Pitch erlaubt: Caption + Preis aus der Leiter. Genau EINEN klaren Move, sonst nichts.",
    7: "After-Care: Validation, Soft-Landing, NULL Sales-Vokabular, NULL neuer Pitch in den nächsten Stunden.",
  };
  return [
    `=== SPEC-CONSTRAINTS (HART, nicht verhandelbar) ===`,
    `Funnel-Step: ${step}/7 — ${FUNNEL_LABELS[step]}`,
    `→ ${stageRules[step]}`,
    `Bridge-State: ${bridge}` + (bridge === "armed" ? " — Recovery-Line vorbereiten falls Fan ignoriert." : ""),
    `PPV-Moment-Score: ${score}/100 — ppvHint.ready darf NUR true sein wenn ≥ 65, Funnel ≥ 5, kein After-Care-Lock.`,
    `Erlaubte Tones: ${tones.join(", ")} — JEDE suggestion mit anderem tone wird verworfen.`,
    `Cialdini-Trigger (mind. 1 nutzen): ${cialdini.join(", ") || "—"}`,
    `Nächste Ladder-Preis-Stufe: €${nextPrice} (NIE überspringen, NIE darunter).`,
    whale ? `WHALE-MODE AKTIV: längere Sätze, Daddy-Frame, exklusiver Wortschatz, höhere Preise. NIE 'andere Daddies'.` : `Whale-Mode: aus.`,
    aftercare ? `AFTER-CARE-LOCK AKTIV bis ${b.signals?.after_care_lock_until?.slice(11,16)}: ppvHint.ready=false ERZWUNGEN, suggestions ausschließlich tone='safe'.` : `After-Care-Lock: aus.`,
  ].join("\n");
}

export interface SpecContext {
  funnelStep: FunnelStep;
  bridgeState: BridgeState;
  ppvMomentScore: number;
  allowedTones: Tone[];
  cialdiniTriggers: string[];
  isWhale: boolean;
  isAfterCareLocked: boolean;
  nextPriceEur: number;
}

export function deriveSpecContext(b: FanBrain, msgs: RecentMsg[]): SpecContext {
  return {
    funnelStep: computeFunnelStep(b, msgs),
    bridgeState: computeBridgeState(b, msgs),
    ppvMomentScore: computePpvMomentScore(b, msgs),
    allowedTones: allowedTones(b, msgs),
    cialdiniTriggers: selectCialdiniTriggers(b, msgs),
    isWhale: isWhale(b),
    isAfterCareLocked: isAfterCareLocked(b),
    nextPriceEur: nextLadderPriceEur(b),
  };
}
