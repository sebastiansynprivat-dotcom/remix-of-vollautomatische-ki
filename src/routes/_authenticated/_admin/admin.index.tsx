import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin/admin/")({
  component: AdminOverview,
});

type Stats = {
  models: number;
  keys: number;
  conversations: number;
  fans: number;
};

function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const [m, k, c, f] = await Promise.all([
        supabase.from("model_profiles").select("id", { count: "exact", head: true }),
        supabase.from("extension_api_keys").select("id", { count: "exact", head: true }).is("revoked_at", null),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("fans").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        models: m.count ?? 0,
        keys: k.count ?? 0,
        conversations: c.count ?? 0,
        fans: f.count ?? 0,
      });
    })();
  }, []);

  const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const date = now
    .toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    .toUpperCase();

  return (
    <div className="shex">
      {/* Top status bar */}
      <div className="shex-topbar reveal">
        <div className="shex-topbar-left">
          <span className="shex-dot shex-dot-live" />
          <span className="shex-meta">SHEX · CONTROLLING</span>
          <span className="shex-divider" />
          <span className="shex-meta-faint">{date}</span>
        </div>
        <div className="shex-topbar-right">
          <span className="shex-meta-faint">LOKALZEIT</span>
          <span className="shex-time tabular">{time}</span>
        </div>
      </div>

      {/* Masthead */}
      <header className="shex-masthead reveal-stagger">
        <div className="shex-eyebrow">
          <span className="shex-bar" />
          ÜBERSICHT &middot; N<sup>o</sup>&nbsp;01
        </div>
        <h1 className="shex-h1">
          Cockpit.<br />
          <span className="shex-h1-muted">Bestand &amp; Bewegung</span>
        </h1>
        <p className="shex-lede">
          Eine ruhige Bestandsaufnahme aller Models, Keys und Konversationen &mdash;
          tabular, gewichtet, sofort lesbar.
        </p>
      </header>

      {/* KPI grid */}
      <section className="shex-section reveal-stagger">
        <SectionLabel index="I" title="Kennzahlen" right="LIVE · aus dem Backend" />
        <div className="shex-kpi-grid">
          <KPI label="Models" value={stats?.models} hint="Aktive Profile" trend="stable" />
          <KPI label="API-Keys" value={stats?.keys} hint="Gültig & aktiv" trend="up" />
          <KPI label="Konversationen" value={stats?.conversations} hint="Insgesamt geführt" trend="up" />
          <KPI label="Fans" value={stats?.fans} hint="Im Brain hinterlegt" trend="stable" />
        </div>
      </section>

      {/* Module / Aktionen */}
      <section className="shex-section reveal-stagger">
        <SectionLabel index="II" title="Module" right="Direktzugriff" />
        <div className="shex-rows">
          <ModuleRow
            code="M-01"
            title="Models"
            desc="Persona, Stimme und Steckbrief jedes Profils kuratieren."
            to="/admin/models"
            cta="Steckbriefe öffnen"
          />
          <ModuleRow
            code="M-02"
            title="API-Keys"
            desc="Zugang für Browser-Extension und Copilot generieren oder widerrufen."
            to="/admin/api-keys"
            cta="Keys verwalten"
          />
        </div>
      </section>

      {/* Footer status */}
      <footer className="shex-footer reveal">
        <div className="shex-footer-left">
          <span className="shex-dot shex-dot-stable" />
          <span className="shex-meta">SYSTEM OPERATIONAL</span>
        </div>
        <div className="shex-footer-right shex-meta-faint">
          CLOUD &nbsp;&middot;&nbsp; AUTH &nbsp;&middot;&nbsp; COPILOT-API
        </div>
      </footer>
    </div>
  );
}

function SectionLabel({ index, title, right }: { index: string; title: string; right?: string }) {
  return (
    <div className="shex-section-head">
      <div className="shex-section-head-left">
        <span className="shex-section-index">{index}</span>
        <span className="shex-section-title">{title}</span>
      </div>
      {right && <span className="shex-meta-faint">{right}</span>}
    </div>
  );
}

function KPI({
  label, value, hint, trend,
}: { label: string; value: number | undefined; hint: string; trend: "up" | "down" | "stable" }) {
  const loading = value === undefined;
  return (
    <div className="premium-stat">
      <div className="premium-stat-head">
        <span className="kpi-label">{label}</span>
        <span className={`trend trend-${trend}`}>
          {trend === "up" && "▲"}{trend === "down" && "▼"}{trend === "stable" && "■"}
        </span>
      </div>
      <div className={`kpi-xl tabular ${loading ? "shimmer-text" : ""}`}>
        {loading ? "—" : value.toLocaleString("de-DE")}
      </div>
      <div className="premium-stat-rule" />
      <div className="kpi-hint">{hint}</div>
    </div>
  );
}

function ModuleRow({
  code, title, desc, to, cta,
}: { code: string; title: string; desc: string; to: string; cta: string }) {
  return (
    <Link to={to} className="module-row">
      <span className="module-accent" />
      <div className="module-code tabular">{code}</div>
      <div className="module-body">
        <div className="module-title">{title}</div>
        <div className="module-desc">{desc}</div>
      </div>
      <div className="module-cta">
        <span>{cta}</span>
        <span className="module-arrow">→</span>
        <span className="module-underline" />
      </div>
    </Link>
  );
}

