import { useEffect, useMemo } from "react";
import { Command } from "cmdk";
import { useChatUI } from "@/lib/chatUI";
import { mockConversations, AI_CONV_ID } from "@/data/mockData";

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setActiveId, toggleDna, setHelpOpen } = useChatUI();

  const allConvs = useMemo(() => [...mockConversations], []);

  useEffect(() => {
    if (!paletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPaletteOpen]);

  if (!paletteOpen) return null;

  const close = () => setPaletteOpen(false);
  const go = (id: string) => { setActiveId(id); close(); };

  return (
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "grid", placeItems: "start center",
        paddingTop: "12vh",
        background: "color-mix(in srgb, var(--background) 65%, transparent)",
        backdropFilter: "blur(8px)",
        animation: "fadeIn 160ms ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="premium-card"
        style={{
          width: "min(640px, 92vw)",
          maxHeight: "70vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          borderRadius: 14,
          animation: "paletteIn 220ms var(--easing)",
        }}
      >
        <Command label="Command Palette" loop>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px",
            borderBottom: "1px solid hsla(0,0%,100%,0.06)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <Command.Input
              autoFocus
              placeholder="Fan, Aktion oder Befehl suchen…"
              style={{
                flex: 1, fontSize: 14, color: "var(--text-strong)",
                background: "transparent", border: "none", outline: "none",
              }}
            />
            <span style={{
              fontSize: 9.5, padding: "3px 7px", borderRadius: 5,
              background: "hsla(0,0%,100%,0.05)", color: "var(--text-subtle)", letterSpacing: 0.5,
            }}>ESC</span>
          </div>

          <Command.List style={{
            flex: 1, overflowY: "auto", padding: "8px 6px 12px",
            maxHeight: "55vh",
          }}>
            <Command.Empty style={{ padding: "24px 16px", color: "var(--text-subtle)", fontSize: 13, textAlign: "center" }}>
              Keine Treffer.
            </Command.Empty>

            <PaletteGroup heading="Aktionen">
              <PaletteItem keywords={["dna", "panel", "fan"]} shortcut="]" onSelect={() => { toggleDna(); close(); }}>
                Fan-Panel umschalten
              </PaletteItem>
              <PaletteItem keywords={["hilfe", "help", "shortcuts"]} shortcut="?" onSelect={() => { setHelpOpen(true); close(); }}>
                Tastenkürzel anzeigen
              </PaletteItem>
            </PaletteGroup>

            <PaletteGroup heading="Konversationen">
              {allConvs.map(c => (
                <PaletteItem
                  key={c.id}
                  keywords={[c.participant.displayName]}
                  onSelect={() => go(c.id)}
                  right={c.totalSpent > 0 ? `${(c.totalSpent / 100).toFixed(0)} €` : undefined}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {c.id === AI_CONV_ID && (
                      <span style={{
                        fontSize: 8.5, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                        color: "var(--accent)", background: "hsla(40,45%,55%,0.12)",
                        border: "1px solid hsla(40,45%,55%,0.35)",
                      }}>AI</span>
                    )}
                    {c.participant.displayName}
                  </span>
                </PaletteItem>
              ))}
            </PaletteGroup>
          </Command.List>
        </Command>

        <style>{`
          @keyframes paletteIn {
            from { opacity: 0; transform: translateY(-8px) scale(0.985); }
            to   { opacity: 1; transform: translateY(0)    scale(1); }
          }
          [cmdk-group-heading] {
            font-size: 9.5px; letter-spacing: 1px; text-transform: uppercase;
            color: var(--text-subtle); padding: 8px 12px 4px; font-weight: 700;
          }
          [cmdk-item] {
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            padding: 8px 12px; border-radius: 8px; margin: 0 4px;
            font-size: 13px; color: var(--text); cursor: pointer;
          }
          [cmdk-item][data-selected="true"] {
            background: hsla(40,45%,55%,0.10);
            color: var(--text-strong);
          }
        `}</style>
      </div>
    </div>
  );
}

function PaletteGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return <Command.Group heading={heading}>{children}</Command.Group>;
}

function PaletteItem({
  children, onSelect, keywords, shortcut, right,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  keywords?: string[];
  shortcut?: string;
  right?: string;
}) {
  return (
    <Command.Item onSelect={onSelect} keywords={keywords}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>{children}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {right && <span className="tabular" style={{ fontSize: 11, color: "var(--accent)" }}>{right}</span>}
        {shortcut && (
          <span style={{
            fontSize: 9.5, padding: "2px 6px", borderRadius: 5,
            color: "var(--text-subtle)",
            background: "hsla(0,0%,100%,0.04)", border: "1px solid hsla(0,0%,100%,0.06)",
          }}>{shortcut}</span>
        )}
      </span>
    </Command.Item>
  );
}
