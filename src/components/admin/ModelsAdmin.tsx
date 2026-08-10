import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModelSetsManager } from "@/components/admin/ModelSetsManager";
import { ModelCreateModal } from "@/components/admin/ModelCreateModal";
import { PersonaEditor, PresetGrid } from "@/components/admin/PersonaEditor";
import { StepConfigEditor } from "@/components/admin/StepConfigEditor";
import { LimitsEditor } from "@/components/admin/LimitsEditor";
import { resolveLimits, shieldState, SHIELD_COLOR, type ProfileLimits } from "@/lib/profileLimits";
import type { FunnelStageConfig } from "@/lib/funnelConfig";
import { DEFAULT_PERSONA, presetById, resolvePersonaConfig, type PersonaConfig } from "@/lib/personaPresets";
import {
  type ChatBehavior, type EmojiFrequency, type MessageLength, type SalesTempo,
  DEFAULT_CHAT_BEHAVIOR, resolveChatBehavior, resolveEmojiFrequency,
  buildStyleBlock, extractStyleFields,
  EMOJI_FREQ_LABEL, LENGTH_LABEL, SALES_TEMPO_LABEL,
} from "@/lib/modelBehavior";

/**
 * Model-Admin direkt in /app: Liste + Editor ohne Router-Umweg.
 * Reine UI-Schicht — Logik/Felder identisch zum Admin-Bereich.
 */
export function ModelsAdmin() {
  const [editId, setEditId] = useState<string | null>(null);
  return editId
    ? <ModelEditorInline id={editId} onBack={() => setEditId(null)} />
    : <ModelsListInline onEdit={setEditId} />;
}

type Model = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  subscribers: number;
  limits: unknown;
};

function ModelsListInline({ onEdit }: { onEdit: (id: string) => void }) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [autoCounts, setAutoCounts] = useState<Record<string, { auto: number; manual: number }>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("model_profiles")
      .select("id,display_name,handle,avatar_url,subscribers,limits")
      .order("created_at", { ascending: false });
    setModels(data ?? []);
    setLoading(false);

    const { data: convs } = await supabase
      .from("conversations")
      .select("model_id, autopilot_enabled");
    const counts: Record<string, { auto: number; manual: number }> = {};
    for (const c of convs ?? []) {
      const key = String((c as { model_id: string }).model_id);
      counts[key] ??= { auto: 0, manual: 0 };
      if ((c as { autopilot_enabled: boolean | null }).autopilot_enabled === false) counts[key].manual++;
      else counts[key].auto++;
    }
    setAutoCounts(counts);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Model „${name}" wirklich löschen?`)) return;
    const { error } = await supabase.from("model_profiles").delete().eq("id", id);
    if (error) alert(error.message);
    else load();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((m) =>
      !q || m.display_name.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q));
  }, [models, query]);

  return (
    <div className="shex">
      <header className="shex-masthead reveal-stagger">
        <div className="shex-eyebrow">
          <span className="shex-bar" />
          MODELS &middot; PERSONAS
        </div>
        <h1 className="shex-h1">
          Models.<br />
          <span className="shex-h1-muted">Persona &amp; Chat-Verhalten</span>
        </h1>
        <p className="shex-lede">
          Steckbrief, Antwort-Tempo, Emojis und Verkaufstempo pro Profil — greift direkt im Auto-Chat.
        </p>
      </header>

      <section className="shex-section reveal-stagger">
        <div className="shex-section-head">
          <div className="shex-section-head-left">
            <span className="shex-section-index">I</span>
            <span className="shex-section-title">Verzeichnis</span>
          </div>
          <span className="shex-meta-faint tabular">
            {loading ? "—" : `${filtered.length} / ${models.length} Profile`}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche nach Name oder Handle…"
            className="shex-input"
            style={{ flex: 1, minWidth: 240 }}
          />
          <button onClick={() => setShowCreate(true)} className="shex-btn shex-btn-primary">
            + Neues Model
          </button>
        </div>

        {loading ? (
          <div className="shex-rows">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shex-skeleton" style={{ height: 72, marginBottom: 1 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="premium-card" style={{ textAlign: "center", padding: "56px 28px" }}>
            <div className="kpi-label" style={{ marginBottom: 12 }}>
              {query ? "Keine Treffer" : "Verzeichnis leer"}
            </div>
            <div className="module-desc" style={{ margin: "0 auto 24px", maxWidth: 380 }}>
              {query ? "Filter anpassen oder direkt ein neues Profil anlegen."
                : "Lege das erste Profil an und starte die Persona-Pflege."}
            </div>
            <button onClick={() => setShowCreate(true)} className="shex-btn shex-btn-primary">
              + Neues Model
            </button>
          </div>
        ) : (
          <div className="shex-rows">
            {filtered.map((m, i) => (
              <div key={m.id} className="module-row" style={{ gridTemplateColumns: "72px 36px 1fr auto" }}>
                <span className="module-accent" />
                <div className="module-code tabular">{`M-${String(i + 1).padStart(3, "0")}`}</div>
                <div className="shex-avatar" style={{
                  backgroundImage: m.avatar_url ? `url(${m.avatar_url})` : undefined,
                  backgroundSize: "cover", backgroundPosition: "center",
                }}>
                  {!m.avatar_url && (m.display_name[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <button onClick={() => onEdit(m.id)} className="module-title" style={{ display: "block", textAlign: "left" }}>
                    {m.display_name || "Unbenannt"}
                  </button>
                  <div className="module-desc" style={{ marginTop: 4 }}>
                    @{m.handle} &middot; <span className="tabular">{(m.subscribers ?? 0).toLocaleString("de-DE")}</span> Subscriber
                  </div>
                  <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600 }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 999,
                      background: "hsla(239,84%,62%,0.12)",
                      border: "1px solid hsla(239,84%,62%,0.28)",
                      color: "hsl(239 84% 76%)",
                    }}>{autoCounts[m.id]?.auto ?? 0} auto</span>
                    <span style={{
                      padding: "2px 8px", borderRadius: 999,
                      background: (autoCounts[m.id]?.manual ?? 0) > 0 ? "hsla(43,96%,56%,0.12)" : "hsla(0,0%,100%,0.04)",
                      border: (autoCounts[m.id]?.manual ?? 0) > 0 ? "1px solid hsla(43,96%,56%,0.28)" : "1px solid hsla(0,0%,100%,0.08)",
                      color: (autoCounts[m.id]?.manual ?? 0) > 0 ? "hsl(43 96% 70%)" : "var(--text-subtle)",
                    }}>{autoCounts[m.id]?.manual ?? 0} manuell</span>
                  </div>
                </div>
                <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => onEdit(m.id)} className="shex-btn shex-btn-ghost">Bearbeiten</button>
                  <button onClick={() => remove(m.id, m.display_name)} className="shex-btn shex-btn-danger" title="Löschen" style={{ padding: "10px 12px" }}>×</button>
                </div>
                <span className="module-underline" />
              </div>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <ModelCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(id: string) => { setShowCreate(false); onEdit(id); }}
        />
      )}
    </div>
  );
}




type Tab = "basis" | "kommunikation" | "persona" | "personal" | "chat" | "stufen" | "schutz" | "sets";

function ModelEditorInline({ id, onBack }: { id: string; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("basis");
  const [m, setM] = useState<any>(null);
  const [initial, setInitial] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("model_profiles").select("*").eq("id", id).single();
      if (error) { alert(error.message); return; }
      setM(data);
      setInitial(data);
    })();
  }, [id]);

  const dirty = useMemo(() => {
    if (!m || !initial) return false;
    return JSON.stringify(m) !== JSON.stringify(initial);
  }, [m, initial]);

  if (!m) {
    return (
      <div className="shex">
        <div style={{ padding: "80px 20px", textAlign: "center", color: "hsl(0 0% 50%)", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Lade Profil…
        </div>
      </div>
    );
  }

  const set = (k: string, v: any) => setM({ ...m, [k]: v });

  const save = async () => {
    setSaving(true);
    const { id: _id, created_at: _c, updated_at: _u, created_by: _b, ...rest } = m;
    const { error } = await supabase.from("model_profiles").update(rest).eq("id", id);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setInitial(m);
    setSavedAt(new Date().toLocaleTimeString("de-DE"));
  };

  const remove = async () => {
    if (!confirm(`Model „${m.display_name}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return;
    const { error } = await supabase.from("model_profiles").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    onBack();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "basis", label: "Basis" },
    { id: "kommunikation", label: "Kommunikation" },
    { id: "persona", label: "Persona (Freitext)" },
    { id: "personal", label: "Persönlich" },
    { id: "chat", label: "Chat-Verhalten" },
    { id: "stufen", label: "Stufen" },
    { id: "schutz", label: "Schutz" },
    { id: "sets", label: "PPV Sets" },
  ];

  return (
    <div className="shex" style={{ paddingBottom: 120 }}>
      <button onClick={onBack} style={{
        fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase",
        fontWeight: 600, color: "hsl(0 0% 50%)",
        display: "inline-flex", alignItems: "center", gap: 8, paddingTop: 8,
      }}>
        ← Zur Liste
      </button>

      <header className="reveal-stagger" style={{ padding: "32px 0 36px" }}>
        <div className="shex-eyebrow" style={{ marginBottom: 22 }}>
          <span className="shex-bar" />
          MODEL &middot; STECKBRIEF
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <div className="shex-avatar shex-avatar-lg" style={{
            width: 72, height: 72, fontSize: 24,
            backgroundImage: m.avatar_url ? `url(${m.avatar_url})` : undefined,
            backgroundSize: "cover", backgroundPosition: "center",
          }}>
            {!m.avatar_url && (m.display_name?.[0] ?? "?").toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 className="shex-h1" style={{ margin: 0, fontSize: "clamp(32px, 3vw + 10px, 48px)" }}>
              {m.display_name || "Unbenannt"}
            </h1>
            <div style={{ marginTop: 10, display: "inline-flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
              <span className="kpi-label" style={{ color: "hsl(40 45% 60%)" }}>@{m.handle}</span>
              <span style={{ width: 1, height: 10, background: "hsl(0 0% 100% / 0.12)" }} />
              <span className="kpi-label">
                <span className="tabular" style={{ color: "hsl(0 0% 92%)", fontSize: 13, fontWeight: 500, letterSpacing: 0 }}>
                  {(m.subscribers ?? 0).toLocaleString("de-DE")}
                </span>{" "}
                Subscriber
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="shex-tabs reveal-stagger">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`shex-tab ${tab === t.id ? "shex-tab-active" : ""}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 760 }} className="reveal-stagger">
        {tab === "basis" && (
          <Panel title="Basisdaten">
            <Field label="Anzeigename" value={m.display_name} onChange={(v) => set("display_name", v)} />
            <Field label="Handle (ohne @)" value={m.handle} onChange={(v) => set("handle", v)} />
            <Field label="Avatar URL" value={m.avatar_url ?? ""} onChange={(v) => set("avatar_url", v)} />
            <Field label="Bio" value={m.bio ?? ""} onChange={(v) => set("bio", v)} multiline />
            <Field label="Subscriber" type="number" value={String(m.subscribers)} onChange={(v) => set("subscribers", parseInt(v) || 0)} />
          </Panel>
        )}

        {tab === "kommunikation" && (
          <Panel title="Kommunikationsstil">
            <PresetGrid
              selected={resolvePersonaConfig(m.persona_config)?.preset_id}
              onSelect={(pid: string) => {
                const preset = presetById(pid);
                if (preset) set("persona_config", { ...preset.persona });
              }}
            />
            <div style={{ marginTop: 18 }}>
              <PersonaEditor
                persona={resolvePersonaConfig(m.persona_config) ?? DEFAULT_PERSONA}
                modelName={m.display_name}
                onChange={(p: PersonaConfig) => set("persona_config", p)}
              />
            </div>
          </Panel>
        )}

        {tab === "persona" && (
          <Panel title="Persona & Stil">
            <Field label="Persona" value={m.persona ?? ""} onChange={(v) => set("persona", v)} multiline placeholder="z. B. flirty, mysteriös, fürsorglich…" />
            <Field label="Tone of Voice" value={m.tone_of_voice ?? ""} onChange={(v) => set("tone_of_voice", v)} multiline />
            <Field label="Schreibstil" value={m.writing_style ?? ""} onChange={(v) => set("writing_style", v)} multiline />
            <ArrayField label="Do's" value={m.dos} onChange={(v) => set("dos", v)} />
            <ArrayField label="Don'ts" value={m.donts} onChange={(v) => set("donts", v)} />
          </Panel>
        )}

        {tab === "personal" && (
          <Panel title="Persönliche Daten">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Alter" type="number" value={m.age ? String(m.age) : ""} onChange={(v) => set("age", v ? parseInt(v) : null)} />
              <Field label="Geburtstag" type="date" value={m.birthday ?? ""} onChange={(v) => set("birthday", v || null)} />
            </div>
            <Field label="Wohnort" value={m.location ?? ""} onChange={(v) => set("location", v)} />
            <Field label="Job" value={m.job ?? ""} onChange={(v) => set("job", v)} />
            <Field label="Beziehungsstatus" value={m.relationship_status ?? ""} onChange={(v) => set("relationship_status", v)} />
            <ArrayField label="Hobbys" value={m.hobbies} onChange={(v) => set("hobbies", v)} />
            <ArrayField label="Sprachen" value={m.languages} onChange={(v) => set("languages", v)} />
            <Field label="Fun Facts" value={m.fun_facts ?? ""} onChange={(v) => set("fun_facts", v)} multiline />
          </Panel>
        )}

        {tab === "chat" && <ChatBehaviorTab m={m} set={set} />}

        {tab === "stufen" && (
          <StepConfigEditor
            modelId={id}
            value={m.step_config}
            onSaved={(steps: FunnelStageConfig[] | null) => {
              setM((prev: any) => ({ ...prev, step_config: steps }));
              setInitial((prev: any) => ({ ...prev, step_config: steps }));
            }}
          />
        )}

        {tab === "schutz" && (
          <LimitsEditor
            modelId={id}
            value={m.limits}
            onSaved={(limits) => {
              setM((prev: any) => ({ ...prev, limits }));
              setInitial((prev: any) => ({ ...prev, limits }));
            }}
          />
        )}

        {tab === "sets" && (
          <Panel title="PPV Sets">
            <ModelSetsManager modelId={id} />
          </Panel>
        )}

        {tab === "basis" && (
          <div style={{ marginTop: 22 }}>
            <Panel title="Gefahrenzone">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "hsl(0 0% 88%)", marginBottom: 6 }}>Model löschen</div>
                  <div className="module-desc" style={{ margin: 0 }}>
                    Entfernt das Profil dauerhaft. Zuweisungen werden mit gelöscht.
                  </div>
                </div>
                <button onClick={remove} className="shex-btn shex-btn-danger">Endgültig löschen</button>
              </div>
            </Panel>
          </div>
        )}
      </div>

      {(dirty || saving || savedAt) && (
        <div className="shex-savebar">
          <span style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: dirty ? "hsl(40 45% 65%)" : "hsl(0 0% 60%)" }}>
            {savedAt && !dirty ? `Gespeichert · ${savedAt}` : "Ungesicherte Änderungen"}
          </span>
          <button onClick={save} disabled={saving || !dirty} className="shex-btn shex-btn-primary" style={{ borderRadius: 999 }}>
            {saving ? "Speichere…" : "Speichern"}
          </button>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="premium-card" style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
      {title && <div className="kpi-label" style={{ color: "hsl(40 45% 60%)", marginBottom: 6 }}>{title}</div>}
      {children}
    </section>
  );
}

function Field({ label, value, onChange, type = "text", multiline, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; multiline?: boolean; placeholder?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="shex-field-label">{label}</span>
      {multiline
        ? <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="shex-textarea" />
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="shex-input" />}
    </label>
  );
}

function ArrayField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Field
      label={`${label} (Komma-getrennt)`}
      value={(value ?? []).join(", ")}
      onChange={(v) => onChange(v.split(",").map((s) => s.trim()).filter(Boolean))}
    />
  );
}

function ChatBehaviorTab({ m, set }: { m: any; set: (k: string, v: any) => void }) {
  const b = resolveChatBehavior(m.chat_behavior);
  const setB = (patch: Partial<ChatBehavior>) => set("chat_behavior", { ...b, ...patch });
  const preview = buildStyleBlock(extractStyleFields({ ...m, chat_behavior: b }));

  return (
    <>
      <Panel title="Antwort-Tempo">
        <div className="module-desc" style={{ margin: 0 }}>
          Wie schnell und in welchen Abständen sie im Auto-Chat antwortet (Sekunden).
        </div>
        <Range label="Antwortverzögerung" min={b.replyDelayMinSec} max={b.replyDelayMaxSec}
          onChange={(min, max) => setB({ replyDelayMinSec: min, replyDelayMaxSec: max })} />
        <Range label="Pause zwischen Multi-Nachrichten" min={b.multiGapMinSec} max={b.multiGapMaxSec}
          onChange={(min, max) => setB({ multiGapMinSec: min, multiGapMaxSec: max })} />
        <Range label="Pause vor einem PPV" min={b.ppvDelayMinSec} max={b.ppvDelayMaxSec}
          onChange={(min, max) => setB({ ppvDelayMinSec: min, ppvDelayMaxSec: max })} />
        <NumField label="Sammel-Fenster für Fan-Nachrichten (Sek.)" value={b.burstWindowSec}
          onChange={(v) => setB({ burstWindowSec: v })} step={0.1} />
      </Panel>

      <Panel title="Multi-Reply">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <NumField label="Nachrichten min." value={b.multiReplyMin} onChange={(v) => setB({ multiReplyMin: Math.max(1, Math.min(3, Math.round(v))) })} />
          <NumField label="Nachrichten max." value={b.multiReplyMax} onChange={(v) => setB({ multiReplyMax: Math.max(1, Math.min(3, Math.round(v))) })} />
        </div>
      </Panel>

      <Panel title="Schreibstil">
        <ArrayField label="Emojis" value={Array.isArray(m.emojis) ? m.emojis : []} onChange={(v) => set("emojis", v)} />
        <Select label="Emoji-Häufigkeit" value={resolveEmojiFrequency(m.emoji_frequency)}
          options={Object.entries(EMOJI_FREQ_LABEL).map(([v, l]) => ({ value: v, label: l }))}
          onChange={(v) => set("emoji_frequency", v as EmojiFrequency)} />
        <Select label="Nachrichtenlänge" value={b.messageLength}
          options={Object.entries(LENGTH_LABEL).map(([v, l]) => ({ value: v, label: l }))}
          onChange={(v) => setB({ messageLength: v as MessageLength })} />
        <Toggle label="Alles kleingeschrieben" value={b.lowercase} onChange={(v) => setB({ lowercase: v })} />
        <ArrayField label="Signature-Phrasen" value={Array.isArray(m.signature_phrases) ? m.signature_phrases : []} onChange={(v) => set("signature_phrases", v)} />
        <ArrayField label="Kosenamen für den Fan" value={b.petNames} onChange={(v) => setB({ petNames: v })} />
        <ArrayField label="Tabu-Wörter (nie benutzen)" value={Array.isArray(m.taboo_words) ? m.taboo_words : []} onChange={(v) => set("taboo_words", v)} />
        <ArrayField label="Opener (erste Nachricht)" value={Array.isArray(m.openers) ? m.openers : []} onChange={(v) => set("openers", v)} />
      </Panel>

      <Panel title="Aktivzeiten">
        <div className="module-desc" style={{ margin: 0 }}>
          Außerhalb dieser Zeiten antwortet sie langsamer — wirkt menschlicher.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Aktiv von" type="time" value={b.activeFrom} onChange={(v) => setB({ activeFrom: v })} />
          <Field label="Aktiv bis" type="time" value={b.activeTo} onChange={(v) => setB({ activeTo: v })} />
        </div>
        <NumField label="Verzögerungsfaktor außerhalb" value={b.offHoursDelayFactor} step={0.1}
          onChange={(v) => setB({ offHoursDelayFactor: Math.max(1, v) })} />
      </Panel>

      <Panel title="Verkaufstempo">
        <Select label="Tempo der Verkaufstreppe" value={b.salesTempo}
          options={Object.entries(SALES_TEMPO_LABEL).map(([v, l]) => ({ value: v, label: l }))}
          onChange={(v) => setB({ salesTempo: v as SalesTempo })} />
        <NumField label="Startstufe (0 = ganz von vorn, kostenlos)" value={b.salesStartStage}
          onChange={(v) => setB({ salesStartStage: Math.max(0, Math.round(v)) })} />
      </Panel>

      <Panel title="Vorschau — so sieht die KI den Stil">
        <pre style={{
          margin: 0, whiteSpace: "pre-wrap", fontSize: 11.5, lineHeight: 1.6,
          color: "hsl(0 0% 72%)", fontFamily: "ui-monospace, monospace",
        }}>{preview || "— keine Stilregeln gesetzt, es gelten die Standardwerte —"}</pre>
        <button onClick={() => set("chat_behavior", { ...DEFAULT_CHAT_BEHAVIOR })} className="shex-btn" style={{ alignSelf: "flex-start" }}>
          Auf Standard zurücksetzen
        </button>
      </Panel>
    </>
  );
}

function NumField({ label, value, onChange, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; step?: number;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="shex-field-label">{label}</span>
      <input
        type="number" step={step} value={String(value)}
        onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) onChange(n); }}
        className="shex-input"
      />
    </label>
  );
}

function Range({ label, min, max, onChange }: {
  label: string; min: number; max: number; onChange: (min: number, max: number) => void;
}) {
  return (
    <div>
      <span className="shex-field-label">{label}</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <NumField label="min" value={min} step={0.1} onChange={(v) => onChange(Math.max(0, v), Math.max(max, v))} />
        <NumField label="max" value={max} step={0.1} onChange={(v) => onChange(Math.min(min, v), Math.max(0, v))} />
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="shex-field-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="shex-input">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontSize: 13, color: "hsl(0 0% 85%)" }}>{label}</span>
    </label>
  );
}
