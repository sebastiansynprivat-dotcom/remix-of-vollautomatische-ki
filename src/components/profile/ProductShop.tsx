import { formatCurrency } from "@/data/mockData";

interface Product {
  id: string; title: string; price: number; currency: string;
  stock: number; category: string; isAvailable: boolean;
}

export function ProductShop({ products }: { products: Product[] }) {
  // TODO: API-Call → POST /api/orders
  const handleBuy = (_id: string) => {};

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
      {products.map(p => (
        <div key={p.id} className="premium-card hoverable" style={{
          overflow: "hidden", opacity: p.isAvailable ? 1 : 0.5,
        }}>
          <div style={{
            aspectRatio: "1", position: "relative",
            background: "linear-gradient(135deg, hsl(40,30%,18%), hsl(280,20%,12%))",
            display: "grid", placeItems: "center",
          }}>
            <div style={{ fontSize: 36 }}>📦</div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ color: "var(--text-strong)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{p.title}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="tabular" style={{ color: "var(--gold)", fontSize: 16, fontWeight: 700 }}>
                {formatCurrency(p.price, p.currency)}
              </span>
              <span className="tabular" style={{ color: "var(--text-subtle)", fontSize: 11 }}>
                {p.isAvailable ? `Noch ${p.stock} da` : "Ausverkauft"}
              </span>
            </div>
            <button onClick={() => handleBuy(p.id)} disabled={!p.isAvailable}
              className={p.isAvailable ? "gold-gradient-bg" : ""}
              style={{
                width: "100%", padding: "9px", borderRadius: 8,
                fontSize: 12, fontWeight: 700,
                background: p.isAvailable ? undefined : "hsla(0,0%,100%,0.04)",
                color: p.isAvailable ? undefined : "var(--text-subtle)",
                cursor: p.isAvailable ? "pointer" : "not-allowed",
              }}>{p.isAvailable ? "Kaufen" : "Ausverkauft"}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
