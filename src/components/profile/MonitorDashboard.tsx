import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * System-Monitor: Live-Status aller Profile, Ereignis-Feed und globale Limits.
 */

type ProfileRow = { id: string; display_name: string; avatar_url: string | null };
type ConvRow = { id: string; model_id: string; autopilot_enabled: boolean | null; last_message_at: string | null };
type PlatformRow = { profile_id: string | null; platform: string };
type EventRow = {
  id: number; profile_id: string | null; event_type: string;
  message: string; created_at: string;
};
type Limits = {
  max_requests_per_minute: number;
  max_concurrent_profiles: number;
  max_daily_cost_cents: number;
  current_daily_cost_cents: number;
};

const REFRESH_MS = 30_000;

function relMin(iso: string | null): string {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `vor ${mins}min`;
  const h = Math.round(mins / 60);
  return h < 48 ? `vor ${h}h` : `vor ${Math.round(h / 24)}d`;
}

export function MonitorDashboard({ onOpenProfile }: { onOpenProfile?: (id: string) => void }) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [platforms, setPlatforms] = useState<PlatformRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [errors24h, setErrors24h] = useState(0);
  const [rpm, setRpm] = useState(0);
  const [limits, setLimits] = useState<Limits | null>(null);

  const load = useCallback(async () => {
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const minAgo = new Date(Date.now() - 60_000).toISOString();

    const [p, c, pl, ev, errCount, limRow, reqCount] = await Promise.all([
      supabase.from("model_profiles").select("id, display_name, avatar_url"),
      supabase.from("conversations").select("id, model_id, autopilot_enabled, last_message_at"),
      supabase.from("profile_platforms").select("profile_id, platform"),
      supabase.from("system_events").select("id, profile_id, event_type, message, created_at")
        .order("created_at", { ascending: false }).limit(50),
      supabase.from("system_events").select("id", { count: "exact", head: true })
        .eq("event_type", "error").gte("created_at", dayAgo),
      supabase.from("system_limits").select("*").eq("id", 1).maybeSingle(),
      supabase.from("api_request_log").select("id", { count: "exact", head: true }).gte("created_at", minAgo),
    ]);

    setProfiles((p.data ?? []) as ProfileRow[]);
    setConvs((c.data ?? []) as ConvRow[]);
    setPlatforms((pl.data ?? []) as PlatformRow[]);
    setEvents((ev.data ?? []) as EventRow[]);
    setErrors24h(Number(errCount.count ?? 0));
    setRpm(Number(reqCount.count ?? 0));
    if (limRow.data) setLimits(limRow.data as Limits);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const activeConvs = convs.filter((c) => c.autopilot_enabled !== false);
  const activeProfileIds = new Set(activeConvs.map((c) => c.model_id));
  const profileName = (id: string | null) => profiles.find((p) => p.id === id)?.display_name ?? "System";

  return (
    <div className="shex" style={{ paddingBottom: 80 }}>
      <header className="shex-masthead reveal-stagger">
        <div className="shex-eyebrow"><span className="shex-bar" />SYSTEM &middot; MONITOR</div>
        <h1 className="shex-h1">Monitor.<br /><span className="shex-h1-muted">Live-Status &amp; Ereignisse</span></h1>
        <p className="shex-lede">Gesundheit aller Profile, Fehler der letzten 24 Stunden und globale API-Limits.</p>
      </header>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 16 }}>
        <SummaryCard label="Aktive Profile" value={String(activeProfileIds.size)}
          tone={activeProfileIds.size > 0 ? "good" : "muted"} icon={<Zap />} />
        <SummaryCard label="Aktive Conversations" value={String(activeConvs.length)} icon={<MsgIcon />} />
        <SummaryCard label="Fehler (24h)" value={String(errors24h)}
          tone={errors24h > 0 ? "bad" : "good"} icon={<Warn />} />
        <SummaryCard label="Ø Response Zeit" value="—" tone="muted" icon={<Clock />} />
      </div>

      <GlobalLimits limits={limits} rpm={rpm} onSaved={(l) => setLimits(l)} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 16 }}>
        {/* Live status */}
        <section className="premium-card" style={{ padding: 20 }}>
          <div className="kpi-label" style={{
            color: "var(--text-strong)", paddingBottom: 12, marginBottom: 12,
            borderBottom: "1px solid var(--hairline)",
          }}>Profile Live-Status</div>

          {profiles.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, fontSize: 13, color: "var(--text-subtle)" }}>
              Keine Profile
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Row header cells={["Profil", "Plattform", "Chats", "Status", "Letzte Aktivität"]} />
              {profiles.map((p) => {
                const own = convs.filter((c) => c.model_id === p.id);
                const auto = own.filter((c) => c.autopilot_enabled !== false).length;
                const paused = own.length > 0 && auto === 0;
                const last = own.map((c) => c.last_message_at).filter(Boolean).sort().pop() ?? null;
                const tags = platforms.filter((x) => x.profile_id === p.id).map((x) => x.platform);
                return (
                  <button
                    key={p.id}
                    onClick={() => onOpenProfile?.(p.id)}
                    style={{
                      display: "grid", gridTemplateColumns: "1.4fr 1fr 0.5fr 0.9fr 1fr",
                      gap: 8, alignItems: "center", textAlign: "left",
                      padding: "10px 0", borderBottom: "1px solid #1A1A1E",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: p.avatar_url ? `center/cover url(${p.avatar_url})` : "var(--surface-3)",
                        color: "var(--text-strong)", fontSize: 10, fontWeight: 600,
                        display: "grid", placeItems: "center",
                      }}>{!p.avatar_url && (p.display_name[0] ?? "?").toUpperCase()}</span>
                      <span style={{
                        fontSize: 13, color: "var(--text-strong)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{p.display_name}</span>
                    </span>
                    <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {tags.length === 0
                        ? <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>—</span>
                        : tags.map((t) => (
                          <span key={t} style={{
                            fontSize: 10.5, padding: "1px 6px", borderRadius: 4,
                            background: "var(--surface-3)", color: "var(--text-subtle)",
                          }}>{t}</span>
                        ))}
                    </span>
                    <span className="tabular-nums" style={{ fontSize: 12.5, color: "var(--text)" }}>{own.length}</span>
                    <Dot state={paused ? "paused" : auto > 0 ? "active" : "idle"} />
                    <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{relMin(last)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Event feed */}
        <section className="premium-card" style={{ padding: 20 }}>
          <div className="kpi-label" style={{
            color: "var(--text-strong)", paddingBottom: 12, marginBottom: 12,
            borderBottom: "1px solid var(--hairline)",
          }}>Ereignis-Feed</div>

          {events.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, fontSize: 13, color: "var(--text-subtle)" }}>
              Keine Ereignisse
            </div>
          ) : (
            <div style={{ maxHeight: 384, overflow: "auto" }}>
              {events.map((e) => (
                <div key={e.id} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  padding: "10px 0", borderBottom: "1px solid #1A1A1E",
                }}>
                  <span style={{ marginTop: 2, color: eventColor(e.event_type), flexShrink: 0, display: "flex" }}>
                    <Warn />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--text)" }}>{e.message}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 2 }}>
                      {profileName(e.profile_id)} · {relMin(e.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function eventColor(type: string): string {
  if (type === "error") return "hsl(0 72% 66%)";
  if (type === "warning") return "hsl(43 96% 62%)";
  return "hsl(210 90% 68%)";
}

function Row({ header, cells }: { header?: boolean; cells: string[] }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1.4fr 1fr 0.5fr 0.9fr 1fr", gap: 8,
      padding: "0 0 8px", borderBottom: "1px solid #1A1A1E",
    }}>
      {cells.map((c) => (
        <span key={c} style={{
          fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em",
          color: "var(--text-subtle)", fontWeight: 600,
        }}>{header ? c : c}</span>
      ))}
    </div>
  );
}

function Dot({ state }: { state: "active" | "paused" | "idle" | "error" }) {
  const map = {
    active: { c: "var(--status-success)", t: "hsl(152 60% 70%)", l: "Aktiv" },
    paused: { c: "hsl(43 96% 60%)", t: "hsl(43 96% 72%)", l: "Pausiert" },
    idle: { c: "#3A3A42", t: "var(--text-subtle)", l: "Inaktiv" },
    error: { c: "hsl(0 72% 60%)", t: "hsl(0 72% 74%)", l: "Fehler" },
  }[state];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: map.t }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: map.c }} />{map.l}
    </span>
  );
}

function SummaryCard({ label, value, icon, tone = "neutral" }: {
  label: string; value: string; icon: React.ReactNode; tone?: "good" | "bad" | "muted" | "neutral";
}) {
  const color = tone === "good" ? "hsl(152 60% 70%)"
    : tone === "bad" ? "hsl(0 72% 72%)"
    : tone === "muted" ? "var(--text-subtle)" : "var(--text-strong)";
  return (
    <div style={{ background: "#131316", border: "1px solid #1E1E22", borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{label}</span>
        <span style={{ color: "var(--text-subtle)", display: "flex" }}>{icon}</span>
      </div>
      <div className="tabular-nums" style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5, color }}>{value}</div>
    </div>
  );
}

function GlobalLimits({ limits, rpm, onSaved }: {
  limits: Limits | null; rpm: number; onSaved: (l: Limits) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Limits | null>(limits);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(limits); }, [limits]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase.from("system_limits").update({
      max_requests_per_minute: draft.max_requests_per_minute,
      max_concurrent_profiles: draft.max_concurrent_profiles,
      max_daily_cost_cents: draft.max_daily_cost_cents,
    }).eq("id", 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved(draft);
    toast.success("Globale Limits gespeichert");
  };

  const rpmPct = draft && draft.max_requests_per_minute > 0
    ? Math.min(100, (rpm / draft.max_requests_per_minute) * 100) : 0;
  const costPct = draft && draft.max_daily_cost_cents > 0
    ? Math.min(100, (draft.current_daily_cost_cents / draft.max_daily_cost_cents) * 100) : 0;

  return (
    <div style={{ background: "#131316", border: "1px solid #1E1E22", borderRadius: 10, padding: 16 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left" }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)" }}>Globale Limits</span>
        <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && draft && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <NumberField label="Max. Requests/Min" value={draft.max_requests_per_minute}
              onChange={(v) => setDraft({ ...draft, max_requests_per_minute: v })} />
            <NumberField label="Max. gleichzeitige Profile" value={draft.max_concurrent_profiles}
              onChange={(v) => setDraft({ ...draft, max_concurrent_profiles: v })} />
            <NumberField label="Max. Tagesbudget (€)" accent value={Math.round(draft.max_daily_cost_cents / 100)}
              onChange={(v) => setDraft({ ...draft, max_daily_cost_cents: Math.max(0, v) * 100 })} />
            <div>
              <span className="shex-field-label" style={{ display: "block", marginBottom: 6 }}>Aktuelle Kosten heute</span>
              <div className="tabular-nums" style={{
                padding: "10px 12px", borderRadius: 8, background: "#18181D",
                border: "1px solid #1E1E22", color: "var(--accent-revenue, hsl(43 96% 62%))", fontSize: 14, fontWeight: 600,
              }}>{(draft.current_daily_cost_cents / 100).toFixed(2)} €</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Bar label={`Requests/Min: ${rpm} / ${draft.max_requests_per_minute}`} pct={rpmPct} />
            <Bar
              label={`Tagesbudget: ${(draft.current_daily_cost_cents / 100).toFixed(2)}€ / ${(draft.max_daily_cost_cents / 100).toFixed(0)}€`}
              pct={costPct} gold
            />
          </div>

          <button className="shex-btn shex-btn-primary" style={{ alignSelf: "flex-start" }} disabled={saving} onClick={save}>
            {saving ? "Speichere…" : "Speichern"}
          </button>
        </div>
      )}
    </div>
  );
}

function Bar({ label, pct, gold }: { label: string; pct: number; gold?: boolean }) {
  const over = pct > 80;
  const fill = over ? "hsl(0 72% 58%)" : gold ? "hsl(43 96% 56%)" : "var(--accent)";
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginBottom: 5 }}>{label}</div>
      <div style={{ height: 4, borderRadius: 999, background: "#1E1E22", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: fill, borderRadius: 999, transition: "width 300ms var(--easing)" }} />
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, accent }: {
  label: string; value: number; onChange: (v: number) => void; accent?: boolean;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="shex-field-label" style={{ display: "block", marginBottom: 6 }}>{label}</span>
      <input
        type="number" className="shex-input" value={String(value)}
        style={accent ? { color: "hsl(43 96% 66%)" } : undefined}
        onChange={(e) => { const n = parseInt(e.target.value, 10); if (Number.isFinite(n)) onChange(n); }}
      />
    </label>
  );
}

const Zap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);
const MsgIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
  </svg>
);
const Warn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);
const Clock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
);
