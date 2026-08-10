import type { OnlineStatus } from "@/data/mockData";


export function StatusDot({ status, size = 8 }: { status: OnlineStatus; size?: number }) {
  const color = status === "online" ? "var(--status-success)" : status === "away" ? "var(--status-warning)" : "var(--text-subtle)";
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      background: color, flexShrink: 0,
      boxShadow: status === "online" ? `0 0 0 2px var(--background), 0 0 8px ${color}` : `0 0 0 2px var(--background)`,
      animation: status === "online" ? "breathe 3s ease-in-out infinite" : undefined,
    }} />
  );
}

export function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="tabular" style={{
      background: "var(--surface-3)", color: "var(--text-strong)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10,
      fontSize: 11, fontWeight: 500,
    }}>{count}</span>
  );
}
