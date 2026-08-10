import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Manuelle Übersteuerung pro Chat: Auto-Modus an = KI übernimmt,
 * Auto-Modus aus = ein Mensch schreibt direkt, die KI pausiert.
 */
export function AutoModeToggle({
  convId, enabled, onChange, disabled,
}: {
  convId: string;
  enabled: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setOn(enabled); }, [enabled]);

  const isDisabled = !!disabled || busy;

  const toggle = async () => {
    if (isDisabled) return;
    const next = !on;
    setOn(next);
    onChange?.(next);
    setBusy(true);
    const { error } = await supabase
      .from("conversations")
      .update({ autopilot_enabled: next })
      .eq("id", convId);
    setBusy(false);
    if (error) {
      setOn(!next);
      onChange?.(!next);
      toast.error("Auto-Modus konnte nicht geändert werden");
      return;
    }
    toast.success(next ? "Auto-Modus aktiv" : "Manuelle Steuerung aktiv");
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <span style={{
        fontSize: 11, fontWeight: 500, letterSpacing: 0,
        color: on ? "hsl(239 84% 74%)" : "hsl(43 96% 64%)",
        transition: "color 200ms cubic-bezier(0.34,1.56,0.64,1)",
        whiteSpace: "nowrap",
      }}>Auto-Modus</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Auto-Modus umschalten"
        onClick={toggle}
        disabled={isDisabled}
        style={{
          width: 36, height: 20, borderRadius: 999, padding: 2,
          position: "relative", border: "none",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.5 : 1,
          background: on
            ? "linear-gradient(90deg, hsl(239 84% 62%), hsl(272 72% 60%))"
            : "#2A2A30",
          boxShadow: "none",
          transition: "background 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: on ? 18 : 2,
          width: 16, height: 16, borderRadius: 999, background: "#fff",
          boxShadow: "0 2px 6px hsla(0,0%,0%,0.35)",
          transition: "left 200ms cubic-bezier(0.34,1.56,0.64,1)",
        }} />
      </button>
    </div>
  );
}

/** Warn-Banner unter dem Header, wenn der Auto-Modus aus ist. */
export function ManualModeBanner({ visible }: { visible: boolean }) {
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) { setMounted(true); return; }
    const t = window.setTimeout(() => setMounted(false), 200);
    return () => window.clearTimeout(t);
  }, [visible]);
  if (!mounted) return null;
  return (
    <div style={{
      margin: "6px 16px 0", padding: "8px 16px", borderRadius: 10,
      display: "flex", alignItems: "center", gap: 8,
      background: "hsla(43,96%,56%,0.10)",
      border: "1px solid hsla(43,96%,56%,0.20)",
      color: "hsl(43 96% 82%)", fontSize: 13,
      transformOrigin: "top",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(-6px)",
      transition: "opacity 200ms ease, transform 200ms ease",
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(43 96% 64%)" strokeWidth="2" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
      </svg>
      Auto-Modus ausgeschaltet — manuelle Steuerung aktiv
    </div>
  );
}
