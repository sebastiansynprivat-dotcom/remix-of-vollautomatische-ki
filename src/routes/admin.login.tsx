import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/tokens.css";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
  ssr: false,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { session, isAdmin, loading, roles } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !session) return;
    if (isAdmin) {
      navigate({ to: "/admin" });
    } else if (roles.length > 0) {
      // Eingeloggt aber kein Admin → ausloggen + Hinweis
      supabase.auth.signOut().then(() => {
        setErr("Dieser Account ist kein Admin. Bitte nutze den Chatter-Login.");
      });
    }
  }, [session, isAdmin, roles, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e: any) {
      setErr(e.message ?? "Fehler");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh", display: "grid", placeItems: "center",
      background: "radial-gradient(ellipse at top, hsla(40,45%,55%,0.12), transparent 60%), var(--surface-1)",
      color: "var(--text)", padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 400, padding: 32,
        background: "hsla(0,0%,100%,0.03)",
        border: "1px solid hsla(40,45%,55%,0.25)",
        borderRadius: 16,
        boxShadow: "0 0 60px hsla(40,45%,55%,0.05)",
      }}>
        <Link to="/" style={{ fontSize: 12, color: "var(--text-subtle)" }}>← Zurück</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
          <div className="accent-gradient-bg" style={{
            width: 28, height: 28, borderRadius: 6,
            display: "grid", placeItems: "center", fontWeight: 800, color: "#1a1a1a", fontSize: 13,
          }}>A</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--accent)", textTransform: "uppercase" }}>
            Admin-Bereich
          </div>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 8, marginBottom: 4 }}>
          Admin-Login
        </h1>
        <p style={{ color: "var(--text-subtle)", fontSize: 14, marginBottom: 24 }}>
          Nur für Administratoren. Chatter bitte den normalen Login nutzen.
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Passwort" type="password" value={password} onChange={setPassword} />
          {err && <div style={{ fontSize: 13, color: "#ef4444" }}>{err}</div>}
          <button type="submit" disabled={busy} className="accent-gradient-bg" style={{
            marginTop: 8, padding: "12px 16px", borderRadius: 10,
            color: "#1a1a1a", fontWeight: 700, fontSize: 14,
            border: "none", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1,
          }}>
            {busy ? "..." : "Als Admin einloggen"}
          </button>
        </form>

        <div style={{ borderTop: "1px solid hsla(0,0%,100%,0.06)", marginTop: 20, paddingTop: 16, textAlign: "center" }}>
          <Link to="/login" style={{ fontSize: 12, color: "var(--text-subtle)" }}>
            Kein Admin? Hier zum Chatter-Login →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-subtle)" }}>{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} required
        style={{
          padding: "10px 12px", borderRadius: 8,
          background: "hsla(0,0%,0%,0.3)",
          border: "1px solid hsla(0,0%,100%,0.1)",
          color: "var(--text)", fontSize: 14,
        }}
      />
    </label>
  );
}
