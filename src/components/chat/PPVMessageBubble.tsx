import type { Message } from "@/data/mockData";
import { formatCurrency } from "@/data/mockData";
import { useChat } from "@/lib/chatStore";

export function PPVMessageBubble({ convId, msg, isOwn }: { convId: string; msg: Message; isOwn: boolean }) {
  const ppv = msg.ppv!;
  const chat = useChat();
  const purchased = ppv.isPurchased;

  return (
    <div style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", padding: "0 24px" }}>
      <div className="premium-card reveal" style={{
        maxWidth: 360, width: "100%",
        background: "var(--surface-2)",
        borderColor: "var(--hairline)",
        borderLeft: "2px solid var(--accent)",
        overflow: "hidden",
      }}>
        <div style={{
          position: "relative", aspectRatio: "4/3",
          background: "var(--surface-3)",
          display: "grid", placeItems: "center",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "repeating-linear-gradient(45deg, hsla(0,0%,100%,0.02) 0 12px, transparent 12px 24px)",
            filter: purchased ? "none" : "blur(16px)",
            transition: "filter 480ms var(--easing)",
          }} />
          {!purchased && (
            <div style={{
              position: "relative", zIndex: 1,
              width: 56, height: 56, borderRadius: "50%",
              background: "hsla(0,0%,0%,0.5)",
              border: "1px solid var(--hairline-strong)",
              display: "grid", placeItems: "center",
              backdropFilter: "blur(8px)",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          )}
          {purchased && (
            <div style={{
              position: "absolute", top: 10, right: 10,
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(16,185,129,0.16)",
              color: "var(--status-success)", fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4,
              backdropFilter: "blur(8px)",
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>
              Gekauft
            </div>
          )}
        </div>
        {ppv.caption?.trim() && (
          <div style={{
            padding: "12px 14px 0",
            color: "var(--text-strong)", fontSize: 14, lineHeight: 1.45,
          }}>
            {ppv.caption}
          </div>
        )}
        <div style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ color: "var(--text-strong)", fontSize: 13, fontWeight: 600 }}>
              {ppv.mediaCount} {ppv.mediaType === "photo" ? "Fotos" : "Video"}
            </div>
            <div className="tabular" style={{ color: "var(--money)", fontSize: 16, fontWeight: 600, marginTop: 2 }}>
              {ppv.price === 0 ? "Kostenlos" : formatCurrency(ppv.price, ppv.currency)}
            </div>
          </div>
          {!purchased ? (
            <div style={{ display: "flex", gap: 6 }}>
              {convId === "conv-ai-mia" && (
                <button
                  onClick={() => chat.skipPPV(convId, msg.id)}
                  style={{
                    padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                    color: "var(--text-muted)", border: "1px solid hsla(0,0%,100%,0.08)",
                  }}
                >Skip</button>
              )}
              <button
                onClick={() => chat.purchasePPV(convId, msg.id)}
                className="accent-gradient-bg"
                style={{
                  padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  transition: "transform 160ms var(--easing)",
                }}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.992)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >Kaufen</button>
            </div>
          ) : (
            <button style={{
              padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              color: "var(--text-muted)", border: "1px solid hsla(0,0%,100%,0.08)",
            }}>Ansehen</button>
          )}
        </div>
      </div>
    </div>
  );
}
