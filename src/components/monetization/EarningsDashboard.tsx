import { mockEarnings, formatCurrency } from "@/data/mockData";

const typeLabel: Record<string, string> = {
  subscription: "Abo", tip: "Tip", ppv: "PPV", product: "Shop",
};

const typeColor: Record<string, string> = {
  subscription: "var(--accent)", tip: "var(--accent)",
  ppv: "var(--accent-dark)", product: "var(--text-muted)",
};

export function EarningsDashboard() {
  const e = mockEarnings;

  return (
    <div style={{ flex: 1, height: "100dvh", overflowY: "auto", padding: "32px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <h1 style={{ color: "var(--text-strong)", fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Einnahmen</h1>
        <button className="accent-gradient-bg" disabled={e.balance <= 0} style={{
          padding: "11px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700,
          opacity: e.balance > 0 ? 1 : 0.5,
        }}>Auszahlen ✦</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KpiTile label="Verfügbar" value={formatCurrency(e.balance)} highlight />
        <KpiTile label="Ausstehend" value={formatCurrency(e.pendingBalance)} />
        <KpiTile label="Diesen Monat" value={formatCurrency(e.monthlyTotal)} />
        <KpiTile label="Abonnenten" value="342" />
      </div>

      <div className="premium-card" style={{ padding: 4 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsla(0,0%,100%,0.05)" }}>
          <h2 style={{ color: "var(--text-strong)", fontSize: 14, fontWeight: 600 }}>Transaktionen</h2>
        </div>
        <ul>
          {e.transactions.map(tx => (
            <li key={tx.id} style={{
              display: "grid", gridTemplateColumns: "60px 1fr auto auto", alignItems: "center", gap: 16,
              padding: "14px 20px", borderTop: "1px solid hsla(0,0%,100%,0.04)",
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6,
                color: typeColor[tx.type], padding: "3px 8px", borderRadius: 6,
                background: `color-mix(in srgb, ${typeColor[tx.type]} 12%, transparent)`,
                textAlign: "center",
              }}>{typeLabel[tx.type]}</span>
              <span style={{ color: "var(--text)", fontSize: 13 }}>{tx.description}</span>
              <span className="tabular" style={{ color: "var(--status-success)", fontSize: 14, fontWeight: 600 }}>
                +{formatCurrency(tx.amount)}
              </span>
              <span className="tabular" style={{ color: "var(--text-subtle)", fontSize: 11 }}>
                {new Date(tx.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KpiTile({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="premium-card" style={{ padding: 18 }}>
      <div style={{
        fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8,
        color: "var(--text-subtle)", fontWeight: 600, marginBottom: 8,
      }}>{label}</div>
      <div className="tabular" style={{
        color: highlight ? "var(--accent)" : "var(--text-strong)",
        fontSize: "clamp(1.75rem, 2vw + 1rem, 2.5rem)",
        fontWeight: 700, letterSpacing: -1, lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}
