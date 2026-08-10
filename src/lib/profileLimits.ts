/**
 * Schutz-Limits pro Profil (model_profiles.limits).
 * Nicht gesetzt → Standardwerte greifen.
 */
export type ProfileLimits = {
  max_concurrent_chats: number;
  max_messages_per_day: number;
  min_success_pct: number;
  auto_pause_low_performance: boolean;
};

export const DEFAULT_LIMITS: ProfileLimits = {
  max_concurrent_chats: 15,
  max_messages_per_day: 200,
  min_success_pct: 2,
  auto_pause_low_performance: true,
};

const num = (v: unknown, fallback: number, min: number, max: number) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

export function resolveLimits(raw: unknown): ProfileLimits {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    max_concurrent_chats: num(o.max_concurrent_chats, DEFAULT_LIMITS.max_concurrent_chats, 1, 500),
    max_messages_per_day: num(o.max_messages_per_day, DEFAULT_LIMITS.max_messages_per_day, 1, 5000),
    min_success_pct: num(o.min_success_pct, DEFAULT_LIMITS.min_success_pct, 0, 100),
    auto_pause_low_performance:
      typeof o.auto_pause_low_performance === "boolean"
        ? o.auto_pause_low_performance
        : DEFAULT_LIMITS.auto_pause_low_performance,
  };
}

export type ShieldState = "ok" | "warn" | "paused";

/** Grün = alles im Rahmen, Amber = grenzwertig, Rot = pausiert. */
export function shieldState(opts: {
  pausedCount: number;
  successPct: number | null;
  minSuccessPct: number;
}): ShieldState {
  if (opts.pausedCount > 0) return "paused";
  if (opts.successPct === null) return "ok";
  if (opts.successPct < opts.minSuccessPct * 2) return "warn";
  return "ok";
}

export const SHIELD_COLOR: Record<ShieldState, string> = {
  ok: "hsl(152 60% 55%)",
  warn: "hsl(43 96% 62%)",
  paused: "hsl(0 78% 62%)",
};
