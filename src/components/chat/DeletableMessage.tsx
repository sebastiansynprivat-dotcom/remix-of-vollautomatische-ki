import { useState, type ReactNode } from "react";

/**
 * Hover-Wrapper um eine Nachricht mit Lösch-Button (Auto-Pilot-Chats).
 */
export function DeletableMessage({
  onDelete, align, children,
}: { onDelete: () => void; align: "left" | "right"; children: ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
      <button
        type="button"
        aria-label="Nachricht löschen"
        title="Nachricht löschen"
        onClick={onDelete}
        style={{
          position: "absolute", top: 2,
          [align === "right" ? "right" : "left"]: 2,
          width: 24, height: 24, borderRadius: 999,
          display: "grid", placeItems: "center",
          background: "hsla(0,0%,4%,0.72)",
          border: "1px solid hsla(0,60%,60%,0.35)",
          color: "hsl(0,70%,68%)",
          opacity: hover ? 1 : 0,
          pointerEvents: hover ? "auto" : "none",
          transition: "opacity 160ms var(--easing)",
          backdropFilter: "blur(6px)",
          cursor: "pointer",
          zIndex: 4,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" /><path d="M8 6V4h8v2" />
          <path d="M6 6l1 14h10l1-14" />
        </svg>
      </button>
    </div>
  );
}
