import { useMemo } from "react";
import { Avatar } from "@/components/sx/Avatar";
import { mockCurrentUser, formatCurrency, type Conversation } from "@/data/mockData";
import {
  useChat, useMessages, useCopilotBrief, useFanNote, useFanFacts,
} from "@/lib/chatStore";

const moodC: Record<string, string> = {
  "kalt": "hsl(210, 30%, 55%)",
  "neutral": "hsl(40, 8%, 60%)",
  "warm": "hsl(35, 70%, 60%)",
  "heiß": "hsl(18, 80%, 60%)",
  "sehr heiß": "hsl(0, 75%, 60%)",
};

export function FanDnaPanel({
  conv, onClose, fullWidth = false,
}: { conv: Conversation; onClose: () => void; fullWidth?: boolean }) {
  const chat = useChat();
  const msgs = useMessages(conv.id);
  const brief = useCopilotBrief(conv.id);
  const note = useFanNote(conv.id);
  const facts = useFanFacts(conv.id);

  // ---- derived ----
  const ppvs = useMemo(
    () => msgs.filter(m => m.contentType === "ppv" && m.ppv).slice(-3).reverse(),
    [msgs]
  );
  const lastTip = useMemo(
    () => [...msgs].reverse().find(m => m.contentType === "tip" && m.tip)?.tip,
    [msgs]
  );
  const ppvSent = msgs.filter(m => m.contentType === "ppv" && m.ppv).length;
  const ppvBought = msgs.filter(m => m.contentType === "ppv" && m.ppv?.isPurchased).length;
  const conv_pct = ppvSent ? Math.round((ppvBought / ppvSent) * 100) : 0;
  const avgPpv = ppvSent
    ? Math.round(
        msgs.filter(m => m.contentType === "ppv" && m.ppv).reduce((s, m) => s + (m.ppv?.price ?? 0), 0) / ppvSent
      )
    : 0;

  // open loops: fan questions with no model reply after
  const openLoops = useMemo(() => {
    const loops: { id: string; text: string }[] = [];
    msgs.forEach((m, i) => {
      if (m.senderId === mockCurrentUser.id) return;
      if (m.contentType !== "text" || !m.content) return;
      if (!/[?]/.test(m.content)) return;
      const replied = msgs.slice(i + 1).some(x => x.senderId === mockCurrentUser.id && x.contentType === "text");
      if (!replied) loops.push({ id: m.id, text: m.content.slice(0, 90) });
    });
    return loops.slice(-3);
  }, [msgs]);

  const moodLabel = brief?.sentiment.mood ?? "—";
  const moodColor = moodC[moodLabel] ?? "hsla(0,0%,100%,0.2)";

  return (
    <aside style={{
      width: fullWidth ? "100%" : 280,
      flexShrink: 0,
      height: fullWidth ? "100%" : "100dvh",
      maxHeight: "100dvh",
      display: "flex", flexDirection: "column",
      borderLeft: fullWidth ? "none" : "1px solid hsla(0,0%,100%,0.05)",
      background: "linear-gradient(180deg, hsla(40,30%,9%,0.4), hsla(0,0%,100%,0.012))",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 14px 12px",
        borderBottom: "1px solid hsla(0,0%,100%,0.04)",
      }}>
        <Avatar id={conv.participant.id} name={conv.participant.displayName} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display" style={{
            color: "var(--text-strong)", fontSize: 14, fontWeight: 500,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{conv.participant.displayName}</div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 10, color: "var(--text-subtle)", marginTop: 2,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: moodColor, boxShadow: `0 0 6px ${moodColor}` }} />
            <span style={{ textTransform: "capitalize" }}>{moodLabel}</span>
            {brief && <span className="tabular">· Intent {brief.buyIntent.score}%</span>}
          </div>
        </div>
        <button onClick={onClose} title="Panel ausblenden ( ] )" style={{
          width: 26, height: 26, borderRadius: 6,
          color: "var(--text-subtle)", display: "grid", placeItems: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Money */}
        <Section title="Money">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Stat label="Lifetime" value={formatCurrency(conv.totalSpent)} accent />
            <Stat label="Tip-Vol." value={formatCurrency(conv.tipVolume)} />
            <Stat label="Ø PPV" value={avgPpv ? formatCurrency(avgPpv) : "—"} />
            <Stat label="Conv." value={ppvSent ? `${conv_pct}%` : "—"} />
          </div>
          {lastTip && (
            <div style={{
              marginTop: 8, fontSize: 10.5, color: "var(--text-subtle)",
              display: "flex", justifyContent: "space-between",
            }}>
              <span>Letzter Tip</span>
              <span className="tabular" style={{ color: "var(--gold)" }}>{formatCurrency(lastTip.amount)}</span>
            </div>
          )}
        </Section>

        {/* Recent PPVs */}
        <Section title="Letzte PPVs">
          {ppvs.length === 0 ? (
            <Empty>Noch keine PPVs verschickt.</Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ppvs.map(m => {
                const p = m.ppv!;
                const status = p.isPurchased ? "gekauft" : "offen";
                const color = p.isPurchased ? "var(--status-success)" : "var(--text-subtle)";
                return (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 11, color: "var(--text-muted)",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
                    <span style={{ flex: 1, textTransform: "capitalize" }}>{p.mediaType}</span>
                    <span className="tabular">{formatCurrency(p.price)}</span>
                    <span style={{ fontSize: 9.5, color, textTransform: "uppercase", letterSpacing: 0.5, minWidth: 42, textAlign: "right" }}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Risk Flags */}
        {brief && brief.riskFlags.length > 0 && (
          <Section title="Achtung">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {brief.riskFlags.map(f => (
                <span key={f} style={{
                  fontSize: 10.5, padding: "3px 8px", borderRadius: 999,
                  color: "hsl(0,75%,84%)",
                  background: "hsla(0,75%,55%,0.10)",
                  border: "1px solid hsla(0,75%,60%,0.25)",
                }}>{f}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Open Loops */}
        <Section title="Offene Fragen">
          {openLoops.length === 0 ? (
            <Empty>Keine offenen Fan-Fragen.</Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {openLoops.map(l => (
                <div key={l.id} style={{
                  fontSize: 11.5, color: "var(--text)", lineHeight: 1.4,
                  padding: "6px 8px", borderRadius: 6,
                  background: "hsla(45,85%,55%,0.05)",
                  borderLeft: "2px solid hsla(45,85%,55%,0.45)",
                }}>"{l.text}"</div>
              ))}
            </div>
          )}
        </Section>

        {/* Auto-Profile (von der AI gepflegt) */}
        {hasAnyFact(facts) && (
          <Section title="Profil · automatisch">
            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: "var(--text)" }}>
              {facts.name && <FactRow k="Name" v={facts.name} />}
              {facts.age && <FactRow k="Alter" v={facts.age} />}
              {facts.job && <FactRow k="Job" v={facts.job} />}
              {facts.location && <FactRow k="Ort" v={facts.location} />}
              {facts.relationship && <FactRow k="Status" v={facts.relationship} />}
              {facts.buyingPattern && <FactRow k="Kaufmuster" v={facts.buyingPattern} />}
            </div>
            {!!facts.kinks?.length && <PillRow label="mag" items={facts.kinks} tone="warm" />}
            {!!facts.dislikes?.length && <PillRow label="meidet" items={facts.dislikes} tone="cold" />}
            {!!facts.other?.length && (
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
                {facts.other.map((o, i) => (
                  <div key={i} style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>· {o}</div>
                ))}
              </div>
            )}
            <button
              onClick={() => chat.clearFanFacts(conv.id)}
              title="Profil zurücksetzen"
              style={{
                marginTop: 8, fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase",
                color: "var(--text-subtle)", padding: "2px 6px", borderRadius: 4,
              }}
            >Profil zurücksetzen</button>
          </Section>
        )}

        {/* Notes */}
        <Section title="Eigene Notizen">
          <textarea
            value={note}
            onChange={e => chat.setFanNote(conv.id, e.target.value)}
            placeholder="Was du dir zusätzlich merken willst…"
            rows={4}
            style={{
              width: "100%", resize: "none",
              fontSize: 12, lineHeight: 1.45,
              padding: "8px 10px", borderRadius: 8,
              color: "var(--text-strong)",
              background: "hsla(0,0%,100%,0.025)",
              border: "1px solid hsla(0,0%,100%,0.06)",
            }}
          />
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 9.5, letterSpacing: 1.2, textTransform: "uppercase",
        color: "var(--text-subtle)", fontWeight: 700, marginBottom: 6,
      }}>{title}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 8,
      background: accent ? "color-mix(in srgb, var(--gold) 8%, transparent)" : "hsla(0,0%,100%,0.025)",
      border: `1px solid ${accent ? "color-mix(in srgb, var(--gold) 24%, transparent)" : "hsla(0,0%,100%,0.05)"}`,
    }}>
      <div style={{ fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--text-subtle)" }}>{label}</div>
      <div className="tabular" style={{
        marginTop: 2, fontSize: 13, fontWeight: 600,
        color: accent ? "var(--gold)" : "var(--text-strong)",
      }}>{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "var(--text-subtle)", fontStyle: "italic" }}>{children}</div>;
}

function hasAnyFact(f: import("@/lib/chatStore").FanFacts) {
  return !!(f.name || f.age || f.job || f.location || f.relationship || f.buyingPattern
    || f.kinks?.length || f.dislikes?.length || f.other?.length);
}

function FactRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{
        fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase",
        color: "var(--text-subtle)", fontWeight: 600, minWidth: 60, flexShrink: 0,
      }}>{k}</span>
      <span style={{ color: "var(--text-strong)", fontSize: 11.5, lineHeight: 1.35 }}>{v}</span>
    </div>
  );
}

function PillRow({ label, items, tone }: { label: string; items: string[]; tone: "warm" | "cold" }) {
  const color = tone === "warm" ? "hsl(18, 80%, 70%)" : "hsl(210, 30%, 70%)";
  const bg = tone === "warm" ? "hsla(18,80%,55%,0.10)" : "hsla(210,30%,55%,0.10)";
  const border = tone === "warm" ? "hsla(18,80%,60%,0.30)" : "hsla(210,30%,60%,0.25)";
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase",
        color: "var(--text-subtle)", fontWeight: 600, marginBottom: 4,
      }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {items.map((it, i) => (
          <span key={i} style={{
            fontSize: 10.5, padding: "3px 8px", borderRadius: 999,
            color, background: bg, border: `1px solid ${border}`,
          }}>{it}</span>
        ))}
      </div>
    </div>
  );
}
