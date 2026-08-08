// Server-only helpers for the extension public API.
// Validates `X-Pc-Key` against extension_api_keys (sha256 hash).
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CopilotKey = {
  id: string;
  model_id: string;
  label: string;
};

export function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export async function verifyCopilotKey(request: Request): Promise<CopilotKey> {
  const raw =
    request.headers.get("x-pc-key") ||
    request.headers.get("X-Pc-Key") ||
    "";
  if (!raw || raw.length < 16) {
    throw httpError(401, "missing_api_key");
  }
  const hash = sha256Hex(raw.trim());
  const { data, error } = await supabaseAdmin
    .from("extension_api_keys")
    .select("id, model_id, label, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error) throw httpError(500, "key_lookup_failed");
  if (!data) throw httpError(401, "invalid_api_key");
  if (data.revoked_at) throw httpError(401, "revoked_api_key");

  // best-effort touch
  void supabaseAdmin
    .from("extension_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { id: data.id, model_id: data.model_id, label: data.label };
}

export function httpError(status: number, code: string, detail?: unknown) {
  const err = new Error(code) as Error & { status: number; detail?: unknown };
  err.status = status;
  if (detail) err.detail = detail;
  return err;
}

export function jsonError(err: unknown): Response {
  const e = err as { status?: number; message?: string; detail?: unknown };
  const status = e?.status ?? 500;
  return new Response(
    JSON.stringify({ ok: false, error: e?.message ?? "error", detail: e?.detail }),
    { status, headers: corsJson() },
  );
}

export function corsJson(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Pc-Key",
  };
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: corsJson() });
}

// Merge helpers: arrays dedupe (case-insensitive), strings prefer existing-if-set.
export function mergeStringArrays(existing: unknown, incoming: unknown): string[] {
  const a = Array.isArray(existing) ? existing.map(String) : [];
  const b = Array.isArray(incoming) ? incoming.map(String) : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...a, ...b]) {
    const k = v.trim();
    if (!k) continue;
    const lc = k.toLowerCase();
    if (seen.has(lc)) continue;
    seen.add(lc);
    out.push(k);
  }
  return out;
}
