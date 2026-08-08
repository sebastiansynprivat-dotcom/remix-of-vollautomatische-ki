import { createFileRoute, Link } from "@tanstack/react-router";
import "@/styles/tokens.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Premium Chat — Deine KI-Chat-Suite im Browser" },
      {
        name: "description",
        content:
          "Premium Chat: Die KI-Chat-Suite für anspruchsvolle Nutzer. Direkt im Browser. Keine Installation. Sofort loslegen.",
      },
      { property: "og:title", content: "Premium Chat — Deine KI-Chat-Suite" },
      {
        property: "og:description",
        content: "Premium Chat direkt im Browser. Keine Installation. Sofort loslegen.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  component: LandingPage,
});

const GOLD = "#D4AF37";
const FONT_DISPLAY = "'Instrument Sans', system-ui, sans-serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

/* ─── Landing Page ─── */
function LandingPage() {
  return (
    <div
      className="landing-root"
      style={{
        minHeight: "100dvh",
        background: "#0a0a0a",
        color: "#e5e5e5",
        fontFamily: FONT_BODY,
        position: "relative",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 24px",
        userSelect: "text",
        WebkitUserSelect: "text",
      }}
    >
      {/* ── Ambient glows ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-180px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(1000px, 95vw)",
          height: 600,
          background: `radial-gradient(ellipse at center, ${GOLD}18, transparent 65%)`,
          filter: "blur(100px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: -160,
          right: -120,
          width: 500,
          height: 500,
          background: `radial-gradient(circle, ${GOLD}10, transparent 70%)`,
          filter: "blur(100px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "40%",
          left: -100,
          width: 350,
          height: 350,
          background: `radial-gradient(circle, #B8860B0a, transparent 70%)`,
          filter: "blur(90px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── Navigation ── */}
      <nav
        style={{
          width: "100%",
          maxWidth: 1152,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "28px 0",
          marginBottom: 80,
          position: "relative",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: -0.4,
            color: "#fff",
          }}
        >
          Premium Chat
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <NavLink to="/extension">Extension</NavLink>
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/app" highlight>
            Jetzt starten
          </NavLink>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main
        style={{
          width: "100%",
          maxWidth: 1024,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
          marginBottom: 120,
        }}
      >
        {/* Badge */}
        <span
          className="reveal"
          style={{
            padding: "6px 16px",
            borderRadius: 999,
            border: `1px solid ${GOLD}33`,
            background: `${GOLD}0d`,
            color: GOLD,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 36,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: GOLD,
              boxShadow: `0 0 10px ${GOLD}`,
            }}
          />
          Direkt im Browser · Keine Installation
        </span>

        {/* Headline */}
        <h1
          className="reveal"
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(40px, 6.5vw, 76px)",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2.5,
            color: "#fff",
            margin: 0,
            marginBottom: 28,
            animationDelay: "80ms",
            animationFillMode: "backwards",
          }}
        >
          Deine KI-Chat-Suite.
          <br />
          <span
            style={{
              background: `linear-gradient(90deg, ${GOLD}, #F5E1A4, #B8860B)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Premium. Direkt. Jetzt.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="reveal"
          style={{
            maxWidth: 580,
            fontSize: 18,
            lineHeight: 1.65,
            color: "#a3a3a3",
            marginBottom: 44,
            animationDelay: "160ms",
            animationFillMode: "backwards",
          }}
        >
          Die einzige Chat-Plattform, die wirklich auf Verkauf ausgelegt ist.
          KI-gestützte Gespräche, die deine Nutzer in echte Kunden verwandeln.
        </p>

        {/* Primary CTA */}
        <div
          className="reveal"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            marginBottom: 60,
            animationDelay: "240ms",
            animationFillMode: "backwards",
          }}
        >
          <Link
            to="/app"
            style={{
              padding: "16px 40px",
              borderRadius: 999,
              background: `linear-gradient(135deg, ${GOLD}, #B8860B)`,
              color: "#0a0a0a",
              fontFamily: FONT_DISPLAY,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              boxShadow: `0 8px 32px ${GOLD}33, 0 0 0 1px ${GOLD}40`,
              transition: "transform 220ms ease, box-shadow 220ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
              e.currentTarget.style.boxShadow = `0 12px 40px ${GOLD}44, 0 0 0 1px ${GOLD}60`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = `0 8px 32px ${GOLD}33, 0 0 0 1px ${GOLD}40`;
            }}
          >
            Kostenlos starten
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <span style={{ fontSize: 12, color: "#525252" }}>
            Keine Kreditkarte erforderlich · Sofort im Browser nutzbar
          </span>
        </div>

        {/* Trust bar */}
        <div
          className="reveal"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px 40px",
            animationDelay: "320ms",
            animationFillMode: "backwards",
          }}
        >
          <TrustItem icon="⭐⭐⭐⭐⭐" label="4.9 / 5 Bewertung" />
          <TrustItem icon="🚀" label="Tausende aktive Nutzer" />
          <TrustItem icon="🔒" label="SSL-verschlüsselt & DSGVO-konform" />
        </div>
      </main>

      {/* ── Features ── */}
      <section
        style={{
          width: "100%",
          maxWidth: 1152,
          position: "relative",
          zIndex: 10,
          marginBottom: 120,
        }}
      >
        <SectionHeading
          overline="Warum Premium Chat?"
          headline="Mehr als nur Chatten."
          subline="Wir haben die einzige Plattform gebaut, bei der jede Unterhaltung gezielt auf Conversion ausgerichtet ist."
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            width: "100%",
          }}
        >
          <FeatureCard
            title="KI-gestützter Verkauf"
            body="Unsere KI erkennt den perfekten Moment für den Verkaufs-Übergang und führt deine Nutzer sanft, aber zielstrebig zum Kauf."
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            }
            delay="0ms"
          />
          <FeatureCard
            title="Pay-per-View System"
            body="Nutzer bezahlen nur für Inhalte, die sie wirklich sehen wollen. Dein Content wird zum wertvollen Gut — nicht zur Massenware."
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            }
            delay="100ms"
          />
          <FeatureCard
            title="Cloud-Sync überall"
            body="Egal ob Laptop, Tablet oder Smartphone — deine Chats, Einstellungen und Einnahmen sind immer synchron. Keine Daten gehen verloren."
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            }
            delay="200ms"
          />
          <FeatureCard
            title="Echtzeit-Analytics"
            body="Verfolge in Echtzeit, welche Nachrichten am besten verkaufen, welche Nutzer am engagiertesten sind und wo du optimieren kannst."
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            }
            delay="300ms"
          />
          <FeatureCard
            title="Premium Nutzererlebnis"
            body="Dunkles, elegantes Design, flüssige Animationen, kein Werbe-Trubel. Deine Nutzer fühlen sich wie in einer exklusiven Lounge."
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 3.214L13 21l-2.286-6.857L5 12l5.714-3.214z"
              />
            }
            delay="400ms"
          />
          <FeatureCard
            title="Sicher & Privat"
            body="Ende-zu-Ende verschlüsselte Chats, DSGVO-konforme Datenspeicherung und volle Kontrolle über deine Inhalte und deine Kunden."
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            }
            delay="500ms"
          />
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        style={{
          width: "100%",
          maxWidth: 1024,
          position: "relative",
          zIndex: 10,
          marginBottom: 120,
        }}
      >
        <SectionHeading
          overline="So funktioniert's"
          headline="In 3 Schritten zum Erfolg."
          subline="Keine komplizierte Einrichtung. Keine technischen Kenntnisse nötig."
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 32,
          }}
        >
          <StepCard
            step="01"
            title="Account erstellen"
            body="Registriere dich in unter 30 Sekunden. Nur E-Mail und Passwort — mehr brauchst du nicht."
          />
          <StepCard
            step="02"
            title="Bot konfigurieren"
            body="Wähle deinen Stil, deine Preise und deine Inhalte. Die KI passt sich automatisch an deine Zielgruppe an."
          />
          <StepCard
            step="03"
            title="Geld verdienen"
            body="Teile deinen Link, chatte mit Nutzern und verdiente bei jedem Pay-per-View-Kauf. Auszahlung monatlich."
          />
        </div>
      </section>

      {/* ── Social Proof / Testimonials ── */}
      <section
        style={{
          width: "100%",
          maxWidth: 1152,
          position: "relative",
          zIndex: 10,
          marginBottom: 120,
        }}
      >
        <SectionHeading
          overline="Erfolgsgeschichten"
          headline="Was unsere Nutzer sagen."
          subline="Tausende Kreative und Influencer verdienen bereits mit Premium Chat."
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          <TestimonialCard
            quote="Ich habe in meinem ersten Monat über 2.000€ verdient — ohne eigene Website oder technisches Know-how. Die KI macht den Verkauf für mich."
            author="Sarah K."
            role="Content Creator"
            stars={5}
          />
          <TestimonialCard
            quote="Endlich eine Plattform, die wirklich auf Verkauf optimiert ist. Meine Conversion-Rate ist um 340% gestiegen seit ich zu Premium Chat gewechselt bin."
            author="Marcus T."
            role="Fitness Coach"
            stars={5}
          />
          <TestimonialCard
            quote="Das Design ist so elegant, meine Fans fühlen sich wie in einer VIP-Lounge. Und das PPV-System funktioniert wirklich — jeder zahlt gerne."
            author="Lena M."
            role="Lifestyle Influencer"
            stars={5}
          />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section
        style={{
          width: "100%",
          maxWidth: 700,
          position: "relative",
          zIndex: 10,
          marginBottom: 100,
          textAlign: "center",
        }}
      >
        <h2
          className="reveal"
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 700,
            color: "#fff",
            marginBottom: 20,
            lineHeight: 1.1,
          }}
        >
          Bereit, mehr zu verdienen?
        </h2>
        <p
          className="reveal"
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: "#a3a3a3",
            marginBottom: 36,
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
            animationDelay: "80ms",
            animationFillMode: "backwards",
          }}
        >
          Starte jetzt in unter einer Minute. Keine Kreditkarte. Kein Risiko. Nur Ergebnisse.
        </p>
        <div
          className="reveal"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "center",
            animationDelay: "160ms",
            animationFillMode: "backwards",
          }}
        >
          <Link
            to="/app"
            style={{
              padding: "16px 40px",
              borderRadius: 999,
              background: `linear-gradient(135deg, ${GOLD}, #B8860B)`,
              color: "#0a0a0a",
              fontFamily: FONT_DISPLAY,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              boxShadow: `0 8px 32px ${GOLD}33`,
              transition: "transform 220ms ease, box-shadow 220ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
              e.currentTarget.style.boxShadow = `0 12px 40px ${GOLD}44`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = `0 8px 32px ${GOLD}33`;
            }}
          >
            Kostenlos starten
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            to="/login"
            style={{
              padding: "16px 32px",
              borderRadius: 999,
              background: "transparent",
              border: "1px solid #333",
              color: "#e5e5e5",
              fontFamily: FONT_DISPLAY,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "border-color 220ms ease, background 220ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${GOLD}60`;
              e.currentTarget.style.background = `${GOLD}08`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#333";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Ich habe bereits einen Account
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          width: "100%",
          maxWidth: 1152,
          borderTop: "1px solid #1a1a1a",
          padding: "40px 0 32px",
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 13, color: "#525252" }}>
          © 2026 Premium Chat. Alle Rechte vorbehalten.
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          <Link
            to="/login"
            style={{ fontSize: 13, color: "#737373", textDecoration: "none", transition: "color 200ms" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#737373")}
          >
            Login
          </Link>
          <Link
            to="/app"
            style={{ fontSize: 13, color: "#737373", textDecoration: "none", transition: "color 200ms" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#737373")}
          >
            App öffnen
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-Components ─── */

function NavLink({
  to,
  children,
  highlight = false,
}: {
  to: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  if (highlight) {
    return (
      <Link
        to={to}
        style={{
          padding: "10px 22px",
          borderRadius: 999,
          background: `linear-gradient(135deg, ${GOLD}, #B8860B)`,
          color: "#0a0a0a",
          fontFamily: FONT_DISPLAY,
          fontSize: 14,
          fontWeight: 700,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          boxShadow: `0 4px 16px ${GOLD}30`,
          transition: "transform 200ms ease, box-shadow 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = `0 6px 20px ${GOLD}44`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = `0 4px 16px ${GOLD}30`;
        }}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      to={to}
      style={{ fontSize: 14, fontWeight: 500, color: "#e5e5e5", textDecoration: "none", transition: "color 200ms" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = GOLD)}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#e5e5e5")}
    >
      {children}
    </Link>
  );
}

function SectionHeading({
  overline,
  headline,
  subline,
}: {
  overline: string;
  headline: string;
  subline: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: 56,
      }}
    >
      <span
        className="reveal"
        style={{
          padding: "4px 14px",
          borderRadius: 999,
          border: `1px solid ${GOLD}30`,
          background: `${GOLD}0a`,
          color: GOLD,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          display: "inline-block",
          marginBottom: 20,
        }}
      >
        {overline}
      </span>
      <h2
        className="reveal"
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: "clamp(30px, 4.5vw, 48px)",
          fontWeight: 700,
          color: "#fff",
          margin: "0 0 14px",
          lineHeight: 1.1,
          letterSpacing: -1,
          animationDelay: "60ms",
          animationFillMode: "backwards",
        }}
      >
        {headline}
      </h2>
      <p
        className="reveal"
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: "#a3a3a3",
          maxWidth: 520,
          margin: "0 auto",
          animationDelay: "120ms",
          animationFillMode: "backwards",
        }}
      >
        {subline}
      </p>
    </div>
  );
}

function TrustItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        color: "#737373",
        fontWeight: 500,
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function FeatureCard({
  title,
  body,
  icon,
  delay,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  delay: string;
}) {
  return (
    <div
      className="reveal"
      style={{
        padding: 32,
        borderRadius: 20,
        background: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.18) 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "border-color 280ms ease, transform 280ms ease, box-shadow 280ms ease",
        animationDelay: delay,
        animationFillMode: "backwards",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${GOLD}30`;
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3), 0 0 24px ${GOLD}0a`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${GOLD}12`,
          border: `1px solid ${GOLD}18`,
          display: "grid",
          placeItems: "center",
          marginBottom: 20,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD}>
          {icon}
        </svg>
      </div>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 17,
          fontWeight: 600,
          color: "#fff",
          marginBottom: 10,
          marginTop: 0,
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 14, color: "#a3a3a3", lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  );
}

function StepCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div
      className="reveal"
      style={{
        padding: 36,
        borderRadius: 20,
        background: "linear-gradient(160deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.15) 100%)",
        border: "1px solid rgba(255,255,255,0.04)",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 280ms ease, transform 280ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${GOLD}20`;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          fontFamily: FONT_DISPLAY,
          fontSize: 120,
          fontWeight: 700,
          color: `${GOLD}06`,
          lineHeight: 1,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {step}
      </div>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD}, #B8860B)`,
          color: "#0a0a0a",
          fontFamily: FONT_DISPLAY,
          fontSize: 18,
          fontWeight: 700,
          display: "grid",
          placeItems: "center",
          margin: "0 auto 20px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {step}
      </div>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 19,
          fontWeight: 600,
          color: "#fff",
          marginBottom: 10,
          marginTop: 0,
          position: "relative",
          zIndex: 2,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 14,
          color: "#a3a3a3",
          lineHeight: 1.6,
          margin: 0,
          position: "relative",
          zIndex: 2,
        }}
      >
        {body}
      </p>
    </div>
  );
}

function TestimonialCard({
  quote,
  author,
  role,
  stars,
}: {
  quote: string;
  author: string;
  role: string;
  stars: number;
}) {
  return (
    <div
      className="reveal"
      style={{
        padding: 32,
        borderRadius: 20,
        background: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.18) 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 220,
        transition: "border-color 280ms ease, transform 280ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${GOLD}20`;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div>
        <div style={{ marginBottom: 16, fontSize: 14, letterSpacing: 2 }}>
          {Array.from({ length: stars }).map((_, i) => (
            <span key={i} style={{ color: GOLD }}>
              ★
            </span>
          ))}
        </div>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: "#d4d4d4",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          „{quote}"
        </p>
      </div>
      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD}, #B8860B)`,
            display: "grid",
            placeItems: "center",
            fontFamily: FONT_DISPLAY,
            fontSize: 13,
            fontWeight: 700,
            color: "#0a0a0a",
          }}
        >
          {author.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{author}</div>
          <div style={{ fontSize: 12, color: "#737373" }}>{role}</div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 32,
          fontWeight: 700,
          background: `linear-gradient(135deg, ${GOLD}, #F5E1A4)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 13, color: "#737373" }}>{label}</div>
    </div>
  );
}
