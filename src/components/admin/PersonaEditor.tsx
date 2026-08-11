import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PERSONA_PRESETS,
  COMMUNICATION_STYLE_LABEL,
  APPROACH_STYLE_LABEL,
  HUMOR_TYPE_LABEL,
  type PersonaConfig,
  type CommunicationStyle,
  type ApproachStyle,
  type HumorType,
} from "@/lib/personaPresets";

/* ── Tag-Input ───────────────────────────────────────────── */

export function TagInput({
  label, values, onChange, placeholder, tone = "neutral",
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  tone?: "neutral" | "danger" | "gold";
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  const chipStyle =
    tone === "danger"
      ? { background: "hsl(0 75% 58% / 0.1)", borderColor: "hsl(0 75% 58% / 0.32)", color: "hsl(0 75% 76%)" }
      : tone === "gold"
        ? { background: "hsl(40 45% 55% / 0.1)", borderColor: "hsl(40 45% 55% / 0.32)", color: "hsl(40 45% 68%)" }
        : { background: "hsl(0 0% 100% / 0.04)", borderColor: "hsl(0 0% 100% / 0.1)", color: "hsl(0 0% 78%)" };

  return (
    <label style={{ display: "block" }}>
      <span className="kpi-label" style={{ display: "block", marginBottom: 8 }}>{label}</span>
      <div
        className="shex-input"
        style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: 8, minHeight: 44 }}
      >
        {values.map((v) => (
          <span
            key={v}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 999, fontSize: 12,
              border: "1px solid", ...chipStyle,
            }}
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              style={{ opacity: 0.6, fontSize: 13, lineHeight: 1 }}
              aria-label={`${v} entfernen`}
            >×</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
            if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={commit}
          placeholder={values.length ? "" : placeholder}
          style={{
            flex: 1, minWidth: 120, background: "transparent", border: "none",
            outline: "none", color: "hsl(0 0% 94%)", fontSize: 13.5, fontFamily: "inherit",
          }}
        />
      </div>
    </label>
  );
}

/* ── Kleine Felder ───────────────────────────────────────── */

function Text({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label style={{ display: "block" }}>
      <span className="kpi-label" style={{ display: "block", marginBottom: 8 }}>{label}</span>
      <input className="shex-input" type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Area({
  label, value, onChange, placeholder, rows = 3, right,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; right?: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span className="kpi-label">{label}</span>
        {right}
      </span>
      <textarea className="shex-textarea" rows={rows} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: Record<string, string> }) {
  return (
    <label style={{ display: "block" }}>
      <span className="kpi-label" style={{ display: "block", marginBottom: 8 }}>{label}</span>
      <select className="shex-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </label>
  );
}

/* ── Preset-Grid ─────────────────────────────────────────── */

export function PresetGrid({
  selected, onSelect,
}: { selected?: string; onSelect: (id: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
      {PERSONA_PRESETS.map((p) => {
        const active = selected === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            style={{
              textAlign: "left", padding: 16, borderRadius: 12,
              background: active ? "hsl(40 45% 55% / 0.07)" : "hsl(0 0% 100% / 0.02)",
              border: `1px solid ${active ? "hsl(40 45% 55% / 0.5)" : "hsl(0 0% 100% / 0.08)"}`,
              boxShadow: active ? "0 0 24px hsl(40 45% 55% / 0.18)" : "none",
              transition: "all 150ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 8 }}>{p.icon}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: active ? "hsl(40 45% 68%)" : "hsl(0 0% 92%)" }}>
              {p.label}
            </div>
            <div className="module-desc" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>
              {p.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Persona-Editor ──────────────────────────────────────── */

export function PersonaEditor({
  persona, onChange, modelName, emojiExtras,
}: {
  persona: PersonaConfig;
  onChange: (p: PersonaConfig) => void;
  modelName?: string;
  /** Zusatzfelder, die direkt unter dem Emoji-Set erscheinen. */
  emojiExtras?: React.ReactNode;
}) {
  const set = <K extends keyof PersonaConfig>(k: K, v: PersonaConfig[K]) =>
    onChange({ ...persona, [k]: v });

  const [preview, setPreview] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("chat-copilot", {
        body: {
          messages: [{ content: "FAN: hey" }],
          fanMeta: { displayName: "Fan" },
          modelPersona: {
            displayName: modelName || "Creatorin",
            age: persona.age,
            persona: persona.description,
            toneOfVoice: `${COMMUNICATION_STYLE_LABEL[persona.communication_style]}, ${APPROACH_STYLE_LABEL[persona.approach_style]}`,
            writingStyle: persona.voice_sample,
            personaConfig: persona,
          },
          knownFacts: {},
        },
      });
      if (error) throw error;
      const s = (data as any)?.suggestions?.[0] ?? {};
      const texts = [s.text, s.text2, s.text3].filter((t: unknown): t is string => typeof t === "string" && !!t.trim());
      if (!texts.length) throw new Error("Keine Antwort erhalten.");
      setPreview(texts);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generierung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Area
        label="Beschreibung"
        value={persona.description}
        onChange={(v) => set("description", v)}
        placeholder="Kurze Zusammenfassung der Persönlichkeit…"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Text label="Alter" type="number" value={persona.age != null ? String(persona.age) : ""}
          onChange={(v) => set("age", v ? parseInt(v, 10) || undefined : undefined)} />
        <Text label="Nationalität" value={persona.nationality ?? ""}
          onChange={(v) => set("nationality", v || undefined)} placeholder="z. B. Deutschland" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <Select<CommunicationStyle> label="Kommunikationsstil" value={persona.communication_style}
          onChange={(v) => set("communication_style", v)} options={COMMUNICATION_STYLE_LABEL} />
        <Select<ApproachStyle> label="Ansprache" value={persona.approach_style}
          onChange={(v) => set("approach_style", v)} options={APPROACH_STYLE_LABEL} />
        <Select<HumorType> label="Humor" value={persona.humor_type}
          onChange={(v) => set("humor_type", v)} options={HUMOR_TYPE_LABEL} />
      </div>

      <TagInput label="Emoji-Set" values={persona.emoji_set} onChange={(v) => set("emoji_set", v)}
        placeholder="Emoji eingeben + Enter" tone="gold" />
      <TagInput label="Signature-Phrasen" values={persona.signature_phrases}
        onChange={(v) => set("signature_phrases", v)} placeholder="Phrase + Enter" />
      <TagInput label="Verbotene Wörter" values={persona.avoid_words}
        onChange={(v) => set("avoid_words", v)} placeholder="Wort + Enter" tone="danger" />

      <Area label="Opener-Vorlage" value={persona.opener_template}
        onChange={(v) => set("opener_template", v)} rows={2}
        placeholder="Beispiel für eine erste Nachricht…" />

      <Area
        label="Voice-Sample"
        value={persona.voice_sample}
        onChange={(v) => set("voice_sample", v)}
        rows={4}
        placeholder="1–2 Beispielnachrichten im typischen Ton…"
        right={
          <button type="button" onClick={generate} disabled={busy}
            className="shex-btn shex-btn-ghost" style={{ padding: "6px 12px", fontSize: 10 }}>
            {busy ? "Generiere…" : "✦ Generieren"}
          </button>
        }
      />

      {err && (
        <div style={{
          padding: "10px 12px", borderRadius: 8, fontSize: 12,
          background: "hsl(0 75% 58% / 0.08)", border: "1px solid hsl(0 75% 58% / 0.3)", color: "hsl(0 75% 75%)",
        }}>{err}</div>
      )}

      {preview && (
        <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="kpi-label">Tonalitäts-Vorschau</span>
            <button type="button" onClick={generate} disabled={busy}
              className="shex-btn shex-btn-ghost" style={{ padding: "6px 12px", fontSize: 10 }}>
              Neu generieren
            </button>
          </div>
          <div style={{ alignSelf: "flex-start", maxWidth: "75%", padding: "9px 13px", borderRadius: 14,
            background: "hsl(0 0% 100% / 0.05)", fontSize: 13.5, color: "hsl(0 0% 80%)" }}>
            hey
          </div>
          {preview.map((t, i) => (
            <div key={i} style={{
              alignSelf: "flex-end", maxWidth: "75%", padding: "9px 13px", borderRadius: 14,
              background: "hsl(40 45% 55% / 0.12)", border: "1px solid hsl(40 45% 55% / 0.25)",
              fontSize: 13.5, color: "hsl(0 0% 92%)",
            }}>{t}</div>
          ))}
          <button type="button" onClick={() => set("voice_sample", preview.join("\n"))}
            className="shex-btn shex-btn-ghost" style={{ alignSelf: "flex-end", padding: "6px 12px", fontSize: 10 }}>
            Als Voice-Sample übernehmen
          </button>
        </div>
      )}
    </div>
  );
}
