import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminLayout,
  ssr: false,
});

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

function AdminLayout() {
  const { isAdmin, loading, signOut, user } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/admin/login" });
  }, [isAdmin, loading, navigate]);

  if (loading || !isAdmin) {
    return (
      <div style={{
        minHeight: "100dvh", display: "grid", placeItems: "center",
        background: "#1c1822", color: "rgba(255,255,255,0.55)",
      }}>
        Prüfe Berechtigungen…
      </div>
    );
  }

  const links = [
    { to: "/admin", label: "Übersicht", exact: true, icon: "◇" },
    { to: "/admin/models", label: "Models", icon: "◈" },
    { to: "/admin/api-keys", label: "API-Keys", icon: "⬡" },
  ];

  return (
    <div style={{
      minHeight: "100dvh",
      color: "rgba(255,255,255,0.92)",
      background: "#1c1822",
      position: "relative",
      isolation: "isolate",
    }}>
      {/* Atmospheric background */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: -2,
        background:
          "radial-gradient(65% 55% at 15% 10%, rgba(212,175,80,0.32) 0%, rgba(212,175,80,0) 62%)," +
          "radial-gradient(60% 55% at 92% 92%, rgba(140,40,70,0.34) 0%, rgba(140,40,70,0) 66%)," +
          "radial-gradient(50% 45% at 80% 20%, rgba(110,60,180,0.20) 0%, rgba(110,60,180,0) 70%)," +
          "linear-gradient(180deg, #1c1822 0%, #25202d 100%)",
      }} />
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: -1,
        backgroundImage: NOISE, opacity: 0.5, mixBlendMode: "overlay",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", minHeight: "100dvh", padding: 16, gap: 16 }}>
        {/* Floating glass sidebar */}
        <aside style={{
          width: 248, flexShrink: 0,
          borderRadius: 22,
          padding: "22px 14px",
          display: "flex", flexDirection: "column", gap: 6,
          background: "linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 30px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(212,175,80,0.06)",
          backdropFilter: "blur(28px) saturate(160%)",
          position: "sticky", top: 16, alignSelf: "flex-start",
          height: "calc(100dvh - 32px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 8px 20px" }}>
            <div className="gold-gradient-bg" style={{
              width: 42, height: 42, borderRadius: 14,
              display: "grid", placeItems: "center", fontWeight: 800, color: "#1a1208",
              boxShadow: "0 10px 28px rgba(212,175,80,0.4), inset 0 1px 0 rgba(255,255,255,0.55)",
              fontFamily: "'Instrument Serif', serif", fontSize: 22,
            }}>P</div>
            <div>
              <div className="font-display" style={{ fontSize: 18, letterSpacing: -0.2, lineHeight: 1 }}>
                Premium<span style={{ color: "#f6d36a" }}>.</span>
              </div>
              <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1.8, marginTop: 4 }}>Admin Cockpit</div>
            </div>
          </div>

          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)", margin: "0 4px 12px" }} />

          {links.map((l) => {
            const active = l.exact ? path === l.to : path.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                style={{
                  position: "relative",
                  padding: "11px 14px 11px 16px",
                  borderRadius: 12,
                  fontSize: 13, fontWeight: 600,
                  color: active ? "rgba(255,232,170,1)" : "rgba(255,255,255,0.62)",
                  background: active
                    ? "linear-gradient(135deg, rgba(212,175,80,0.18), rgba(212,175,80,0.04))"
                    : "transparent",
                  border: active
                    ? "1px solid rgba(212,175,80,0.28)"
                    : "1px solid transparent",
                  boxShadow: active
                    ? "inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px rgba(212,175,80,0.12)"
                    : "none",
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "all 200ms ease",
                  textDecoration: "none",
                }}
              >
                {active && (
                  <span aria-hidden style={{
                    position: "absolute", left: 4, top: 8, bottom: 8, width: 3,
                    borderRadius: 3,
                    background: "linear-gradient(180deg, #f6d36a, #b8893a)",
                    boxShadow: "0 0 12px rgba(246,211,106,0.6)",
                  }} />
                )}
                <span style={{ fontSize: 14, opacity: 0.85 }}>{l.icon}</span>
                <span>{l.label}</span>
              </Link>
            );
          })}

          <div style={{ flex: 1 }} />

          <Link to="/app" style={{
            padding: "10px 14px", borderRadius: 12, fontSize: 12,
            color: "rgba(255,255,255,0.62)",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            textAlign: "center", textDecoration: "none",
            backdropFilter: "blur(8px)",
          }}>
            → Zur Chat-App
          </Link>

          <div style={{
            marginTop: 10,
            padding: 12, borderRadius: 14,
            background: "linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))",
            border: "1px solid rgba(255,255,255,0.07)",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(212,175,80,0.5), rgba(140,40,70,0.5))",
                display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
              }}>{(user?.email ?? "?")[0]?.toUpperCase()}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>Eingeloggt als</div>
                <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.email}
                </div>
              </div>
            </div>
            <button onClick={() => signOut()} style={{
              padding: "7px 10px", borderRadius: 9, fontSize: 11.5, fontWeight: 600,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.65)", cursor: "pointer",
            }}>
              Abmelden
            </button>
          </div>
        </aside>

        <main style={{
          flex: 1, minWidth: 0,
          padding: "8px 16px 40px",
          maxWidth: 1280, margin: "0 auto", width: "100%",
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
