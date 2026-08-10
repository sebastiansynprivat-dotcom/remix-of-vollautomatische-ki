import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { presetById, resolvePersonaConfig } from "@/lib/personaPresets";
import {
  loadConvCounts, loadModelMeta, loadPerformance, sumDays, successPct,
  eur, quoteColor, todayIso, daysAgoIso,
  type ConvCounts, type DailyStat, type ModelMeta,
} from "@/lib/performanceStats";

const CARD: React.CSSProperties = {
  background: "#131316", borderRadius: 14, padding: 24, border: "1px solid #1E1E22",
};
const LABEL: React.CSSProperties = {
  fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.14em",
  fontWeight: 600, color: "hsl(0 0% 45%)",
};

/** Performance-Übersicht: Kennzahlen gesamt, Tabelle je Profil, Detail mit Charts. */
export function PerformanceDashboard() {
  const [days, setDays] = useState<DailyStat[]>([]);
  const [models, setModels] = useState<ModelMeta[]>([]);
  const [convs, setConvs] = useState<ConvCounts>({});
  const [fromTelemetry, setFromTelemetry] = useState(false);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [perf, meta, cc] = await Promise.all([
        loadPerformance(14), loadModelMeta(), loadConvCounts(),
      ]);
      setDays(perf.days);
      setFromTelemetry(perf.fromTelemetry);
      setTotalProfiles(perf.totalProfiles);
      setModels(meta);
      setConvs(cc);
      setLoading(false);
    })();
  }, []);

  const today = todayIso();
  const todays = useMemo(() => days.filter((d) => d.statDate === today), [days, today]);

  const totals = useMemo(() => sumDays(todays), [todays]);
  const autoChats = useMemo(
    () => Object.values(convs).reduce((n, c) => n + c.auto, 0), [convs]);
  const activeProfiles = useMemo(
    () => Object.entries(convs).filter(([, c]) => c.auto > 0).length, [convs]);
  const avgQuote = successPct(totals.offersMade, totals.offersAccepted);

  const rows = useMemo(() => {
    const byModel = new Map<string, DailyStat[]>();
    for (const d of todays) {
      byModel.set(d.modelId, [...(byModel.get(d.modelId) ?? []), d]);
    }
    return models
      .map((m) => {
        const s = sumDays(byModel.get(m.id) ?? []);
        const cc = convs[m.id] ?? { auto: 0, paused: 0 };
        const preset = presetById(resolvePersonaConfig(m.persona_config)?.preset_id ?? null);
        return {
          model: m,
          template: preset?.label ?? "Individuell",
          chats: cc.auto + cc.paused,
          auto: cc.auto,
          paused: cc.paused,
          messages: s.messagesSent + s.messagesReceived,
          offers: s.offersMade,
          accepted: s.offersAccepted,
          revenueCents: s.revenueCents,
        };
      })
      .sort((a, b) => b.revenueCents - a.revenueCents);
  }, [models, todays, convs]);

  const selectedModel = models.find((m) => m.id === selected) ?? null;

  if (selectedModel) {
    return (
      <ProfileDetail
        model={selectedModel}
        days={days.filter((d) => d.modelId === selectedModel.id)}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: "hsl(0 0% 95%)", margin: 0 }}>Performance</h1>
        <div style={{ marginTop: 6, fontSize: 12.5, color: "hsl(0 0% 48%)" }}>
          {fromTelemetry ? "Daten aus Simulation" : "Tages-Statistik je Profil"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <SummaryCard
          label="Umsatz" subtitle="Heute" icon={<IconTrend />}
          value={<CountUp value={Math.round(totals.revenueCents / 100)} suffix="€" gold />}
        />
        <SummaryCard
          label="Aktive Profile" subtitle={`von ${totalProfiles} total`} icon={<IconUsers />}
          value={<Big color="hsl(0 0% 96%)">{activeProfiles}</Big>}
        />
        <SummaryCard
          label="Ø Erfolgsquote" subtitle="über alle Profile" icon={<IconTarget />}
          value={<Big color={quoteColor(avgQuote)}>{avgQuote.toFixed(1)}%</Big>}
        />
        <SummaryCard
          label="Auto-Modus Chats" subtitle="aktiv automatisiert" icon={<IconZap />}
          value={<Big color="hsl(152 60% 55%)">{autoChats}</Big>}
        />
      </div>

      <div style={{ background: "#131316", borderRadius: 14, border: "1px solid #1E1E22", overflow: "hidden" }}>
        <div style={{ ...gridCols, padding: "12px 24px", borderBottom: "1px solid #1E1E22" }}>
          {["Profil", "Template", "Chats", "Nachrichten", "Angebote", "Angenommen", "Quote", "Umsatz", "Status"]
            .map((h, i) => (
              <span key={h} style={{ ...LABEL, textAlign: i >= 2 && i <= 7 ? "right" : "left" }}>{h}</span>
            ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "hsl(0 0% 45%)", fontSize: 13 }}>Lade Daten…</div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : rows.map((r) => {
          const pct = successPct(r.offers, r.accepted);
          const status = r.paused > 0 && r.auto === 0
            ? { dot: "hsl(0 78% 62%)", text: "Gestoppt" }
            : r.paused > 0
              ? { dot: "hsl(43 96% 62%)", text: "Teil-Pause" }
              : r.auto > 0
                ? { dot: "hsl(152 60% 55%)", text: "Aktiv" }
                : { dot: "hsl(0 0% 40%)", text: "Inaktiv" };
          return (
            <Row key={r.model.id} onClick={() => setSelected(r.model.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Avatar url={r.model.avatar_url} name={r.model.display_name} size={28} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "hsl(0 0% 92%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.model.display_name}
                  </div>
                  <div style={{ fontSize: 11, color: "hsl(0 0% 45%)" }}>@{r.model.handle}</div>
                </div>
              </div>
              <span><Badge>{r.template}</Badge></span>
              <Num>{r.chats}</Num>
              <Num dim>{r.messages}</Num>
              <Num dim>{r.offers}</Num>
              <Num dim>{r.accepted}</Num>
              <span style={{ textAlign: "right" }}>
                <span style={{
                  padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  color: quoteColor(pct),
                  background: `color-mix(in srgb, ${quoteColor(pct)} 14%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${quoteColor(pct)} 30%, transparent)`,
                }}>{pct.toFixed(1)}%</span>
              </span>
              <span style={{ textAlign: "right", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "hsl(40 60% 68%)" }}>
                {eur(r.revenueCents)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "hsl(0 0% 62%)" }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: status.dot, flexShrink: 0 }} />
                {status.text}
              </span>
            </Row>
          );
        })}
      </div>
    </div>
  );
}

const gridCols: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.6fr 1fr 60px 100px 90px 100px 80px 90px 100px",
  gap: 12, alignItems: "center",
};

function Row({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...gridCols, padding: "12px 24px", borderBottom: "1px solid #1A1A1E",
        background: hover ? "#18181D" : "transparent", cursor: "pointer",
        transition: "background 150ms ease",
      }}
    >{children}</div>
  );
}

function Num({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <span style={{
      textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums",
      color: dim ? "hsl(0 0% 62%)" : "hsl(0 0% 90%)",
    }}>{children}</span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 999,
      background: "#1F1F25", fontSize: 11, color: "hsl(0 0% 72%)",
      maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0,
      display: "grid", placeItems: "center",
      background: url ? `center/cover url(${url})` : "#22222A",
      color: "hsl(0 0% 70%)", fontSize: size * 0.4, fontWeight: 600,
    }}>{!url && (name[0] ?? "?").toUpperCase()}</span>
  );
}

function SummaryCard({ label, subtitle, value, icon }: {
  label: string; subtitle: string; value: React.ReactNode; icon: React.ReactNode;
}) {
  return (
    <div style={{ ...CARD, position: "relative" }}>
      <span style={{ position: "absolute", top: 18, right: 18, color: "hsl(0 0% 40%)" }}>{icon}</span>
      <div style={LABEL}>{label}</div>
      <div style={{ marginTop: 12 }}>{value}</div>
      <div style={{ marginTop: 8, fontSize: 11.5, color: "hsl(0 0% 55%)" }}>{subtitle}</div>
    </div>
  );
}

function Big({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ fontSize: 30, fontWeight: 700, color, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
      {children}
    </div>
  );
}

/** Zählt beim Laden von 0 auf den Zielwert hoch (800 ms). */
function CountUp({ value, suffix, gold }: { value: number; suffix?: string; gold?: boolean }) {
  const [n, setN] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 800);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return (
    <div style={{
      fontSize: 30, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: "tabular-nums",
      ...(gold ? {
        background: "linear-gradient(100deg, hsl(44 70% 78%), hsl(36 55% 55%))",
        WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
      } : { color: "hsl(0 0% 96%)" }),
    }}>{n.toLocaleString("de-DE")}{suffix}</div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: "64px 24px", textAlign: "center" }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="hsl(0 0% 35%)" strokeWidth="1.6"
        style={{ margin: "0 auto 16px", display: "block" }}>
        <path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="7" /><rect x="13" y="6" width="3" height="11" />
      </svg>
      <div style={{ fontSize: 15, fontWeight: 600, color: "hsl(0 0% 82%)" }}>Noch keine Daten</div>
      <div style={{ marginTop: 6, fontSize: 12.5, color: "hsl(0 0% 48%)" }}>
        Starte eine Simulation um Daten zu generieren
      </div>
    </div>
  );
}

/* ─────────────── Detailansicht ─────────────── */

function ProfileDetail({ model, days, onBack }: {
  model: ModelMeta; days: DailyStat[]; onBack: () => void;
}) {
  const preset = presetById(resolvePersonaConfig(model.persona_config)?.preset_id ?? null);
  const today = todayIso();
  const weekStart = daysAgoIso(7);
  const monthStart = daysAgoIso(30);

  const groups = [
    { label: "Heute", data: days.filter((d) => d.statDate === today) },
    { label: "Diese Woche", data: days.filter((d) => d.statDate >= weekStart) },
    { label: "Diesen Monat", data: days.filter((d) => d.statDate >= monthStart) },
    { label: "Gesamt", data: days },
  ];

  const series = useMemo(() => {
    const map = new Map(days.map((d) => [d.statDate, d]));
    return Array.from({ length: 14 }, (_, i) => {
      const date = daysAgoIso(13 - i);
      const d = map.get(date);
      return {
        date: date.slice(5).replace("-", "."),
        umsatz: Math.round((d?.revenueCents ?? 0) / 100),
        gesendet: d?.messagesSent ?? 0,
        empfangen: d?.messagesReceived ?? 0,
      };
    });
  }, [days]);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      <button onClick={onBack} style={{
        alignSelf: "flex-start", fontSize: 12, color: "hsl(0 0% 62%)",
        background: "transparent", border: "none", cursor: "pointer", padding: 0,
      }}>← Performance</button>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar url={model.avatar_url} name={model.display_name} size={48} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "hsl(0 0% 95%)" }}>{model.display_name}</div>
          <div style={{ marginTop: 5 }}><Badge>{preset?.label ?? "Individuell"}</Badge></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {groups.map((g) => {
          const s = sumDays(g.data);
          const pct = successPct(s.offersMade, s.offersAccepted);
          return (
            <div key={g.label} style={{ ...CARD, padding: 16 }}>
              <div style={LABEL}>{g.label}</div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <StatLine label="Umsatz" value={eur(s.revenueCents)} color="hsl(40 60% 68%)" />
                <StatLine label="Nachrichten" value={String(s.messagesSent + s.messagesReceived)} />
                <StatLine label="Angebote" value={String(s.offersMade)} />
                <StatLine label="Quote" value={`${pct.toFixed(1)}%`} color={quoteColor(pct)} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={CARD}>
          <div style={LABEL}>Umsatzverlauf</div>
          <div style={{ height: 220, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(239 84% 62%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(272 72% 60%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1E1E22" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 45%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 45%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip unit="€" />} cursor={{ stroke: "#2A2A30" }} />
                <Area type="monotone" dataKey="umsatz" stroke="hsl(239 84% 66%)" strokeWidth={2} fill="url(#perfRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={CARD}>
          <div style={LABEL}>Nachrichtenverlauf</div>
          <div style={{ height: 220, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#1E1E22" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 45%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 45%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsla(0,0%,100%,0.03)" }} />
                <Bar dataKey="gesendet" fill="hsl(239 84% 62%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="empfangen" fill="hsl(272 72% 60%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatLine({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontSize: 11.5, color: "hsl(0 0% 50%)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: color ?? "hsl(0 0% 92%)" }}>
        {value}
      </span>
    </div>
  );
}

function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#18181D", border: "1px solid #2A2A30", borderRadius: 10,
      padding: "10px 12px", boxShadow: "0 18px 40px hsla(0,0%,0%,0.55)", fontSize: 12,
    }}>
      <div style={{ color: "hsl(0 0% 55%)", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <span style={{ color: p.color ?? "hsl(0 0% 70%)" }}>{p.name}</span>
          <span style={{ color: "hsl(40 60% 70%)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {(p.value ?? 0).toLocaleString("de-DE")}{unit ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/* Icons */
const IconTrend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 17l6-6 4 4 7-7" /><path d="M14 8h6v6" />
  </svg>
);
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="8" r="4" /><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" /><path d="M17 4a4 4 0 0 1 0 8" />
  </svg>
);
const IconTarget = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" />
  </svg>
);
const IconZap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
  </svg>
);
