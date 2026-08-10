import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PresetGrid, PersonaEditor } from "@/components/admin/PersonaEditor";
import {
  DEFAULT_PERSONA, presetById, type PersonaConfig,
} from "@/lib/personaPresets";

/**
 * Premium-Onboarding: Profil anlegen inkl. Persona-Preset.
 * Schreibt `persona_config` und spiegelt die wichtigsten Werte in die
 * bestehenden Freitext-Spalten, damit der Copilot ohne Migration weiterläuft.
 */
export function ModelCreateModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (id: string) => void }) {
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [subscribers, setSubscribers] = useState("0");
  const [presetId, setPresetId] = useState<string | undefined>();
  const [persona, setPersona] = useState<PersonaConfig>(DEFAULT_PERSONA);
  const [advanced, setAdvanced] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyPreset = (id: string) => {
    setPresetId(id);
    const p = presetById(id);
    if (p) setPersona({ ...p.persona });
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true); setErr(null);
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    const { error } = await supabase.storage.from("model-avatars").upload(path, file, { upsert: true });
    if (error) { setErr(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("model-avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !handle.trim()) { setErr("Anzeigename und Handle sind Pflicht."); return; }
    setBusy(true); setErr(null);
    const { data, error } = await supabase
      .from("model_profiles")
      .insert({
        display_name: displayName.trim(),
        handle: handle.trim().replace(/^@/, ""),
        avatar_url: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        subscribers: parseInt(subscribers, 10) || 0,
        persona_config: { ...persona, preset_id: presetId } as never,
        persona: persona.description || null,
        age: persona.age ?? null,
        emojis: persona.emoji_set,
        signature_phrases: persona.signature_phrases,
        taboo_words: persona.avoid_words,
        openers: persona.opener_template ? [persona.opener_template] : [],
      })
      .select("id").single();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onCreated(data.id);
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} className="shex-modal-backdrop">
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="shex-modal"
        style={{ maxWidth: 900, width: "min(900px, 94vw)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ marginBottom: 22 }}>
          <div className="shex-eyebrow" style={{ marginBottom: 14 }}>
            <span className="shex-bar" />
            PROFIL ANLEGEN
          </div>
          <h2 className="shex-h1" style={{ fontSize: 34, margin: 0 }}>Neues Profil.</h2>
        </div>

        {/* Profil */}
        <Section index="I" title="Profil">
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start" }}>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) uploadAvatar(f);
              }}
              onClick={() => fileRef.current?.click()}
              style={{
                width: 108, height: 108, borderRadius: "50%", cursor: "pointer",
                border: "1px dashed hsl(0 0% 100% / 0.16)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase",
                color: "hsl(0 0% 45%)", textAlign: "center", padding: 10,
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                backgroundSize: "cover", backgroundPosition: "center",
              }}
            >
              {!avatarUrl && (uploading ? "Lädt…" : "Avatar ziehen")}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Text label="Anzeigename *" value={displayName} onChange={setDisplayName} placeholder="z. B. Mia" />
              <Text label="Handle * (ohne @)" value={handle} onChange={setHandle} placeholder="mia_official" />
            </div>
          </div>
        </Section>

        {/* Kommunikation */}
        <Section index="II" title="Kommunikation">
          <PresetGrid selected={presetId} onSelect={applyPreset} />
          <div style={{ marginTop: 20 }}>
            <PersonaEditor persona={persona} onChange={setPersona} modelName={displayName} />
          </div>
        </Section>

        {/* Erweitert */}
        <Section index="III" title="Erweitert">
          <button type="button" onClick={() => setAdvanced((v) => !v)}
            className="shex-btn shex-btn-ghost" style={{ marginBottom: advanced ? 14 : 0 }}>
            {advanced ? "− Ausblenden" : "+ Weitere Felder"}
          </button>
          {advanced && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Text label="Bio" value={bio} onChange={setBio} placeholder="Kurzbeschreibung…" />
              <Text label="Subscriber" type="number" value={subscribers} onChange={setSubscribers} />
              <div className="module-desc">
                Antwort-Tempo, Nachrichtenlänge und Verkaufstempo lassen sich nach dem Anlegen
                im Tab „Chat-Verhalten" feinjustieren.
              </div>
            </div>
          )}
        </Section>

        {err && (
          <div style={{
            marginTop: 14, padding: "10px 12px", borderRadius: 8, fontSize: 12,
            background: "hsl(0 75% 58% / 0.08)", border: "1px solid hsl(0 75% 58% / 0.3)", color: "hsl(0 75% 75%)",
          }}>{err}</div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
          <button type="button" onClick={onClose} className="shex-btn shex-btn-ghost" style={{ flex: 1 }}>
            Abbrechen
          </button>
          <button type="submit" disabled={busy} className="shex-btn shex-btn-primary" style={{ flex: 1 }}>
            {busy ? "Lege an…" : "Profil erstellen"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ index, title, children }: { index: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div className="shex-section-head" style={{ marginBottom: 16 }}>
        <div className="shex-section-head-left">
          <span className="shex-section-index">{index}</span>
          <span className="shex-section-title">{title}</span>
        </div>
      </div>
      {children}
    </section>
  );
}

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
