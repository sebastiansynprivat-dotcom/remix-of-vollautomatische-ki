import type { ModelProfile } from "@/data/mockData";
import { useAuth } from "@/hooks/useAuth";

export type View =
  | { kind: "messages"; profileId: string }
  | { kind: "cloud"; profileId?: string; returnConvId?: string | null }
  | { kind: "performance" }
  | { kind: "monitor" }
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
    <aside style={{
      width: 240, height: "100dvh", flexShrink: 0,
      background: "#0D0D0F",
      borderRight: "1px solid #1A1A1E",
      display: "flex", flexDirection: "column",
      padding: "12px 10px",
      overflowY: "auto",
      position: "relative",
    }}>
      {/* Workspace logo */}
      <div style={{ padding: "6px 8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 20, height: 20, borderRadius: 6,
          background: "var(--surface-3)", color: "var(--text-strong)",
          display: "grid", placeItems: "center",
          fontWeight: 600, fontSize: 10, letterSpacing: -0.2,
        }}>SX</div>
        <span style={{ color: "var(--text-strong)", fontWeight: 600, fontSize: 13, letterSpacing: -0.1 }}>Studio</span>
      </div>

      {/* Assigned profiles section */}
      <SectionLabel>Meine Profile</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        <NavCardItem

          active={view.kind === "performance"}
          onClick={() => setView({ kind: "performance" })}
          title="Performance"
          subtitle="Kennzahlen & Umsatz"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="7" /><rect x="13" y="6" width="3" height="11" />
            </svg>
          }
        />
        <NavCardItem
          active={view.kind === "monitor"}
          onClick={() => setView({ kind: "monitor" })}
          title="Monitor"
          subtitle="System-Gesundheit"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          }
        />
        <NavCardItem

          active={view.kind === "models"}
          onClick={() => setView({ kind: "models" })}
          title="Models"
          subtitle="Personas & Chat-Verhalten"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
            </svg>
          }
        />
      </div>



      <div style={{ flex: 1 }} />

      <div style={{
        padding: "8px 10px", borderRadius: 6,
        border: "1px solid #1A1A1E",
        background: "var(--surface-1)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
          background: "var(--surface-3)", color: "var(--text-strong)",
          display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: "var(--text-strong)", fontSize: 13, fontWeight: 500, letterSpacing: -0.1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{displayName}</div>
          <div title={email} style={{
            color: "var(--text-subtle)", fontSize: 11, display: "flex", alignItems: "center", gap: 5,
            overflow: "hidden",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: "var(--status-success)", display: "inline-block",
              
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
      padding: "0 10px 6px",
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em",
      color: "var(--text-subtle)",
    }}>
      {children}
    </div>
  );
}


function ProfileNavItem({
  avatarUrl, name, handle, unread, active, onClick,
}: { avatarUrl: string; name: string; handle: string; unread: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      position: "relative",
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 6,
      background: active ? "#1F1F25" : "transparent",
      border: "1px solid transparent",
      transition: "background-color 150ms var(--easing), color 150ms var(--easing)",
      textAlign: "left",
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#18181D"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{
        position: "absolute", left: 0, top: "50%", width: 3,
        height: active ? 20 : 0, transform: "translateY(-50%)",
        background: "var(--accent)",
        borderRadius: 999, transition: "height 200ms var(--easing)",
      }} />
      <span style={{ position: "relative", flexShrink: 0 }}>
        <img
          src={avatarUrl}
          alt={name}
          loading="lazy"
          width={24} height={24}
          style={{
            width: 24, height: 24, borderRadius: "50%", objectFit: "cover",
          }}
        />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: active ? "var(--text-strong)" : "var(--text)",
          fontSize: 13, fontWeight: 500, letterSpacing: -0.1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{name}</div>
        <div style={{
          color: "var(--text-subtle)", fontSize: 11,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{handle}</div>
      </div>
      {unread > 0 && (
        <span className="tabular-nums" style={{
          minWidth: 18, height: 18, padding: "0 6px", borderRadius: 999,
          background: "var(--surface-3)", color: "var(--text-strong)",
          fontSize: 11, fontWeight: 500,
          display: "grid", placeItems: "center",
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
      padding: "8px 12px", borderRadius: 6,
      background: active ? "#1F1F25" : "transparent",
      border: "1px solid transparent",
      transition: "background-color 150ms var(--easing)",
      textAlign: "left",
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#18181D"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{
        position: "absolute", left: 0, top: "50%", width: 3,
        height: active ? 20 : 0, transform: "translateY(-50%)",
        background: "var(--accent)",
        borderRadius: 999, transition: "height 200ms var(--easing)",
      }} />
      <span style={{
        width: 18, height: 18,
        display: "grid", placeItems: "center", flexShrink: 0,
        color: active ? "var(--text-strong)" : "var(--text-subtle)",
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: active ? "var(--text-strong)" : "var(--text)", fontSize: 13, fontWeight: 500, letterSpacing: -0.1 }}>{title}</div>
        <div style={{ color: "var(--text-subtle)", fontSize: 11 }}>{subtitle}</div>
      </div>
    </button>
  );
}
