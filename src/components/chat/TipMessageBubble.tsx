import type { Message } from "@/data/mockData";
import { formatCurrency } from "@/data/mockData";

export function TipMessageBubble({ msg, senderName }: { msg: Message; senderName: string }) {
  const tip = msg.tip!;
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "8px 24px" }}>
      <div className="reveal" style={{
        maxWidth: 420, padding: "12px 18px", borderRadius: 14,
        background: "linear-gradient(135deg, hsla(345,35%,28%,0.45), hsla(345,30%,18%,0.25))",
        border: "1px solid var(--accent-2-line)",
        boxShadow: "0 8px 28px hsla(345,30%,15%,0.35), inset 0 1px 0 hsla(345,40%,70%,0.10)",
        position: "relative", overflow: "hidden",
        textAlign: "center",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(110deg, transparent 30%, hsla(345,55%,70%,0.18) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "accentShimmer 3s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 13, color: "var(--text)" }}>
            <span style={{ color: "hsl(345, 60%, 78%)" }}>♥ </span>
            <strong style={{ color: "var(--text-strong)" }}>{senderName}</strong> hat{" "}
            <strong className="tabular" style={{ color: "hsl(345, 65%, 78%)" }}>{formatCurrency(tip.amount, tip.currency)}</strong> Trinkgeld geschickt
          </div>
          {tip.message && (
            <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
              „{tip.message}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
