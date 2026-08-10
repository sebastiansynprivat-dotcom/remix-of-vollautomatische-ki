import type { ModelProfile } from "@/data/mockData";
import { useAuth } from "@/hooks/useAuth";

export type View =
  | { kind: "messages"; profileId: string }
  | { kind: "cloud"; profileId?: string; returnConvId?: string | null }
  | { kind: "performance" }
  | { kind: "models" }
  | { kind: "profile" };


interface Props {
  view: View;
  setView: (v: View) => void;
  models: ModelProfile[];
}

export function Sidebar({ view, setView, models }: Props) {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const metaName = (user?.user_metadata as { display_name?: string; full_name?: string } | undefined);
  const displayName = metaName?.display_name || metaName?.full_name || (email ? email.split("@")[0] : "Account");
  const initials = (displayName || email || "?")
    .split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("") || "?";

  return (
    <aside className="glass" style={{
      width: 252, height: "100dvh", flexShrink: 0,
      backgroundImage: "linear-gradient(180deg, hsla(40,28%,11%,0.55) 0%, hsla(0,0%,4%,0.7) 100%), radial-gradient(ellipse 70% 35% at 0% 0%, hsla(38,38%,18%,0.55) 0%, transparent 70%)",
      borderRight: "1px solid var(--hairline-gold)",
      boxShadow: "1px 0 0 0 hsla(0,0%,100%,0.02), 8px 0 32px hsla(0,0%,0%,0.35)",
      display: "flex", flexDirection: "column",
      padding: "20px 14px",
      overflowY: "auto",
      position: "relative",
    }}>
      {/* Workspace logo */}
      <div style={{ padding: "8px 12px 22px", display: "flex", alignItems: "center", gap: 10 }}>
        <div className="gold-gradient-bg" style={{
          width: 36, height: 36, borderRadius: 10,
          display: "grid", placeItems: "center",
          fontWeight: 800, fontSize: 14, letterSpacing: -0.5,
          boxShadow: "var(--shadow-gold)",
        }}>SX</div>
        <span className="display" style={{ color: "var(--text-strong)", fontWeight: 500, fontSize: 16, letterSpacing: -0.3 }}>Studio</span>
      </div>

      {/* Assigned profiles section */}
      <SectionLabel>Meine Profile</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 14 }}>
        {models.map((p) => {
          const active = view.kind === "messages" && view.profileId === p.id;
          return (
            <ProfileNavItem
              key={p.id}
              avatarUrl={p.avatarUrl}
              name={p.displayName}
              handle={p.handle}
              unread={p.unread}
              active={active}
              onClick={() => setView({ kind: "messages", profileId: p.id })}
            />
          );
        })}
      </div>


      {/* Dev */}
      <SectionLabel>Dev</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        <NavCardItem

          active={view.kind === "performance"}
          onClick={() => setView({ kind: "performance" })}
          title="Performance"
          subtitle="Kennzahlen & Umsatz"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="7" /><rect x="13" y="6" width="3" height="11" />
            </svg>
          }
        />
        <NavCardItem
          active={view.kind === "models"}
          onClick={() => setView({ kind: "models" })}
          title="Models"
          subtitle="Personas & Chat-Verhalten"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
            </svg>
          }
        />
      </div>



      <div style={{ flex: 1 }} />

      <div className="glass" style={{
        padding: 12, borderRadius: 14,
        border: "1px solid var(--hairline-gold)",
        background: "linear-gradient(160deg, hsla(38,32%,16%,0.45), hsla(0,0%,0%,0.3))",
        boxShadow: "var(--shadow-soft), inset 0 1px 0 hsla(40,40%,70%,0.06)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div className="gold-gradient-bg" style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700,
          boxShadow: "var(--shadow-gold)",
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: "var(--text-strong)", fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{displayName}</div>
          <div title={email} style={{
            color: "var(--text-subtle)", fontSize: 10.5, display: "flex", alignItems: "center", gap: 5,
            overflow: "hidden",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: "var(--status-success)", display: "inline-block",
              boxShadow: "0 0 8px var(--status-success)",
              animation: "breathe 3s ease-in-out infinite",
            }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {email || "—"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "0 12px 8px",
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
      color: "var(--text-subtle)",
    }}>
      <span style={{
        width: 4, height: 4, borderRadius: "50%",
        background: "var(--gold)", boxShadow: "0 0 6px var(--gold)",
      }} />
      {children}
    </div>
  );
}

function ContentCloudItem({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      position: "relative",
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px", borderRadius: 12,
      background: active
        ? "linear-gradient(90deg, hsla(38,42%,58%,0.14), hsla(38,42%,58%,0.02) 70%, transparent)"
        : "linear-gradient(90deg, hsla(40,30%,30%,0.06), transparent)",
      border: `1px solid ${active ? "hsla(38,42%,58%,0.22)" : "hsla(40,30%,40%,0.12)"}`,
      boxShadow: active ? "inset 0 1px 0 hsla(40,60%,75%,0.08), 0 4px 16px hsla(38,45%,52%,0.10)" : undefined,
      transition: "all 240ms var(--easing)",
      textAlign: "left",
    }}>
      <span style={{
        position: "absolute", left: -14, top: "50%", width: 2,
        height: active ? "60%" : 0, transform: "translateY(-50%)",
        background: "var(--gold)", boxShadow: active ? "0 0 12px var(--gold)" : undefined,
        borderRadius: 2, transition: "height 240ms var(--easing)",
      }} />
      <span style={{
        width: 32, height: 32, borderRadius: 10,
        display: "grid", placeItems: "center", flexShrink: 0,
        background: "linear-gradient(135deg, hsla(40,42%,55%,0.22), hsla(40,30%,30%,0.06))",
        color: "var(--gold)",
        border: "1px solid hsla(40,42%,58%,0.22)",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17.5 19a4.5 4.5 0 1 0-1.34-8.79A6 6 0 0 0 4 13a4 4 0 0 0 4 4h9.5z"/>
        </svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--text-strong)", fontSize: 13, fontWeight: 600, letterSpacing: -0.1 }}>Content Cloud</div>
        <div style={{ color: "var(--text-subtle)", fontSize: 10 }}>Medien & PPV-Vorlagen</div>
      </div>
    </button>
  );
}

function ProfileNavItem({
  avatarUrl, name, handle, unread, active, onClick,
}: { avatarUrl: string; name: string; handle: string; unread: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      position: "relative",
      display: "flex", alignItems: "center", gap: 11,
      padding: "9px 10px", borderRadius: 12,
      background: active
        ? "linear-gradient(90deg, hsla(38,42%,58%,0.14), hsla(38,42%,58%,0.02) 70%, transparent)"
        : "transparent",
      border: active ? "1px solid hsla(38,42%,58%,0.18)" : "1px solid transparent",
      boxShadow: active ? "inset 0 1px 0 hsla(40,60%,75%,0.08), 0 4px 16px hsla(38,45%,52%,0.10)" : undefined,
      transition: "all 240ms var(--easing)",
      textAlign: "left",
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "hsla(0,0%,100%,0.035)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{
        position: "absolute", left: -14, top: "50%", width: 2,
        height: active ? "60%" : 0, transform: "translateY(-50%)",
        background: "linear-gradient(180deg, transparent, var(--gold), transparent)",
        boxShadow: active ? "0 0 14px var(--gold)" : undefined,
        borderRadius: 2, transition: "height 260ms var(--easing)",
      }} />
      <span style={{ position: "relative", flexShrink: 0 }}>
        <img
          src={avatarUrl}
          alt={name}
          loading="lazy"
          width={34} height={34}
          style={{
            width: 34, height: 34, borderRadius: "50%", objectFit: "cover",
            boxShadow: active
              ? "0 0 0 1.5px var(--gold), 0 0 0 3px var(--surface-1), 0 0 14px hsla(38,55%,60%,0.45)"
              : "inset 0 0 0 1px hsla(40,30%,70%,0.10), 0 2px 6px hsla(0,0%,0%,0.4)",
            transition: "box-shadow 240ms var(--easing)",
          }}
        />
        {active && (
          <span style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            border: "1px solid hsla(38,55%,60%,0.25)",
            animation: "haloBreathe 3.2s ease-in-out infinite",
            pointerEvents: "none",
          }} />
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: active ? "var(--text-strong)" : "var(--text)",
          fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{name}</div>
        <div style={{
          color: "var(--text-subtle)", fontSize: 10,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{handle}</div>
      </div>
      {unread > 0 && (
        <span className="gold-gradient-bg tabular-nums" style={{
          minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9,
          fontSize: 10, fontWeight: 700,
          display: "grid", placeItems: "center",
          boxShadow: "0 2px 8px hsla(38,45%,52%,0.4)",
        }}>{unread}</span>
      )}
    </button>
  );
}


function NavCardItem({
  active, onClick, title, subtitle, icon,
}: { active: boolean; onClick: () => void; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      position: "relative",
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px", borderRadius: 12,
      background: active
        ? "linear-gradient(90deg, hsla(38,42%,58%,0.14), hsla(38,42%,58%,0.02) 70%, transparent)"
        : "linear-gradient(90deg, hsla(40,30%,30%,0.06), transparent)",
      border: `1px solid ${active ? "hsla(38,42%,58%,0.22)" : "hsla(40,30%,40%,0.12)"}`,
      boxShadow: active ? "inset 0 1px 0 hsla(40,60%,75%,0.08), 0 4px 16px hsla(38,45%,52%,0.10)" : undefined,
      transition: "all 240ms var(--easing)",
      textAlign: "left",
    }}>
      <span style={{
        position: "absolute", left: -14, top: "50%", width: 2,
        height: active ? "60%" : 0, transform: "translateY(-50%)",
        background: "var(--gold)", boxShadow: active ? "0 0 12px var(--gold)" : undefined,
        borderRadius: 2, transition: "height 240ms var(--easing)",
      }} />
      <span style={{
        width: 32, height: 32, borderRadius: 10,
        display: "grid", placeItems: "center", flexShrink: 0,
        background: "linear-gradient(135deg, hsla(40,42%,55%,0.22), hsla(40,30%,30%,0.06))",
        color: "var(--gold)",
        border: "1px solid hsla(40,42%,58%,0.22)",
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--text-strong)", fontSize: 13, fontWeight: 600, letterSpacing: -0.1 }}>{title}</div>
        <div style={{ color: "var(--text-subtle)", fontSize: 10 }}>{subtitle}</div>
      </div>
    </button>
  );
}
