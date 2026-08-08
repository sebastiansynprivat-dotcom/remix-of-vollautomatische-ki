import { formatCurrency } from "@/data/mockData";

export function SubscriptionLockOverlay({ price }: { price: number }) {
  // TODO: API-Call → POST /api/subscriptions
  const handleSubscribe = () => {};

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "grid", placeItems: "center",
      background: "hsla(0,0%,0%,0.35)", backdropFilter: "blur(2px)",
    }}>
      <div className="premium-card" style={{ padding: "16px 18px", textAlign: "center", maxWidth: 220 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "hsla(40,45%,55%,0.12)",
          border: "1px solid hsla(40,45%,55%,0.3)",
          display: "grid", placeItems: "center", margin: "0 auto 8px",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div style={{ color: "var(--text-strong)", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Exklusiver Inhalt</div>
        <div className="tabular" style={{ color: "var(--gold)", fontSize: 13, marginBottom: 10 }}>
          Ab {formatCurrency(price)} / Monat
        </div>
        <button onClick={handleSubscribe} className="gold-gradient-bg" style={{
          padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, width: "100%",
        }}>Jetzt abonnieren ✦</button>
      </div>
    </div>
  );
}
