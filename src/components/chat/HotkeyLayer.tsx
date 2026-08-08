import { useEffect } from "react";
import { useChatUI } from "@/lib/chatUI";

const isTypingTarget = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
};

export function HotkeyLayer() {
  const ui = useChatUI();


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // ⌘K — palette (works even in input)
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.togglePalette();
        return;
      }

      // ⌘↑ / ⌘↓ — switch conv
      if (meta && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const ids = ui.conversationIds;
        if (ids.length === 0) return;
        const cur = ui.activeId ? ids.indexOf(ui.activeId) : 0;
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const next = (cur + dir + ids.length) % ids.length;
        ui.setActiveId(ids[next]);
        return;
      }

      // ignore other shortcuts while typing
      if (isTypingTarget(e.target)) return;
      if (e.altKey) return;

      // ] — DNA panel
      if (e.key === "]") { e.preventDefault(); ui.toggleDna(); return; }
      // ? — help overlay
      if (e.key === "?") { e.preventDefault(); ui.setHelpOpen(true); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ui]);

  return ui.helpOpen ? <HelpOverlay /> : null;
}

function HelpOverlay() {
  const { setHelpOpen } = useChatUI();
  return (
    <div onClick={() => setHelpOpen(false)} style={{
      position: "fixed", inset: 0, zIndex: 250,
      display: "grid", placeItems: "center",
      background: "color-mix(in srgb, var(--background) 70%, transparent)",
      backdropFilter: "blur(8px)",
      animation: "fadeIn 160ms ease-out",
    }}>
      <div onClick={e => e.stopPropagation()} className="premium-card" style={{
        width: "min(420px, 92vw)", padding: "20px 22px", borderRadius: 14,
      }}>
        <div className="display" style={{ fontSize: 18, color: "var(--text-strong)", marginBottom: 14 }}>
          Tastenkürzel
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Row k="⌘ K" v="Command Palette öffnen" />
          <Row k="]" v="Fan-Panel ein/aus" />
          <Row k="⌘ ↑ / ↓" v="Konversation wechseln" />
          <Row k="↵" v="Senden  ·  ⇧↵ neue Zeile" />
          <Row k="?" v="Diese Hilfe" />
        </div>
        <div style={{
          marginTop: 16, paddingTop: 12,
          borderTop: "1px solid hsla(0,0%,100%,0.06)",
          fontSize: 11, color: "var(--text-subtle)", textAlign: "center",
        }}>
          ESC zum Schließen
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      fontSize: 13, color: "var(--text)",
    }}>
      <span>{v}</span>
      <kbd style={{
        fontFamily: "inherit", fontSize: 11, fontWeight: 600,
        padding: "2px 8px", borderRadius: 5,
        background: "hsla(0,0%,100%,0.05)", color: "var(--text-strong)",
        border: "1px solid hsla(0,0%,100%,0.08)",
        boxShadow: "inset 0 -1px 0 hsla(0,0%,0%,0.3)",
      }}>{k}</kbd>
    </div>
  );
}
