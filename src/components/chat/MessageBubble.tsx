import { memo } from "react";
import type { Message } from "@/data/mockData";

export const MessageBubble = memo(function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start",
      padding: "0 24px",
    }}>
      <div className="bubble-in" style={{
        position: "relative",
        maxWidth: "65%",
        background: isOwn
          ? "linear-gradient(160deg, hsla(38,40%,22%,0.85), hsla(38,30%,12%,0.95))"
          : "linear-gradient(160deg, hsla(0,0%,100%,0.045), hsla(0,0%,100%,0.015))",
        border: isOwn
          ? "1px solid hsla(38,42%,58%,0.32)"
          : "1px solid hsla(0,0%,100%,0.06)",
        borderRadius: isOwn ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        padding: "10px 14px 8px",
        color: "var(--text-strong)",
        fontSize: 14, lineHeight: 1.5,
        boxShadow: isOwn
          ? "0 8px 24px hsla(38,45%,30%,0.28), inset 0 1px 0 hsla(40,60%,75%,0.12)"
          : "0 4px 14px hsla(0,0%,0%,0.28), inset 0 1px 0 hsla(0,0%,100%,0.04)",
      }}>
        {msg.content}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4,
          marginTop: 4, fontSize: 10, color: "var(--text-subtle)",
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
  const color = status === "read" ? "var(--gold)" : "var(--text-strong)";
  return (
    <svg width="14" height="12" viewBox="0 0 24 18" fill="none" stroke={color} strokeWidth="2.5">
      <path d="M1 10l4 4L13 6"/>
      <path d="M9 10l4 4L23 4"/>
    </svg>
  );
}
