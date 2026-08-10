import { useState } from "react";
import { Avatar } from "@/components/sx/Avatar";
import { formatCurrency, AI_CONV_ID, type Conversation } from "@/data/mockData";
import { useChat } from "@/lib/chatStore";
import { FanBrainDrawer } from "@/components/copilot/FanBrainDrawer";
import { CopilotDebugPanel } from "@/components/copilot/CopilotDebugPanel";
import { AutoModeToggle } from "@/components/chat/AutoModeToggle";

export function ChatHeader({
  conv, onBack, onToggleSearch, searchActive, onAvatarTap, autoMode, onAutoModeChange,
}: {
  conv: Conversation;
  onBack?: () => void;
  onToggleSearch?: () => void;
  searchActive?: boolean;
  onAvatarTap?: () => void;
  autoMode?: boolean;
  onAutoModeChange?: (next: boolean) => void;
}) {
  const chat = useChat();
  const showTools = conv.id !== AI_CONV_ID;
  const [brainOpen, setBrainOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="glass-strong" style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 16px",
      borderBottom: "1px solid #1A1A1E",
      boxShadow: "none",
      position: "relative",
      zIndex: 2,
    }}>
      {onBack && (
        <button onClick={onBack} aria-label="Zurück" style={{
          width: 28, height: 28, borderRadius: 6, marginLeft: -6,
          display: "grid", placeItems: "center", color: "var(--text-muted)",
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
      )}
      <button
        onClick={onAvatarTap}
        aria-label="Fan-Profil öffnen"
        style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "transparent", padding: 0, borderRadius: 999 }}
      >
        <Avatar id={conv.participant.id} name={conv.participant.displayName} size={28} />
      </button>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
        <span style={{ color: "var(--text-strong)", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {conv.participant.displayName}
        </span>
        {conv.totalSpent > 0 && (
          <span className="tabular" style={{
            fontSize: 11, fontWeight: 500, letterSpacing: 0, flexShrink: 0,
            color: "var(--money)", padding: "1px 8px", borderRadius: 999,
            background: "rgba(251,191,36,0.12)",
          }}>{formatCurrency(conv.totalSpent)}</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
        {showTools && (
          <div style={{ marginRight: 8 }}>
            <AutoModeToggle
              convId={conv.id}
              enabled={autoMode !== false}
              onChange={onAutoModeChange}
            />
          </div>
        )}
        {showTools && (
          <button
            onClick={() => setBrainOpen(true)}
            title="Fan-Brain öffnen"
            aria-label="Fan-Brain öffnen"
            style={{
              width: 28, height: 28, borderRadius: 6,
              color: brainOpen ? "var(--accent)" : "var(--text-muted)",
              background: brainOpen ? "hsla(40,45%,55%,0.10)" : "transparent",
              display: "grid", placeItems: "center",
              transition: "all 220ms var(--easing)",
              fontSize: 15,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "hsla(40,45%,55%,0.08)"; }}
            onMouseLeave={e => { if (!brainOpen) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; } }}
          >🧠</button>
        )}
        {showTools && (
          <button
            onClick={() => setDebugOpen(true)}
            title="Copilot-Debug öffnen"
            aria-label="Copilot-Debug öffnen"
            style={{
              width: 28, height: 28, borderRadius: 6,
              color: debugOpen ? "var(--accent)" : "var(--text-muted)",
              background: debugOpen ? "hsla(40,45%,55%,0.10)" : "transparent",
              display: "grid", placeItems: "center",
              transition: "all 220ms var(--easing)",
              fontSize: 14,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "hsla(40,45%,55%,0.08)"; }}
            onMouseLeave={e => { if (!debugOpen) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; } }}
          >🐛</button>
        )}
        <button
          onClick={onToggleSearch}
          title="Suchen"
          style={{
            width: 28, height: 28, borderRadius: 6,
            color: searchActive ? "var(--accent)" : "var(--text-muted)",
            background: searchActive ? "hsla(40,45%,55%,0.10)" : "transparent",
            display: "grid", placeItems: "center",
            transition: "all 220ms var(--easing)",
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </button>
        <button
          title="Info"
          style={{
            width: 28, height: 28, borderRadius: 6,
            color: "var(--text-muted)", display: "grid", placeItems: "center",
            transition: "all 220ms var(--easing)",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "hsla(40,45%,55%,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </button>
        {showTools && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              title="Mehr"
              aria-label="Mehr Optionen"
              style={{
                width: 28, height: 28, borderRadius: 6,
                color: menuOpen ? "var(--accent)" : "var(--text-muted)",
                background: menuOpen ? "hsla(40,45%,55%,0.10)" : "transparent",
                display: "grid", placeItems: "center",
                transition: "all 220ms var(--easing)",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "hsla(40,45%,55%,0.08)"; }}
              onMouseLeave={e => { if (!menuOpen) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "transparent"; } }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0,
                  minWidth: 220, padding: 6, borderRadius: 10,
                  background: "var(--surface-1)",
                  border: "1px solid var(--hairline-accent)",
                  boxShadow: "0 12px 40px hsla(0,0%,0%,0.5)",
                  zIndex: 41,
                }}>
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      const ok = window.confirm(
                        `Chat mit ${conv.participant.displayName} komplett zurücksetzen?\n\n` +
                        `Alle Nachrichten, Drafts, Copilot-Brief, Fan-Facts und das Fan-Brain werden gelöscht.\nDas kann nicht rückgängig gemacht werden.`
                      );
                      if (!ok) return;
                      await chat.resetConversation(conv.id, conv.participant.id);
                    }}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "9px 12px", borderRadius: 7,
                      fontSize: 13, fontWeight: 500,
                      color: "hsl(0, 75%, 70%)",
                      background: "transparent",
                      display: "flex", alignItems: "center", gap: 10,
                      transition: "background 160ms var(--easing)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "hsla(0,70%,55%,0.10)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    Chat komplett zurücksetzen
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <FanBrainDrawer
        open={brainOpen}
        onClose={() => setBrainOpen(false)}
        fanId={conv.participant.id}
        displayName={conv.participant.displayName}
      />
      <CopilotDebugPanel
        open={debugOpen}
        onClose={() => setDebugOpen(false)}
        convId={conv.id}
      />
    </header>
  );
}
