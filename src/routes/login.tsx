import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/tokens.css";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  ssr: false,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !session) return;
    if (isAdmin) {
      // Admins dürfen sich hier nicht einloggen → ausloggen + Hinweis
      supabase.auth.signOut().then(() => {
        setErr("Dieser Account ist ein Admin-Account. Bitte nutze den Admin-Login.");
      });
    } else {
      navigate({ to: "/app" });
    }
  }, [session, isAdmin, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e.message ?? "Fehler");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh", display: "grid", placeItems: "center",
      background: "radial-gradient(ellipse at top, hsla(40,45%,55%,0.08), transparent 60%), var(--surface-1)",
      color: "var(--text)", padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 400, padding: 32,
        background: "hsla(0,0%,100%,0.03)",
        border: "1px solid hsla(0,0%,100%,0.08)",
        borderRadius: 16,
      }}>
        <Link to="/" style={{ fontSize: 12, color: "var(--text-subtle)" }}>← Zurück</Link>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--text-subtle)", marginTop: 16, textTransform: "uppercase" }}>
          Chatter Login
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 4, marginBottom: 4 }}>
          {mode === "signin" ? "Willkommen zurück" : "Account erstellen"}
        </h1>
        <p style={{ color: "var(--text-subtle)", fontSize: 14, marginBottom: 24 }}>
          {mode === "signin" ? "Logge dich in deine Chat-Suite ein." : "Erstelle einen neuen Chatter-Account."}
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
            {busy ? "..." : mode === "signin" ? "Einloggen" : "Account erstellen"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          style={{
            marginTop: 16, width: "100%", padding: 8,
            background: "transparent", border: "none",
            color: "var(--text-subtle)", fontSize: 13, cursor: "pointer",
          }}
        >
          {mode === "signin" ? "Noch keinen Account? Registrieren" : "Schon dabei? Einloggen"}
        </button>

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
