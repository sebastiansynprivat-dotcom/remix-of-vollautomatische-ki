import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import "@/styles/tokens.css";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: [
      { title: "Premium Chat — Chrome Extension" },
      {
        name: "description",
        content:
          "KI-Vorschläge direkt im Browser. Draggable Floating-Panel, das in jedem Chat funktioniert.",
      },
      { property: "og:title", content: "Premium Copilot Chrome Extension" },
      {
        property: "og:description",
        content: "KI-Vorschläge direkt im Browser. Draggable Panel für jeden Chat.",
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
  component: ExtensionPage,
});

const GOLD = "#D4AF37";
const FONT_DISPLAY = "'Instrument Sans', system-ui, sans-serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

function ExtensionPage() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/copilot-extension.zip");
      if (!res.ok) throw new Error(`Download fehlgeschlagen (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "premium-copilot-extension.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      setError(e.message || "Fehler beim Download");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
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
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -180,
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

      {/* Nav */}
      <nav
        style={{
          width: "100%",
          maxWidth: 1152,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "28px 0",
          marginBottom: 60,
          position: "relative",
          zIndex: 10,
        }}
      >
        <Link
          to="/"
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 20,
            color: "#fff",
            textDecoration: "none",
            letterSpacing: -0.4,
          }}
        >
          Premium Chat
        </Link>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <Link
            to="/"
            style={{ color: "#a8a094", fontSize: 14, textDecoration: "none" }}
          >
            ← Zurück
          </Link>
          <Link
            to="/app"
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              background: `linear-gradient(135deg, ${GOLD}, #B8860B)`,
              color: "#0a0a0a",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            App öffnen
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          width: "100%",
          maxWidth: 1152,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 60,
          alignItems: "center",
          marginBottom: 120,
          position: "relative",
          zIndex: 1,
        }}
        className="ext-hero"
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: `${GOLD}12`,
              border: `1px solid ${GOLD}30`,
              fontSize: 12,
              fontWeight: 600,
              color: GOLD,
              marginBottom: 24,
              letterSpacing: 0.4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: GOLD,
                boxShadow: `0 0 8px ${GOLD}`,
              }}
            />
            CHROME EXTENSION · BETA
          </div>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: "clamp(36px, 5vw, 60px)",
              lineHeight: 1.05,
              letterSpacing: -1.5,
              color: "#f5f0e0",
              margin: "0 0 24px",
            }}
          >
            Dein KI-Copilot.{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${GOLD}, #f5d76e)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontStyle: "italic",
              }}
            >
              überall.
            </span>
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.65,
              color: "#a8a094",
              margin: "0 0 32px",
              maxWidth: 480,
            }}
          >
            Ein draggable Floating-Panel, das in jeder Chat-Plattform funktioniert.
            Kontext einfügen, Vorschlag bekommen, klicken zum Kopieren — fertig.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={download}
              disabled={downloading}
              style={{
                padding: "14px 28px",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${GOLD}, #B8860B)`,
                color: "#0a0a0a",
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 15,
                border: 0,
                cursor: downloading ? "wait" : "pointer",
                boxShadow: `0 8px 24px ${GOLD}30`,
                transition: "transform 200ms ease, box-shadow 200ms ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 12px 30px ${GOLD}50`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${GOLD}30`;
              }}
            >
              {downloading ? "Lädt…" : "⬇  Extension herunterladen"}
            </button>
            <span style={{ fontSize: 12, color: "#7a7367" }}>
              ZIP · Manifest V3 · Chrome / Edge / Brave
            </span>
          </div>
          {error && (
            <div style={{ marginTop: 12, color: "#e87272", fontSize: 13 }}>{error}</div>
          )}
        </div>

        {/* Mock browser with panel */}
        <MockPreview />
      </section>

      {/* Install steps */}
      <section
        style={{
          width: "100%",
          maxWidth: 1152,
          marginBottom: 120,
          position: "relative",
          zIndex: 1,
        }}
      >
        <SectionHeader overline="In 3 Schritten installiert" title="Schnellstart" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
          className="ext-steps"
        >
          <Step
            n="01"
            title="ZIP herunterladen & entpacken"
            text="Klick auf den Download-Button oben. Entpacke die .zip in einen Ordner deiner Wahl."
          />
          <Step
            n="02"
            title="chrome://extensions öffnen"
            text={'Aktiviere oben rechts den Entwicklermodus. Klicke dann auf „Entpackte Erweiterung laden".'}
          />
          <Step
            n="03"
            title="Ordner auswählen"
            text="Wähle den entpackten Ordner. Fertig — das Panel erscheint auf jeder Seite."
          />
        </div>
      </section>

      {/* Features */}
      <section
        style={{
          width: "100%",
          maxWidth: 1152,
          marginBottom: 120,
          position: "relative",
          zIndex: 1,
        }}
      >
        <SectionHeader overline="Features" title="Premium-Level Workflow" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
          className="ext-features"
        >
          <Feature
            icon="✦"
            title="Drag & Drop"
            text="Verschiebe das Panel an jede Position. Deine Anordnung wird gespeichert und beim nächsten Besuch wiederhergestellt."
          />
          <Feature
            icon="◈"
            title="1 Vorschlag, ein Klick neu"
            text="Ein präziser Vorschlag statt Auswahl-Lähmung. Passt nicht? ↻ Neu generieren — gleicher Kontext, frische Variante."
          />
          <Feature
            icon="◆"
            title="Fan Brain integriert"
            text="Persönlichkeit, Kinks, No-Gos und Notizen werden automatisch als Kontext mitgeschickt. Pro Domain gespeichert."
          />
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          width: "100%",
          maxWidth: 1152,
          padding: "40px 0 60px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 13,
          color: "#7a7367",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        © 2026 Premium Chat · Chrome Extension v1.0.0
      </footer>

      <style>{`
        @media (max-width: 880px) {
          .ext-hero { grid-template-columns: 1fr !important; }
          .ext-steps, .ext-features { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Mock browser preview with live draggable panel ─── */
function MockPreview() {
  const [pos, setPos] = useState({ x: 220, y: 60 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number; id: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || e.pointerId !== dragRef.current.id) return;
    const c = containerRef.current?.getBoundingClientRect();
    if (!c) return;
    const x = Math.max(8, Math.min(c.width - 200, e.clientX - c.left - dragRef.current.dx));
    const y = Math.max(40, Math.min(c.height - 60, e.clientY - c.top - dragRef.current.dy));
    setPos({ x, y });
  };
  const onPointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        aspectRatio: "4 / 3",
        background: "linear-gradient(180deg, #1a1a1a, #0f0f0f)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          height: 32,
          background: "#191919",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 6,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        <div
          style={{
            marginLeft: 16,
            flex: 1,
            height: 18,
            borderRadius: 4,
            background: "#0a0a0a",
            fontSize: 10,
            color: "#7a7367",
            display: "flex",
            alignItems: "center",
            padding: "0 8px",
          }}
        >
          onlyfans.com / messages
        </div>
      </div>

      {/* Fake chat lines */}
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ width: "60%", height: 12, background: "#252525", borderRadius: 6 }} />
        <div style={{ width: "45%", height: 12, background: "#252525", borderRadius: 6, alignSelf: "flex-end" }} />
        <div style={{ width: "70%", height: 12, background: "#252525", borderRadius: 6 }} />
        <div style={{ width: "35%", height: 12, background: "#252525", borderRadius: 6, alignSelf: "flex-end" }} />
      </div>

      {/* Draggable mini panel */}
      <div
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: 200,
          background: "linear-gradient(180deg, rgba(20,18,14,0.96), rgba(10,10,10,0.96))",
          border: `1px solid ${GOLD}38`,
          borderRadius: 10,
          boxShadow: dragging
            ? `0 14px 36px rgba(0,0,0,0.7), 0 0 0 1px ${GOLD}40`
            : `0 8px 24px rgba(0,0,0,0.5)`,
          transition: dragging ? "none" : "box-shadow 200ms ease",
          overflow: "hidden",
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            padding: "8px 10px",
            cursor: dragging ? "grabbing" : "grab",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: `linear-gradient(180deg, ${GOLD}10, transparent)`,
            touchAction: "none",
            userSelect: "none",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: GOLD,
              boxShadow: `0 0 6px ${GOLD}`,
            }}
          />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#f5f0e0" }}>Copilot</span>
          <span style={{ marginLeft: "auto", fontSize: 9, color: "#7a7367" }}>↕ ziehen</span>
        </div>
        <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 10,
              color: "#e8e4dd",
              background: "rgba(212,175,55,0.06)",
              border: `1px solid ${GOLD}30`,
              borderRadius: 8,
              padding: "8px 9px",
              lineHeight: 1.5,
            }}
          >
            Hey Schatz, hab heut was Besonderes für dich vorbereitet — willst du's exklusiv sehen? 😘
          </div>
          <div
            style={{
              fontSize: 9,
              color: GOLD,
              textAlign: "center",
              padding: "4px 0",
              borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
              fontWeight: 600,
            }}
          >
            ↻ Neu generieren
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ overline, title }: { overline: string; title: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 48 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 2,
          color: GOLD,
          fontWeight: 600,
          marginBottom: 10,
          textTransform: "uppercase",
        }}
      >
        {overline}
      </div>
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: "clamp(28px, 4vw, 42px)",
          fontWeight: 700,
          letterSpacing: -1,
          color: "#f5f0e0",
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 16,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        transition: "all 220ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${GOLD}30`;
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 13,
          letterSpacing: 2,
          color: GOLD,
          marginBottom: 14,
        }}
      >
        {n}
      </div>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 18,
          fontWeight: 600,
          color: "#f5f0e0",
          margin: "0 0 8px",
          letterSpacing: -0.3,
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "#a8a094", margin: 0 }}>{text}</p>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 16,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        transition: "all 220ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${GOLD}30`;
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${GOLD}14`,
          border: `1px solid ${GOLD}30`,
          display: "grid",
          placeItems: "center",
          fontSize: 20,
          color: GOLD,
          marginBottom: 18,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 18,
          fontWeight: 600,
          color: "#f5f0e0",
          margin: "0 0 8px",
          letterSpacing: -0.3,
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "#a8a094", margin: 0 }}>{text}</p>
    </div>
  );
}
