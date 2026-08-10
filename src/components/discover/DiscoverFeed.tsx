import { mockTopCreators, formatCurrency } from "@/data/mockData";
import { Avatar } from "@/components/sx/Avatar";

export function DiscoverFeed() {
  const top = mockTopCreators.slice(0, 3);
  const all = mockTopCreators;

  return (
    <div style={{ flex: 1, height: "100dvh", overflowY: "auto", padding: "32px 40px" }}>
      <h1 style={{ color: "var(--text-strong)", fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginBottom: 20 }}>
        Entdecken
      </h1>

      <h2 style={{ color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>
        Top Creator der Woche
      </h2>
      <div style={{
        display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16,
        scrollSnapType: "x mandatory", marginBottom: 32,
      }}>
        {top.map((c, i) => (
          <div key={c.id} style={{ minWidth: 280, scrollSnapAlign: "start" }}>
            <CreatorCard creator={c} crown={i === 0} />
          </div>
        ))}
      </div>

      <h2 style={{ color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>
        Alle Creator
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {all.map(c => <CreatorCard key={c.id} creator={c} />)}
      </div>
    </div>
  );
}

function CreatorCard({ creator, crown = false }: { creator: typeof mockTopCreators[number]; crown?: boolean }) {
  return (
    <div className="premium-card hoverable" style={{
      padding: 18, textAlign: "center",
      borderColor: crown ? "hsla(40,45%,55%,0.4)" : undefined,
      boxShadow: crown ? "0 0 32px hsla(40,45%,55%,0.18), inset 0 1px 0 hsla(0,0%,100%,0.08)" : undefined,
    }}>
      {crown && (
        <div style={{ color: "var(--accent)", fontSize: 18, marginBottom: 8 }}>👑</div>
      )}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <Avatar id={creator.id} name={creator.displayName} size={64} ring={creator.verified} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ color: "var(--text-strong)", fontSize: 15, fontWeight: 600 }}>{creator.displayName}</span>
        {creator.verified && (
          <span style={{
            width: 14, height: 14, borderRadius: "50%",
            background: "var(--accent)", color: "hsl(40,30%,8%)",
            display: "grid", placeItems: "center",
          }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 12l5 5L20 7"/></svg>
          </span>
        )}
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4 }}>{creator.category}</div>
      <div className="tabular" style={{ color: "var(--text-subtle)", fontSize: 11, marginBottom: 12 }}>
        {creator.subscriberCount.toLocaleString("de-DE")} Abonnenten
      </div>
      <div className="tabular" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
        Ab {formatCurrency(creator.price)} / Monat
      </div>
      <button className="accent-gradient-bg" style={{
        width: "100%", padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 700,
      }}>Abonnieren ✦</button>
    </div>
  );
}
