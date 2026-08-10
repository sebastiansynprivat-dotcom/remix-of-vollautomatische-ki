import { useState, useRef, useEffect } from "react";
import {
  formatRelativeTime, formatCurrency,
  type Conversation, type ModelProfile,
} from "@/data/mockData";
import { Avatar } from "@/components/sx/Avatar";
import { StatusDot, UnreadBadge } from "@/components/sx/Badge";
import { fx } from "@/lib/feedback";
import { useLastOverride, useChat } from "@/lib/chatStore";
import { useSimRuns, setAllSimStates } from "@/lib/simRuns";
import { ProfileMasterBar } from "@/components/profile/ProfileMasterBar";

/** Globale Steuerung der serverseitigen Test-Simulationen. */
function SimControlBar() {
  const { runs } = useSimRuns();
  const all = Array.from(runs.values());
  if (all.length === 0) return null;
  const running = all.filter(r => r.state === "running").length;
  const anyRunning = running > 0;

  return (
    <div style={{ padding: "0 16px 10px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderRadius: 10,
        background: "color-mix(in oklab, var(--accent) 7%, transparent)",
        border: "1px solid color-mix(in oklab, var(--accent) 24%, transparent)",
      }}>
        <span
          style={{ background: anyRunning ? "var(--status-success)" : "var(--text-disabled)" }}
          style={{
            width: 8, height: 8, borderRadius: 999, flexShrink: 0,
            background: anyRunning ? undefined : "var(--text-subtle)",
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: "var(--accent)" }}>
          Live-Simulation · {running}/{all.length} aktiv
        </span>
        <button
          type="button"
          onClick={() => { fx.haptic("tick"); void setAllSimStates(anyRunning ? "paused" : "running"); }}
          style={{
            marginLeft: "auto", padding: "4px 10px", borderRadius: 999, cursor: "pointer",
            background: anyRunning ? "transparent" : "var(--accent)",
            color: anyRunning ? "var(--accent)" : "var(--bg)",
            border: "1px solid color-mix(in oklab, var(--accent) 34%, transparent)",
            fontSize: 10.5, fontWeight: 700,
          }}
        >
          {anyRunning ? "Alle pausieren" : "Alle starten"}
        </button>
      </div>
    </div>
  );
}


type HeaderContext =
  | { kind: "profile"; profile: ModelProfile }
  | { kind: "flex" }
  | null;

interface Props {
  conversations: Conversation[];
  headerContext: HeaderContext;
  activeId: string | null;
  setActiveId: (id: string) => void;
  onMenu?: () => void;
}

const SWIPE_THRESHOLD = 76;

type FilterId = "top" | "hot" | "open_money" | "unread" | "unanswered";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "top",         label: "Top" },
  { id: "hot",         label: "Heiß" },
  { id: "open_money",  label: "$ offen" },
  { id: "unread",      label: "Ungelesen" },
  { id: "unanswered",  label: "Unbeantw." },
];

export function ConversationList({
  conversations, headerContext, activeId, setActiveId, onMenu,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("top");
  const chat = useChat();
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>(() => (
    Object.fromEntries(conversations.map(c => [c.id, c.unreadCount]))
  ));
  const conversationSeed = conversations.map(c => `${c.id}:${c.unreadCount}`).join("|");

  // Reset unread state when the underlying conversation set changes (profile switched)
  useEffect(() => {
    setUnreadMap(Object.fromEntries(conversations.map(c => [c.id, c.unreadCount])));
  }, [conversationSeed]);

  const setReadState = (id: string, read: boolean) => {
    // TODO: API-Call → POST /api/conversations/:id/read  bzw.  /unread
    const fallbackUnread = conversations.find(c => c.id === id)?.unreadCount ?? 0;
    setUnreadMap(m => ({ ...m, [id]: read ? 0 : Math.max(1, m[id] ?? fallbackUnread) }));
  };

  const unreadCount = conversations.filter(c => (unreadMap[c.id] ?? c.unreadCount) > 0).length;
  const unansweredCount = conversations.filter(c => !c.lastMessage.fromMe).length;

  const heatScore = (id: string) => {
    const b = chat.getCopilotBrief(id);
    if (!b) return 0;
    return b.sentiment.score * 0.6 + b.buyIntent.score * 0.4;
  };
  const hasOpenPpv = (id: string) => {
    const msgs = chat.getMessages(id);
    return msgs.some(m => m.contentType === "ppv" && m.ppv && !m.ppv.isPurchased);
  };

  const filtered = conversations
    .filter(c => c.participant.displayName.toLowerCase().includes(search.toLowerCase()))
    .filter(c => {
      if (filter === "unread") return (unreadMap[c.id] ?? c.unreadCount) > 0;
      if (filter === "unanswered") return !c.lastMessage.fromMe;
      if (filter === "open_money") return hasOpenPpv(c.id);
      return true;
    })
    .sort((a, b) => {
      if (!!a.isAutopilot !== !!b.isAutopilot) return a.isAutopilot ? -1 : 1;
      if (a.id === "conv-ai-mia") return -1;
      if (b.id === "conv-ai-mia") return 1;
      if (filter === "hot") return heatScore(b.id) - heatScore(a.id);
      if (filter === "open_money") {
        // sort by spend among those with open PPV
        return b.totalSpent - a.totalSpent;
      }
      return b.totalSpent - a.totalSpent;
    });

  const sortLabel = filter === "hot"
    ? "Sortiert nach Hitze"
    : filter === "open_money"
      ? "Offene PPVs · Geld liegt rum"
      : "Sortiert nach Ausgaben";

  return (
    <div
      data-mobile-full
      style={{
        width: onMenu ? "100%" : 340,
        maxWidth: "100%",
        height: "100dvh", flexShrink: 0,
        borderRight: onMenu ? "none" : "1px solid var(--hairline-accent)",
        display: "flex", flexDirection: "column",
        background: "linear-gradient(180deg, hsla(40,18%,8%,0.35), hsla(0,0%,4%,0.45))",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <ListHeader headerContext={headerContext} onMenu={onMenu} />

      {headerContext?.kind === "profile" && (
        <ProfileMasterBar
          key={headerContext.profile.id}
          modelId={headerContext.profile.id}
          displayName={headerContext.profile.displayName}
          avatarUrl={headerContext.profile.avatarUrl}
        />
      )}

      <SimControlBar />



      <div style={{ padding: "0 16px 10px" }}>
        <div className="premium-card" style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen..."
            style={{ flex: 1, fontSize: 13, color: "var(--text-strong)" }}
          />
        </div>
      </div>

      {/* Sticky filter pills */}
      <div style={{
        padding: "4px 12px 10px",
        display: "flex", gap: 6, overflowX: "auto",
        borderBottom: "1px solid hsla(0,0%,100%,0.04)",
      }}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          const badge = f.id === "unread" ? unreadCount : f.id === "unanswered" ? unansweredCount : null;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
              padding: "6px 12px", borderRadius: 999,
              fontSize: 12, fontWeight: 600,
              color: active ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${active ? "hsla(40,45%,55%,0.45)" : "hsla(0,0%,100%,0.06)"}`,
              background: active ? "hsla(40,45%,55%,0.10)" : "hsla(0,0%,100%,0.02)",
              boxShadow: active ? "0 0 16px hsla(40,45%,55%,0.18)" : undefined,
              transition: "all 220ms var(--easing)",
            }}>
              {f.label}
              {badge != null && badge > 0 && (
                <span className="tabular" style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8,
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  background: active ? "hsla(40,45%,55%,0.15)" : "hsla(0,0%,100%,0.05)",
                }}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{
        padding: "8px 16px 6px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        color: "var(--text-subtle)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6,
      }}>
        <span>{sortLabel}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          wischen
        </span>
      </div>

      <ul className="stagger" style={{ flex: 1, overflowY: "auto", padding: "4px 8px 16px" }}>
        {filtered.length === 0 && (
          <li style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-subtle)", fontSize: 12 }}>
            Keine Konversationen mit diesem Filter.
          </li>
        )}
        {filtered.map((conv, i) => (
          <ConversationRow
            key={conv.id}
            conv={conv}
            unread={unreadMap[conv.id] ?? conv.unreadCount}
            active={conv.id === activeId}
            rank={i + 1}
            index={i}
            onSelect={() => { setActiveId(conv.id); setReadState(conv.id, true); }}
            onMarkRead={() => setReadState(conv.id, true)}
            onMarkUnread={() => setReadState(conv.id, false)}
          />
        ))}
      </ul>
    </div>
  );
}

function MenuButton({ onMenu }: { onMenu?: () => void }) {
  if (!onMenu) return null;
  return (
    <button onClick={onMenu} aria-label="Menü" style={{
      width: 36, height: 36, borderRadius: 10,
      display: "grid", placeItems: "center", color: "var(--text-muted)",
      background: "hsla(0,0%,100%,0.03)", flexShrink: 0,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>
      </svg>
    </button>
  );
}

function ListHeader({ headerContext, onMenu }: { headerContext: HeaderContext; onMenu?: () => void }) {
  if (headerContext?.kind === "flex") {
    return (
      <div style={{ padding: "20px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <MenuButton onMenu={onMenu} />
          <span style={{
            width: 36, height: 36, borderRadius: 10,
            display: "grid", placeItems: "center",
            background: "linear-gradient(135deg, hsla(40,45%,55%,0.18), hsla(40,45%,55%,0.04))",
            color: "var(--accent)",
            border: "1px solid hsla(40,45%,55%,0.3)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "var(--text-strong)", fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>Flex-Pool</div>
            <div style={{ color: "var(--text-subtle)", fontSize: 11 }}>Offene Schichten · andere Profile</div>
          </div>
        </div>
      </div>
    );
  }

  if (headerContext?.kind === "profile") {
    const p = headerContext.profile;
    return (
      <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <MenuButton onMenu={onMenu} />
        <img
          src={p.avatarUrl}
          alt={p.displayName}
          width={42} height={42}
          loading="lazy"
          style={{
            width: 42, height: 42, borderRadius: "50%", objectFit: "cover",
            boxShadow: "0 0 0 2px var(--accent), 0 0 0 4px var(--surface-1), 0 0 20px hsla(40,45%,55%,0.2)",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--text-strong)", fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
            {p.displayName}
          </div>
          <div className="tabular" style={{ color: "var(--text-subtle)", fontSize: 11 }}>
            {p.handle} · {p.subscribers.toLocaleString("de-DE")} Abonnenten
          </div>
        </div>
        <button title="Profil-Aktionen" style={{
          width: 32, height: 32, borderRadius: 8, color: "var(--text-muted)",
          display: "grid", placeItems: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>
    );
  }

  return null;
}

function ConversationRow({
  conv, unread, active, rank, index, onSelect, onMarkRead, onMarkUnread,
}: {
  conv: Conversation;
  unread: number;
  active: boolean;
  rank: number;
  index: number;
  onSelect: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
}) {
  const override = useLastOverride(conv.id);
  const lastMessage = override ?? conv.lastMessage;
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const targetRef = useRef(0);
  const cooldownRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  const resetRow = () => {
    cooldownRef.current = false;
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    targetRef.current = 0;
    setOffset(0);
    setIsSwiping(false);
  };

  // Native non-passive wheel listener so we can preventDefault and stop the
  // browser's horizontal back/forward swipe gesture (macOS trackpad).
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;

    const armIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        cooldownRef.current = false;
        targetRef.current = 0;
        setOffset(0);
        setIsSwiping(false);
        idleTimerRef.current = null;
      }, 140);
    };

    const onWheel = (e: WheelEvent) => {
      // Only react to clearly horizontal intent; let vertical scroll pass through.
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.15 || Math.abs(e.deltaX) < 2) return;
      e.preventDefault();
      e.stopPropagation();

      // After a commit, swallow inertia until the gesture truly ends.
      if (cooldownRef.current) { armIdle(); return; }

      const next = targetRef.current + e.deltaX * 0.9;
      const TH = SWIPE_THRESHOLD;

      // Threshold crossed → commit instantly, snap back smoothly.
      if (Math.abs(next) >= TH) {
        cooldownRef.current = true;
        fx.haptic("snap");
        next > 0 ? onMarkRead() : onMarkUnread();
        targetRef.current = 0;
        setIsSwiping(false); // re-enable transition for snap-back
        setOffset(0);
        armIdle();
        return;
      }

      // Smooth follow during gesture.
      const MAX = TH * 1.1;
      const clamped = Math.max(-MAX, Math.min(MAX, next));
      targetRef.current = clamped;
      setIsSwiping(true);
      setOffset(clamped);
      armIdle();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onMarkRead, onMarkUnread]);

  const willMarkRead = offset >= 0;
  const willMarkUnread = offset < 0;
  const reached = Math.abs(offset) >= SWIPE_THRESHOLD;
  const actionColor = willMarkRead ? "var(--status-success)" : "var(--accent)";
  const actionLabel = willMarkRead ? "Gelesen" : willMarkUnread ? "Ungelesen" : "";

  return (
    <li style={{ position: "relative", overflow: "hidden", borderRadius: 12, marginBottom: 2, animationDelay: `${Math.min(index, 12) * 28}ms` }}>
      {Math.abs(offset) > 1 && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center",
          justifyContent: offset > 0 ? "flex-start" : "flex-end",
          padding: "0 18px",
          background: `linear-gradient(${offset > 0 ? "90deg" : "270deg"}, color-mix(in srgb, ${actionColor} 22%, transparent), transparent 60%)`,
          color: actionColor,
          fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
          pointerEvents: "none",
        }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 6,
            transform: `scale(${reached ? 1.08 : 0.9})`,
            opacity: Math.min(1, Math.abs(offset) / SWIPE_THRESHOLD),
            transition: "transform 200ms var(--easing), opacity 200ms var(--easing)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {willMarkRead
                ? <path d="M5 12l5 5L20 7"/>
                : <><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/></>}
            </svg>
            {actionLabel}
          </span>
        </div>
      )}

      <button
        ref={btnRef}
        onClick={onSelect}
        style={{
          overscrollBehaviorX: "contain",
          touchAction: "pan-y",
          position: "relative",
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "12px", borderRadius: 12,
          background: active ? "linear-gradient(90deg, hsla(40,45%,55%,0.10), transparent 80%)" : "transparent",
          textAlign: "left",
          transform: `translate3d(${offset}px, 0, 0)`,
          willChange: "transform",
          transition: `${isSwiping ? "none" : "transform 240ms cubic-bezier(0.16, 1, 0.3, 1)"}, background 240ms var(--easing)`,
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "hsla(0,0%,100%,0.025)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; resetRow(); }}
      >
        <span style={{
          position: "absolute", left: 0, top: "50%",
          width: 2, height: active ? "60%" : "0%",
          transform: "translate(-50%, -50%)",
          background: "var(--accent)", borderRadius: 2,
          boxShadow: active ? "0 0 12px var(--accent)" : undefined,
          transition: "height 240ms var(--easing)",
        }} />
        <div style={{ position: "relative" }}>
          <Avatar id={conv.participant.id} name={conv.participant.displayName} size={44} />
          <div style={{ position: "absolute", bottom: 0, right: 0 }}>
            <StatusDot status={conv.participant.status} size={10} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            {rank === 1 && conv.totalSpent > 0 && (
              <span title="Top-Spender" style={{ fontSize: 12, lineHeight: 1 }}>👑</span>
            )}
            <span style={{
              color: unread > 0 ? "var(--text-strong)" : "var(--text-muted)",
              fontSize: 13, fontWeight: unread > 0 ? 600 : 500,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
            }}>
              {conv.participant.displayName}
            </span>
            {conv.id === "conv-ai-mia" && (
              <span style={{
                fontSize: 10, fontWeight: 500, letterSpacing: 0.2, flexShrink: 0,
                padding: "1px 6px", borderRadius: 999,
                color: "#C7D2FE",
                background: "rgba(99,102,241,0.16)",
                textTransform: "uppercase",
              }}>AI</span>
            )}
            {conv.isAutopilot && (
              <span style={{
                fontSize: 10, fontWeight: 500, letterSpacing: 0.2, flexShrink: 0,
                padding: "1px 6px", borderRadius: 999,
                color: "#C7D2FE",
                background: "rgba(99,102,241,0.16)",
                textTransform: "uppercase",
              }}>Auto</span>
            )}
            {conv.totalSpent > 0 && <SpendChip amount={conv.totalSpent} highlight={rank === 1} />}
          </div>
          <div style={{
            color: unread > 0 ? "var(--text)" : "var(--text-subtle)",
            fontSize: 12,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {lastMessage.fromMe && (
              <span style={{ color: "var(--text-subtle)", marginRight: 4 }}>Du: </span>
            )}
            {lastMessage.content}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <span className="tabular" suppressHydrationWarning style={{ color: "var(--text-subtle)", fontSize: 11 }}>
            {formatRelativeTime(lastMessage.createdAt)}
          </span>
          <UnreadBadge count={unread} />
        </div>
      </button>
    </li>
  );
}

function SpendChip({ amount, highlight = false }: { amount: number; highlight?: boolean }) {
  const color = "var(--money)";
  return (
    <span className="tabular" style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 10.5, fontWeight: 500, letterSpacing: 0, flexShrink: 0,
      color, padding: "1px 6px", borderRadius: 999,
      background: "rgba(251,191,36,0.12)",
      opacity: highlight ? 1 : 0.85,
    }}>{formatCurrency(amount)}</span>
  );
}
