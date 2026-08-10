import { memo } from "react";
import type { Message } from "@/data/mockData";

export const MessageBubble = memo(function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start",
      padding: "0 16px",
    }}>
      <div className="bubble-in" style={{
        position: "relative",
        maxWidth: "70%",
        background: isOwn ? "var(--surface-2)" : "var(--surface-1)",
        border: "1px solid var(--hairline)",
        borderRadius: isOwn ? "8px 8px 2px 8px" : "8px 8px 8px 2px",
        padding: 12,
        color: "var(--text-strong)",
        fontSize: 13, lineHeight: 1.55,
        boxShadow: "none",
      }}>
        {msg.content}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4,
          marginTop: 6, fontSize: 11, color: "var(--text-subtle)",
        }}>
          <span className="tabular">
            {new Date(msg.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}
          </span>
          {isOwn && <ReadStatus status={msg.status} />}
        </div>
      </div>
    </div>
  );
});

function ReadStatus({ status }: { status: Message["status"] }) {
  if (status === "sent") {
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg>;
  }
  const color = status === "read" ? "var(--accent)" : "var(--text-strong)";
  return (
    <svg width="14" height="12" viewBox="0 0 24 18" fill="none" stroke={color} strokeWidth="2.5">
      <path d="M1 10l4 4L13 6"/>
      <path d="M9 10l4 4L23 4"/>
    </svg>
  );
}
