import { useState } from "react";
import { Avatar } from "@/components/sx/Avatar";
import { mockCurrentUser, mockPosts, mockProducts, formatCurrency } from "@/data/mockData";
import { SubscriptionLockOverlay } from "@/components/monetization/SubscriptionLockOverlay";
import { ProductShop } from "@/components/profile/ProductShop";
import { FahrplanView } from "@/components/profile/FahrplanView";

type Tab = "posts" | "shop" | "subs" | "leitfaden";

export function CreatorProfile() {
  const [tab, setTab] = useState<Tab>("posts");

  return (
    <div style={{ flex: 1, height: "100dvh", overflowY: "auto" }}>
      {/* Cover */}
      <div style={{
        height: 180, position: "relative",
        background: "linear-gradient(135deg, hsl(40,30%,18%) 0%, hsl(280,20%,12%) 60%, hsl(40,30%,15%) 100%)",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(ellipse at 30% 60%, hsla(40,45%,55%,0.25), transparent 60%)",
        }} />
      </div>

      <div style={{ padding: "0 40px", marginTop: -42, position: "relative", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, paddingTop: 0 }}>
          <Avatar id={mockCurrentUser.id} name={mockCurrentUser.displayName} size={84} ring />
          <div style={{ paddingBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ color: "var(--text-strong)", fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
                {mockCurrentUser.displayName}
              </h1>
              <span title="Verifizierter Creator" style={{
                width: 22, height: 22, borderRadius: "50%",
                background: "var(--accent)", color: "hsl(40,30%,8%)",
                display: "grid", placeItems: "center",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>
              </span>
            </div>
            <div className="tabular" style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              Chatter · {mockPosts.length} Posts
            </div>
          </div>
        </div>

        <div style={{
          display: "flex", gap: 24, marginTop: 24,
          borderBottom: "1px solid hsla(0,0%,100%,0.06)",
        }}>
          {([["posts", "Posts"], ["shop", "Shop"], ["subs", "Abos"], ["leitfaden", "Fahrplan"]] as const).map(([id, label]) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                position: "relative", padding: "12px 4px",
                fontSize: 14, fontWeight: 600,
                color: active ? "var(--text-strong)" : "var(--text-muted)",
                transition: "color 200ms var(--easing)",
              }}>
                {label}
                <span style={{
                  position: "absolute", left: 0, right: 0, bottom: -1, height: 2,
                  background: "var(--accent)", borderRadius: 2,
                  transform: `scaleX(${active ? 1 : 0.4})`, opacity: active ? 1 : 0,
                  transformOrigin: "left", transition: "all 320ms var(--easing)",
                  boxShadow: active ? "0 0 12px var(--accent)" : undefined,
                }} />
              </button>
            );
          })}
        </div>

        <div style={{ padding: "24px 0 40px" }}>
          {tab === "posts" && <PostFeed />}
          {tab === "shop" && <ProductShop products={mockProducts} />}
          {tab === "subs" && <SubsView />}
          {tab === "leitfaden" && <FahrplanView />}
        </div>
      </div>
    </div>
  );
}

function PostFeed() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
      {mockPosts.map(post => (
        <div key={post.id} className="premium-card hoverable" style={{ overflow: "hidden" }}>
          <div style={{ position: "relative", aspectRatio: "4/3", background: "linear-gradient(135deg, hsl(280,20%,15%), hsl(40,25%,12%))" }}>
            <div style={{
              position: "absolute", inset: 0,
              filter: post.visibility !== "public" ? "blur(16px)" : undefined,
              backgroundImage: "repeating-linear-gradient(45deg, hsla(0,0%,100%,0.02) 0 12px, transparent 12px 24px)",
            }} />
            {post.visibility !== "public" && <SubscriptionLockOverlay price={999} />}
          </div>
          <div style={{ padding: 12 }}>
            <div style={{ color: "var(--text-strong)", fontSize: 13, marginBottom: 8 }}>{post.caption}</div>
            <div style={{ display: "flex", gap: 12, color: "var(--text-muted)", fontSize: 12 }}>
              <span className="tabular">♥ {post.likes}</span>
              <span className="tabular">💬 {post.comments}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SubsView() {
  return (
    <div className="premium-card" style={{ padding: 24, textAlign: "center" }}>
      <div className="tabular" style={{ color: "var(--accent)", fontSize: 28, fontWeight: 700 }}>{formatCurrency(999)}</div>
      <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 14 }}>pro Monat</div>
      <button className="accent-gradient-bg" style={{ padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>Abonnieren ✦</button>
    </div>
  );
}
