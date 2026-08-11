import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModelSetsManager } from "@/components/admin/ModelSetsManager";
import { ContentSets } from "@/components/cloud/ContentSets";
import { ModelCreateModal } from "@/components/admin/ModelCreateModal";
import { PlatformsTab } from "@/components/admin/PlatformsTab";
import { SteckbriefUpload } from "@/components/admin/SteckbriefUpload";
import { TemplateSection, syncTemplateChildren } from "@/components/admin/TemplateSection";
import { toast } from "sonner";
import { PersonaEditor, PresetGrid } from "@/components/admin/PersonaEditor";
import { StepConfigEditor } from "@/components/admin/StepConfigEditor";
import { LimitsEditor } from "@/components/admin/LimitsEditor";
import { ActiveHoursEditor } from "@/components/admin/ActiveHoursEditor";

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
  const [perfByModel, setPerfByModel] = useState<Record<string, { offers: number; buys: number }>>({});

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
      .select("id, model_id, autopilot_enabled");
    const counts: Record<string, { auto: number; manual: number }> = {};
    const convModel: Record<string, string> = {};
    for (const c of convs ?? []) {
      const row = c as { id: string; model_id: string; autopilot_enabled: boolean | null };
      const key = String(row.model_id);
      convModel[String(row.id)] = key;
      counts[key] ??= { auto: 0, manual: 0 };
      if (row.autopilot_enabled === false) counts[key].manual++;
      else counts[key].auto++;
    }
    setAutoCounts(counts);

    // Erfolgsquote der letzten 24 h je Profil (Angebote vs. Käufe).
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, content_type, ppv_is_purchased")
      .eq("content_type", "ppv")
      .gte("created_at", since);
    const perf: Record<string, { offers: number; buys: number }> = {};
    for (const msg of msgs ?? []) {
      const row = msg as { conversation_id: string; ppv_is_purchased: boolean | null };
      const key = convModel[String(row.conversation_id)];
      if (!key) continue;
      perf[key] ??= { offers: 0, buys: 0 };
      perf[key].offers++;
      if (row.ppv_is_purchased) perf[key].buys++;
    }
    setPerfByModel(perf);
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => onEdit(m.id)} className="module-title" style={{ display: "block", textAlign: "left" }}>
                      {m.display_name || "Unbenannt"}
                    </button>
                    <LimitShield
                      limits={resolveLimits(m.limits)}
                      pausedCount={autoCounts[m.id]?.manual ?? 0}
                      perf={perfByModel[m.id]}
                    />
                  </div>
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




type Tab = "profil" | "kommunikation" | "stufen" | "schutz" | "platforms" | "assets" | "sets";

function ModelEditorInline({ id, onBack }: { id: string; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("profil");
  const [m, setM] = useState<any>(null);
  const [initial, setInitial] = useState<any>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced Auto-Save
  useEffect(() => {
    if (!dirty || !m) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { id: _id, created_at: _c, updated_at: _u, created_by: _b, ...rest } = m;
      const snapshot = m;
      const { error } = await supabase
        .from("model_profiles")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        setSaveState("idle");
        toast.error("Speichern fehlgeschlagen");
        return;
      }
      setInitial(snapshot);
      setSaveState("saved");
      if (snapshot.is_template) {
        const children = await syncTemplateChildren(id);
        if (children > 0) toast.success(`Template aktualisiert — ${children} Profile synchronisiert`);
      }
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    }, 1500);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [m, dirty, id]);

  // Warnung beim Schließen des Tabs
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty || saveState === "saving") { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saveState]);

  const handleBack = () => {
    if (saveState === "saving" || dirty) {
      toast.info("Änderungen werden gespeichert…");
      setTimeout(() => onBack(), 2000);
    } else {
      onBack();
    }
  };

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

  const remove = async () => {
    if (!confirm(`Model „${m.display_name}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return;
    const { error } = await supabase.from("model_profiles").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    onBack();
  };


  const tabs: { id: Tab; label: string }[] = [
    { id: "profil", label: "Profil" },
    { id: "kommunikation", label: "Kommunikation" },
    { id: "stufen", label: "Stufen" },
    { id: "schutz", label: "Schutz" },
    { id: "platforms", label: "Plattformen" },
    { id: "assets", label: "Content-Ordner" },
    { id: "sets", label: "Sets" },
  ];

  return (
    <div className="shex" style={{ paddingBottom: 120 }}>
      <button onClick={handleBack} style={{
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
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <h1 className="shex-h1" style={{ margin: 0, fontSize: "clamp(32px, 3vw + 10px, 48px)" }}>
                {m.display_name || "Unbenannt"}
              </h1>
              <SaveIndicator state={saveState} />
            </div>
            <div style={{ marginTop: 10, display: "inline-flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
              <span className="kpi-label" style={{ color: "var(--text-subtle)" }}>@{m.handle}</span>
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
        {tab === "profil" && (
          <>
            <Panel title="Steckbrief-Upload">
              <SteckbriefUpload
                modelId={id}
                current={m as any}

                onApply={(patch: Record<string, unknown>) => setM((prev: any) => {
                  const next = { ...prev, ...patch };
                  setInitial(next);
                  return next;
                })}
              />
            </Panel>

            <Panel title="Basisdaten">
              <Field label="Anzeigename" value={m.display_name} onChange={(v) => set("display_name", v)} />
              <Field label="Handle (ohne @)" value={m.handle} onChange={(v) => set("handle", v)} />
              <Field label="Avatar URL" value={m.avatar_url ?? ""} onChange={(v) => set("avatar_url", v)} />
              <Field label="Bio" value={m.bio ?? ""} onChange={(v) => set("bio", v)} multiline />
              <Field label="Subscriber" type="number" value={String(m.subscribers)} onChange={(v) => set("subscribers", parseInt(v) || 0)} />

              <SubSection title="Persönliche Daten">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Alter" type="number" value={m.age ? String(m.age) : ""} onChange={(v) => set("age", v ? parseInt(v) : null)} />
                  <Field label="Geburtstag" type="date" value={m.birthday ?? ""} onChange={(v) => set("birthday", v || null)} />
                </div>
                <Field label="Wohnort" value={m.location ?? ""} onChange={(v) => set("location", v)} placeholder="Nicht angegeben" />
                <Field label="Geburtsort" value={m.birthplace ?? ""} onChange={(v) => set("birthplace", v)} placeholder="Nicht angegeben" />
                <Field label="Job" value={m.job ?? ""} onChange={(v) => set("job", v)} placeholder="Nicht angegeben" />
                <Field label="Beziehungsstatus" value={m.relationship_status ?? ""} onChange={(v) => set("relationship_status", v)} placeholder="Nicht angegeben" />
                <ArrayField label="Hobbys" value={m.hobbies} onChange={(v) => set("hobbies", v)} />
                <ArrayField label="Sprachen" value={m.languages} onChange={(v) => set("languages", v)} />
                <Field label="Fun Facts" value={m.fun_facts ?? ""} onChange={(v) => set("fun_facts", v)} multiline />
              </SubSection>

              <SubSection title="Physische Merkmale">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Größe (cm)" type="number" value={m.physical?.height_cm != null ? String(m.physical.height_cm) : ""}
                    onChange={(v) => setJson(m, set, "physical", "height_cm", v ? parseInt(v) : null)} placeholder="Nicht angegeben" />
                  <Field label="BH-Größe" value={m.physical?.bra_size ?? ""}
                    onChange={(v) => setJson(m, set, "physical", "bra_size", v)} placeholder="Nicht angegeben" />
                  <Field label="Schuhgröße" value={m.physical?.shoe_size ?? ""}
                    onChange={(v) => setJson(m, set, "physical", "shoe_size", v)} placeholder="Nicht angegeben" />
                  <Field label="Natürliche Haarfarbe" value={m.physical?.hair_color_natural ?? ""}
                    onChange={(v) => setJson(m, set, "physical", "hair_color_natural", v)} placeholder="Nicht angegeben" />
                </div>
                <Field label="Gewicht" value={m.physical?.weight ?? ""}
                  onChange={(v) => setJson(m, set, "physical", "weight", v)} placeholder="Nicht angegeben" />
              </SubSection>

              <SubSection title="Lieblings-Sachen">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Lieblingsessen" value={m.favorites?.food ?? ""}
                    onChange={(v) => setJson(m, set, "favorites", "food", v)} placeholder="Nicht angegeben" />
                  <Field label="Lieblingsmusik" value={m.favorites?.music ?? ""}
                    onChange={(v) => setJson(m, set, "favorites", "music", v)} placeholder="Nicht angegeben" />
                  <Field label="Lieblingsfilm" value={m.favorites?.movie ?? ""}
                    onChange={(v) => setJson(m, set, "favorites", "movie", v)} placeholder="Nicht angegeben" />
                  <Field label="Lieblingsfarbe" value={m.favorites?.color ?? ""}
                    onChange={(v) => setJson(m, set, "favorites", "color", v)} placeholder="Nicht angegeben" />
                </div>
              </SubSection>

              <SubSection title="Content & Grenzen">
                <Field label="Content-Infos" value={m.content_info ?? ""} onChange={(v) => set("content_info", v)} multiline placeholder="Nicht angegeben" />
                <Field label="NO-GOS" value={m.no_gos ?? ""} onChange={(v) => set("no_gos", v)} multiline placeholder="Nicht angegeben" />
                <Field label="Zusätzliche Infos" value={m.additional_info ?? ""} onChange={(v) => set("additional_info", v)} multiline placeholder="Nicht angegeben" />
                <Field label="Traum" value={m.dream ?? ""} onChange={(v) => set("dream", v)} placeholder="Nicht angegeben" />
              </SubSection>

              <TemplateSection profile={m} set={set} />
            </Panel>


            <Panel title="Gefahrenzone">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-strong)", marginBottom: 6 }}>Model löschen</div>
                  <div className="module-desc" style={{ margin: 0 }}>
                    Entfernt das Profil dauerhaft. Zuweisungen werden mit gelöscht.
                  </div>
                </div>
                <button onClick={remove} className="shex-btn shex-btn-danger">Endgültig löschen</button>
              </div>
            </Panel>
          </>
        )}

        {tab === "kommunikation" && (
          <>
            <Panel title="Kommunikationsstil">
              <PresetGrid
                selected={resolvePersonaConfig(m.persona_config)?.preset_id}
                onSelect={(pid: string) => {
                  const preset = presetById(pid);
                  if (preset) set("persona_config", { ...preset.persona });
                }}
              />
              <PersonaEditor
                persona={resolvePersonaConfig(m.persona_config) ?? DEFAULT_PERSONA}
                modelName={m.display_name}
                emojiFrequency={EMOJI_FREQ_LABEL[resolveEmojiFrequency(m.emoji_frequency)]}
                messageLength={LENGTH_LABEL[resolveChatBehavior(m.chat_behavior).messageLength]}

                onChange={(p: PersonaConfig) => setM({
                  ...m,
                  persona_config: p,
                  // Legacy-Stilfelder gespiegelt, damit die KI dieselben Werte liest
                  emojis: p.emoji_set ?? [],
                  signature_phrases: p.signature_phrases ?? [],
                  taboo_words: p.avoid_words ?? [],
                })}
                emojiExtras={
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Select label="Emoji-Häufigkeit" value={resolveEmojiFrequency(m.emoji_frequency)}
                      options={Object.entries(EMOJI_FREQ_LABEL).map(([v, l]) => ({ value: v, label: l }))}
                      onChange={(v) => set("emoji_frequency", v as EmojiFrequency)} />
                    <Select label="Nachrichtenlänge" value={resolveChatBehavior(m.chat_behavior).messageLength}
                      options={Object.entries(LENGTH_LABEL).map(([v, l]) => ({ value: v, label: l }))}
                      onChange={(v) => set("chat_behavior", { ...resolveChatBehavior(m.chat_behavior), messageLength: v as MessageLength })} />
                  </div>
                }
              />

              <SubSection title="Persona & Stil (Freitext)">
                <Field label="Persona" value={m.persona ?? ""} onChange={(v) => set("persona", v)} multiline placeholder="z. B. flirty, mysteriös, fürsorglich…" />
                <Field label="Tone of Voice" value={m.tone_of_voice ?? ""} onChange={(v) => set("tone_of_voice", v)} multiline />
                <Field label="Schreibstil" value={m.writing_style ?? ""} onChange={(v) => set("writing_style", v)} multiline />
                <ArrayField label="Do's" value={m.dos} onChange={(v) => set("dos", v)} />
                <ArrayField label="Don'ts" value={m.donts} onChange={(v) => set("donts", v)} />
              </SubSection>
            </Panel>

            <ChatBehaviorTab m={m} set={set} />
          </>
        )}

        {tab === "stufen" && (
          <StepConfigEditor
            modelId={id}
            value={m.step_config}
            onChange={(steps: FunnelStageConfig[]) => set("step_config", steps)}
          />
        )}

        {tab === "schutz" && (
          <LimitsEditor
            modelId={id}
            value={m.limits}
            onChange={(limits) => set("limits", limits)}
          />
        )}


        {tab === "platforms" && <PlatformsTab profileId={id} />}

        {tab === "assets" && (
          <div style={{ marginTop: 16 }}>
            <ContentSets modelId={id} stepConfig={m.step_config} />
          </div>
        )}

      </div>

    </div>
  );
}

/** Dezenter Auto-Save-Status: nichts / Spinner / grüner Haken. */
function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "idle") return null;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
      paddingTop: 10, animation: "sbFadeIn 150ms ease",
    }}>
      {state === "saving" ? (
        <>
          <span style={{
            width: 12, height: 12, borderRadius: "50%", display: "block",
            border: "1.5px solid hsl(243 75% 59% / 0.25)",
            borderTopColor: "hsl(243 75% 66%)",
            animation: "sbSpin 0.8s linear infinite",
          }} />
          <span style={{ fontSize: 11.5, color: "var(--text-subtle, hsl(0 0% 55%))", letterSpacing: "0.02em" }}>
            Speichern…
          </span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8.5l3.2 3.2L13 5" stroke="hsl(152 62% 60%)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 11.5, color: "hsl(152 62% 60%)", letterSpacing: "0.02em" }}>
            Gespeichert
          </span>
        </>
      )}
    </div>
  );
}



function setJson(
  m: any,
  set: (k: string, v: any) => void,
  field: "physical" | "favorites",
  key: string,
  value: unknown,
) {
  set(field, { ...(m[field] ?? {}), [key]: value === "" ? null : value });
}

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="premium-card" style={{
      display: "flex", flexDirection: "column",
      gap: 16, padding: 20, marginBottom: 16,
    }}>
      {title && <div className="kpi-label" style={{
        color: "var(--text-strong)",
        marginBottom: 4, paddingBottom: 12,
        borderBottom: "1px solid var(--hairline)",
      }}>{title}</div>}
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      borderTop: "1px solid var(--hairline)",
      margin: "4px 0 0",
      paddingTop: 16,
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div className="kpi-label" style={{ color: "var(--text-subtle)" }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", multiline, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; multiline?: boolean; placeholder?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="shex-field-label" style={{ display: "block", marginBottom: 6 }}>{label}</span>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <NumField label="Nachrichten min." value={b.multiReplyMin} onChange={(v) => setB({ multiReplyMin: Math.max(1, Math.min(3, Math.round(v))) })} />
          <NumField label="Nachrichten max." value={b.multiReplyMax} onChange={(v) => setB({ multiReplyMax: Math.max(1, Math.min(3, Math.round(v))) })} />
        </div>
      </Panel>

      <Panel title="Schreibstil">
        <Toggle label="Alles kleingeschrieben" value={b.lowercase} onChange={(v) => setB({ lowercase: v })} />
        <ArrayField label="Kosenamen für den Fan" value={b.petNames} onChange={(v) => setB({ petNames: v })} />
        <ArrayField label="Opener (erste Nachricht)" value={Array.isArray(m.openers) ? m.openers : []} onChange={(v) => set("openers", v)} />
      </Panel>

      <Panel title="Aktivzeiten">
        <ActiveHoursEditor b={b} setB={setB} />
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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


function LimitShield({ limits, pausedCount, perf }: {
  limits: ProfileLimits;
  pausedCount: number;
  perf?: { offers: number; buys: number };
}) {
  const successPct = perf && perf.offers > 0 ? (perf.buys / perf.offers) * 100 : null;
  const state = shieldState({ pausedCount, successPct, minSuccessPct: limits.min_success_pct });
  const color = SHIELD_COLOR[state];
  const tip = [
    `Max. gleichzeitige Chats: ${limits.max_concurrent_chats}`,
    `Max. Nachrichten/Tag: ${limits.max_messages_per_day}`,
    `Min. Erfolgsquote: ${limits.min_success_pct}%`,
    `Auto-Pause: ${limits.auto_pause_low_performance ? "an" : "aus"}`,
    successPct !== null ? `Erfolgsquote 24 h: ${successPct.toFixed(1)}%` : "Erfolgsquote 24 h: —",
  ].join("\n");

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} title={tip}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-label="Schutz-Limits">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      {state === "paused" && (
        <span style={{
          padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700,
          letterSpacing: 0.4, textTransform: "uppercase",
          background: "hsla(0,78%,62%,0.12)", border: "1px solid hsla(0,78%,62%,0.3)",
          color: "hsl(0 78% 72%)",
        }}>Pausiert</span>
      )}
    </span>
  );
}
