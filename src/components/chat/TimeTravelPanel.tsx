import { useState } from "react";
import { useChat } from "@/lib/chatStore";

export function TimeTravelPanel({ convId }: { convId: string }) {
  const chat = useChat();
  const [day, setDay] = useState(1);
  const [morningTime, setMorningTime] = useState("08:30");
  const [middayTime, setMiddayTime] = useState("12:30");
  const [autoSec, setAutoSec] = useState(45);
  const [autoOn, setAutoOn] = useState(true);

  const inputStyle: React.CSSProperties = {
    padding: "4px 8px", borderRadius: 6,
    background: "hsla(0,0%,100%,0.04)",
    border: "1px solid hsla(0,0%,100%,0.08)",
    color: "var(--text-strong)", fontSize: 12,
  };

  return (
    <div style={{
      padding: "10px 24px",
      borderBottom: "1px solid hsla(0,0%,100%,0.05)",
      background: "hsla(40,55%,55%,0.04)",
      display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontSize: 12,
    }}>
      <span style={{ color: "var(--gold)", letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 600 }}>
        ⏰ Zeitreise
      </span>

      <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-subtle)" }}>
        Tag +
        <input type="number" min={0} max={30} value={day}
          onChange={e => setDay(parseInt(e.target.value) || 0)}
          style={{ ...inputStyle, width: 56 }} />
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-subtle)" }}>
        Morgen
        <input type="time" value={morningTime}
          onChange={e => setMorningTime(e.target.value)}
          style={inputStyle} />
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-subtle)" }}>
        <input type="checkbox" checked={autoOn} onChange={e => setAutoOn(e.target.checked)} />
        Mittag wenn keine Antwort nach
        <input type="number" min={5} max={3600} value={autoSec}
          onChange={e => setAutoSec(parseInt(e.target.value) || 0)}
          disabled={!autoOn}
          style={{ ...inputStyle, width: 60, opacity: autoOn ? 1 : 0.4 }} /> s
        <input type="time" value={middayTime}
          onChange={e => setMiddayTime(e.target.value)}
          disabled={!autoOn}
          style={{ ...inputStyle, opacity: autoOn ? 1 : 0.4 }} />
      </label>

      <button
        onClick={() => chat.triggerReengage(convId, {
          dayOffset: day,
          time: morningTime,
          kind: "morning",
          autoMiddayDelaySec: autoOn ? autoSec : 0,
          middayTime,
        })}
        style={{
          marginLeft: "auto",
          padding: "6px 14px", borderRadius: 6,
          background: "var(--gold)", color: "#000",
          border: "none", fontWeight: 600, cursor: "pointer", fontSize: 12,
        }}
      >
        Mia schreibt jetzt
      </button>
    </div>
  );
}
