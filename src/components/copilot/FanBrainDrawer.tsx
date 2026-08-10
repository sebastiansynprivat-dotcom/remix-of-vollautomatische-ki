// FanBrainDrawer — slide-in Panel das den typisierten Fan-Brain anzeigt.
// Datenquelle: useFanBrain(fanId) aus public.fan_brain (Realtime), Fallback MOCK_FAN_BRAIN.

import { Fragment, useEffect, useState } from "react";
import { MOCK_FAN_BRAIN, useFanBrain, type FanBrain } from "@/lib/fanBrain";

const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

const TABS = [
  { id: "overview",    label: "Overview" },
  { id: "identity",    label: "Identity" },
  { id: "emotional",   label: "Emotional" },
  { id: "preferences", label: "Preferences" },
  { id: "commercial",  label: "Commercial" },
  { id: "relationship",label: "Relationship" },
  { id: "red_flags",   label: "Red-Flags" },
  { id: "signals",     label: "Live-Signals" },
  { id: "json",        label: "JSON" },
] as const;
type TabId = typeof TABS[number]["id"];

export function FanBrainDrawer({
  open, onClose, fanId = null, displayName,
}: {
  open: boolean;
  onClose: () => void;
  fanId?: string | null;
  displayName?: string;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const { brain, isMock } = useFanBrain(fanId, displayName ?? MOCK_FAN_BRAIN.display_name);
  const fan = brain;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "hsla(0,0%,0%,0.55)",
          backdropFilter: "blur(4px)", zIndex: 60,
          animation: "fadeIn 160ms ease-out",
        }}
      />
      <aside style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(720px, 96vw)",
        background: "var(--surface-1)",
        borderLeft: "1px solid var(--hairline-accent)",
        boxShadow: "-24px 0 60px hsla(0,0%,0%,0.5)",
        zIndex: 61,
        display: "flex", flexDirection: "column",
        animation: "slideIn 220ms cubic-bezier(.2,.8,.2,1)",
      }}>
        <Header fan={fan} onClose={onClose} isMock={isMock} />
        <Tabs tab={tab} setTab={setTab} />
        <div style={{ flex: 1, overflow: "auto", padding: "18px 22px 32px" }}>
          {tab === "overview"     && <Overview fan={fan} />}
          {tab === "identity"     && <KV obj={fan.identity} />}
          {tab === "emotional"    && <Emotional fan={fan} />}
          {tab === "preferences"  && <Preferences fan={fan} />}
          {tab === "commercial"   && <Commercial fan={fan} />}
          {tab === "relationship" && <Relationship fan={fan} />}
          {tab === "red_flags"    && <RedFlags fan={fan} />}
          {tab === "signals"      && <Signals fan={fan} />}
          {tab === "json"         && <JsonView fan={fan} />}
        </div>
      </aside>
      <style>{`
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  );
}

/* ───── Header / Tabs ───── */

function Header({ fan, onClose, isMock }: { fan: FanBrain; onClose: () => void; isMock: boolean }) {
  return (
    <div style={{
      padding: "18px 22px 14px",
      borderBottom: "1px solid var(--hairline)",
      display: "flex", alignItems: "flex-start", gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        display: "grid", placeItems: "center",
        background: "linear-gradient(160deg, hsla(40,40%,28%,0.6), hsla(40,40%,16%,0.4))",
        border: "1px solid var(--hairline-accent)",
        color: "var(--accent)", fontWeight: 700, fontSize: 16,
      }}>{fan.display_name.split(" ").map(s => s[0]).join("")}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
          <span style={{
            padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 700,
            background: "hsla(40,45%,55%,0.18)", color: "var(--accent)",
            border: "1px solid hsla(40,45%,55%,0.4)", letterSpacing: 0.6,
          }}>FAN-BRAIN · {isMock ? "MOCK" : "LIVE"}</span>
          <span style={{ ...mono, fontSize: 11, color: "var(--text-subtle)" }}>{fan.fan_id}</span>
        </div>
        <h2 className="display" style={{
          margin: 0, fontSize: 20, fontWeight: 600, color: "var(--text-strong)", letterSpacing: -0.3,
        }}>{fan.display_name}</h2>
        <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--text-subtle)" }}>
          Stage <strong style={{ color: "var(--text)" }}>{fan.relationship.stage}</strong> ·
          {" "}Confidence <strong style={{ color: "var(--text)" }}>{Math.round(fan.confidence * 100)}%</strong> ·
          {" "}letztes Update vor {Math.max(1, Math.round((Date.now() - new Date(fan.updated_at).getTime()) / 60_000))} Min
        </div>
      </div>
      <button onClick={onClose} style={{
        padding: "6px 12px", borderRadius: 8,
        border: "1px solid var(--hairline-accent)",
        background: "hsla(0,0%,100%,0.03)",
        color: "var(--text-subtle)", fontSize: 12, fontWeight: 600,
      }}>Schließen</button>
    </div>
  );
}

function Tabs({ tab, setTab }: { tab: TabId; setTab: (t: TabId) => void }) {
  return (
    <div style={{
      display: "flex", gap: 2, padding: "8px 14px",
      borderBottom: "1px solid var(--hairline)",
      overflow: "auto",
    }}>
      {TABS.map(t => {
        const active = t.id === tab;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "7px 12px", borderRadius: 8, border: "none",
            background: active ? "hsla(40,45%,55%,0.16)" : "transparent",
            color: active ? "var(--accent)" : "var(--text-subtle)",
            fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer",
          }}>{t.label}</button>
        );
      })}
    </div>
  );
}

/* ───── Tab content ───── */

function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: accent
        ? "linear-gradient(160deg, hsla(40,40%,18%,0.45), hsla(0,0%,0%,0.2))"
        : "hsla(0,0%,100%,0.025)",
      border: `1px solid ${accent ? "var(--hairline-accent)" : "var(--hairline)"}`,
      color: "var(--text)", fontSize: 13, lineHeight: 1.55,
    }}>{children}</div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <div style={{
    fontSize: 9.5, fontWeight: 700, letterSpacing: 0.9,
    color: "var(--accent)", textTransform: "uppercase", marginBottom: 8,
  }}>{children}</div>;
}

function Bar({ value, max = 100, tone = "gold" }: { value: number; max?: number; tone?: "gold" | "warn" | "danger" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = tone === "danger" ? "hsl(0,72%,55%)" : tone === "warn" ? "hsl(32,80%,55%)" : "var(--accent)";
  return (
    <div style={{ height: 6, borderRadius: 999, background: "hsla(0,0%,100%,0.06)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 220ms ease" }} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8, color: "var(--text-subtle)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-strong)", marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function Overview({ fan }: { fan: FanBrain }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card accent>
        <Kicker>Live-Sales-Snapshot</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", marginBottom: 4 }}>PPV-Moment-Score</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{fan.signals.ppv_moment_score}</div>
            <Bar value={fan.signals.ppv_moment_score} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", marginBottom: 4 }}>Funnel-Step</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-strong)" }}>{fan.signals.funnel_step} / 7</div>
            <Bar value={fan.signals.funnel_step} max={7} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-subtle)", marginBottom: 4 }}>Bridge</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)", textTransform: "capitalize" }}>{fan.signals.bridge_state}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-subtle)", marginTop: 6 }}>fav: {fan.preferences.favorite_bridge}</div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Stat label="Lifetime Spend" value={`€${fan.commercial.lifetime_spend}`} sub={`Ø Ticket €${fan.commercial.avg_ticket}`} />
        <Stat label="Ladder Step" value={`${fan.commercial.ladder_step} / 10`} sub={`${fan.commercial.declined_count}× declined`} />
        <Stat label="Days Known" value={fan.relationship.days_known} sub={`Stage: ${fan.relationship.stage}`} />
      </div>

      <Card>
        <Kicker>Top-Hooks für nächsten Reply</Kicker>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text)", fontSize: 13, lineHeight: 1.7 }}>
          <li>Anerkennung als Vater („wie war dein Sohn heute?")</li>
          <li>Inside-Joke: <em>{fan.relationship.inside_jokes[0]}</em></li>
          <li>Bridge zu <strong>{fan.preferences.favorite_bridge}</strong> in slow-burn-Pacing</li>
          <li>Voice statt Foto (Pref: {fan.preferences.content_format_pref?.join(", ")})</li>
        </ul>
      </Card>
    </div>
  );
}

function Emotional({ fan }: { fan: FanBrain }) {
  const e = fan.emotional;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat label="Current Mood" value={<span style={{ textTransform: "capitalize" }}>{e.current_mood}</span>} />
        <Card>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8, color: "var(--text-subtle)", textTransform: "uppercase" }}>Loneliness</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-strong)", margin: "4px 0 8px" }}>{e.loneliness_score} / 100</div>
          <Bar value={e.loneliness_score} tone={e.loneliness_score > 70 ? "warn" : "gold"} />
        </Card>
      </div>
      <Card>
        <Kicker>Mood-History 7 Tage</Kicker>
        <div style={{ display: "flex", gap: 6 }}>
          {e.mood_history_7d.map((m, i) => (
            <div key={i} style={{
              flex: 1, padding: "10px 4px", borderRadius: 8,
              background: "hsla(0,0%,100%,0.03)", border: "1px solid var(--hairline)",
              fontSize: 10, color: "var(--text-subtle)", textAlign: "center", textTransform: "capitalize",
            }}>{m}</div>
          ))}
        </div>
      </Card>
      <Card>
        <Kicker>Letzte Vulnerability-Share</Kicker>
        <div style={{ color: "var(--text-strong)" }}>„{e.last_vulnerable_share}"</div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Card><Kicker>Triggers ✚</Kicker>{e.triggers_positive.map(t => <Pill key={t}>{t}</Pill>)}</Card>
        <Card><Kicker>Triggers ✕</Kicker>{e.triggers_negative.map(t => <Pill key={t} tone="danger">{t}</Pill>)}</Card>
      </div>
    </div>
  );
}

function Preferences({ fan }: { fan: FanBrain }) {
  const p = fan.preferences;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card><Kicker>Kinks</Kicker>{p.kinks.map(k => <Pill key={k}>{k}</Pill>)}</Card>
      <Card><Kicker>Turn-Offs (NIE triggern)</Kicker>{p.turn_offs.map(k => <Pill key={k} tone="danger">{k}</Pill>)}</Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat label="Favorite Bridge" value={p.favorite_bridge ?? "—"} />
        <Stat label="Pacing" value={p.pacing ?? "—"} sub={`fav body: ${p.fav_body_part}`} />
      </div>
      <Card><Kicker>Content-Format Präferenz</Kicker>{p.content_format_pref?.map(f => <Pill key={f}>{f}</Pill>)}</Card>
    </div>
  );
}

function Commercial({ fan }: { fan: FanBrain }) {
  const c = fan.commercial;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Stat label="Lifetime Spend" value={`€${c.lifetime_spend}`} />
        <Stat label="Ø Ticket" value={`€${c.avg_ticket}`} />
        <Stat label="Last Buy" value={`€${c.last_purchase_amount ?? 0}`} sub={`vor ${c.days_since_last_buy} Tagen`} />
      </div>
      <Card>
        <Kicker>Preisleiter</Kicker>
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 26, borderRadius: 6,
              background: i < c.ladder_step ? "var(--accent)" : "hsla(0,0%,100%,0.05)",
              border: "1px solid var(--hairline)",
              display: "grid", placeItems: "center",
              fontSize: 10, fontWeight: 700,
              color: i < c.ladder_step ? "var(--bg)" : "var(--text-subtle)",
            }}>{i + 1}</div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 8 }}>
          Aktueller Step: <strong style={{ color: "var(--text-strong)" }}>{c.ladder_step}</strong> — nächster Pitch sollte bei €{c.avg_ticket + 10}–€{c.avg_ticket + 25} liegen.
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat label="Declined" value={c.declined_count} />
        <Stat label="Refunds" value={c.refund_count} />
      </div>
    </div>
  );
}

function Relationship({ fan }: { fan: FanBrain }) {
  const r = fan.relationship;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat label="Stage" value={r.stage} />
        <Stat label="Days known" value={r.days_known} />
      </div>
      <Card>
        <Kicker>Inside-Jokes</Kicker>
        {r.inside_jokes.map(j => <Pill key={j}>{j}</Pill>)}
      </Card>
      <Card>
        <Kicker>Promises (offen!)</Kicker>
        {r.promises_made.map((p, i) => (
          <div key={i} style={{
            padding: "8px 10px", borderRadius: 8, marginTop: i ? 6 : 0,
            background: "hsla(40,45%,55%,0.08)", border: "1px solid var(--hairline-accent)",
            fontSize: 12.5, color: "var(--text-strong)",
          }}>
            „{p.text}" {p.due && <span style={{ color: "var(--text-subtle)", fontSize: 11 }}>· bis {new Date(p.due).toLocaleDateString()}</span>}
          </div>
        ))}
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Card><Kicker>Sie nennt ihn</Kicker>{r.nicknames_for_him?.map(n => <Pill key={n}>{n}</Pill>)}</Card>
        <Card><Kicker>Er nennt sie</Kicker>{r.nicknames_for_her?.map(n => <Pill key={n}>{n}</Pill>)}</Card>
      </div>
    </div>
  );
}

function RedFlags({ fan }: { fan: FanBrain }) {
  const r = fan.red_flags;
  const row = (label: string, v: number, max = 10) => (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-subtle)", marginBottom: 4 }}>
        <span>{label}</span><span style={{ color: "var(--text)" }}>{v} / {max}</span>
      </div>
      <Bar value={v} max={max} tone={v > max * 0.6 ? "danger" : v > max * 0.3 ? "warn" : "gold"} />
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        {row("Broke-Signals", r.broke_signals)}
        {row("Aggression", r.aggression)}
        {row("Refund-Drohungen", r.refund_threats)}
        {row("Scammer-Score", r.scammer_score, 100)}
      </Card>
      <Card>
        <Kicker>Notes</Kicker>
        {r.notes.map((n, i) => <div key={i} style={{ fontSize: 12.5, marginTop: i ? 6 : 0 }}>• {n}</div>)}
      </Card>
    </div>
  );
}

function Signals({ fan }: { fan: FanBrain }) {
  const s = fan.signals;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card accent>
        <Kicker>Bridge-State-Machine</Kicker>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["idle","armed","fan_ack","pitched","bought","declined","recovered"] as const).map(st => (
            <span key={st} style={{
              padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: s.bridge_state === st ? "var(--accent)" : "hsla(0,0%,100%,0.04)",
              color: s.bridge_state === st ? "var(--bg)" : "var(--text-subtle)",
              border: "1px solid var(--hairline)",
            }}>{st}</span>
          ))}
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat label="Funnel-Step" value={`${s.funnel_step} / 7`} />
        <Stat label="PPV-Moment-Score" value={s.ppv_moment_score} sub="Heat 35 + Funnel 25 + Bridge 20 + …" />
      </div>
      <Card>
        <Kicker>After-Care-Lock</Kicker>
        <div style={{ fontSize: 13 }}>
          {s.after_care_lock_until
            ? `aktiv bis ${new Date(s.after_care_lock_until).toLocaleTimeString()}`
            : "inaktiv — Pitches erlaubt."}
        </div>
      </Card>
    </div>
  );
}

function JsonView({ fan }: { fan: FanBrain }) {
  return (
    <pre style={{
      ...mono, fontSize: 11.5, lineHeight: 1.55,
      background: "hsla(0,0%,0%,0.35)",
      border: "1px solid var(--hairline)",
      borderRadius: 10, padding: 14,
      color: "var(--text)", overflow: "auto", margin: 0,
    }}>{JSON.stringify(fan, null, 2)}</pre>
  );
}

/* ───── Helpers ───── */

function KV({ obj }: { obj: Record<string, unknown> }) {
  return (
    <Card>
      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", rowGap: 8, columnGap: 14, fontSize: 12.5 }}>
        {Object.entries(obj).map(([k, v]) => (
          <Fragment key={k}>
            <div style={{ ...mono, color: "var(--accent)", fontSize: 11 }}>{k}</div>
            <div style={{ color: "var(--text-strong)" }}>
              {Array.isArray(v) ? v.join(", ") : String(v ?? "—")}
            </div>
          </Fragment>
        ))}
      </div>
    </Card>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "danger" }) {
  return (
    <span style={{
      display: "inline-block", margin: "4px 6px 0 0",
      padding: "4px 9px", borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      background: tone === "danger" ? "hsla(0,60%,45%,0.15)" : "hsla(40,45%,55%,0.12)",
      color: tone === "danger" ? "hsl(0,80%,72%)" : "var(--accent)",
      border: `1px solid ${tone === "danger" ? "hsla(0,60%,55%,0.4)" : "hsla(40,45%,55%,0.35)"}`,
    }}>{children}</span>
  );
}
