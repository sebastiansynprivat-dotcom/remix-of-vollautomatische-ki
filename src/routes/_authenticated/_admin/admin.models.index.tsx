import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin/admin/models/")({
  component: ModelsList,
});

type Model = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  subscribers: number;
  is_flex: boolean;
};

function ModelsList() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("model_profiles")
      .select("id,display_name,handle,avatar_url,subscribers,is_flex")
      .order("created_at", { ascending: false });
    setModels(data ?? []);
    setLoading(false);
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
    return models.filter((m) => {
      if (!q) return true;
      return m.display_name.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q);
    });
  }, [models, query]);

  return (
    <div className="shex">
      <header className="shex-masthead reveal-stagger">
        <div className="shex-eyebrow">
          <span className="shex-bar" />
          MODELS &middot; N<sup>o</sup>&nbsp;02
        </div>
        <h1 className="shex-h1">
          Models.<br />
          <span className="shex-h1-muted">Persona &amp; Steckbrief</span>
        </h1>
        <p className="shex-lede">
          Stimme, Tonalität und persönliche Daten jedes Profils kuratieren.
          Tabular gelistet, ein Datensatz pro Zeile.
        </p>
      </header>

      <section className="shex-section reveal-stagger">
        <div className="shex-section-head">
          <div className="shex-section-head-left">
            <span className="shex-section-index">I</span>
            <span className="shex-section-title">Verzeichnis</span>
          </div>
          <span className="shex-meta-faint tabular">
            {loading ? "—" : `${filtered.length.toLocaleString("de-DE")} / ${models.length.toLocaleString("de-DE")} Profile`}
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
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} hasQuery={!!query} />
        ) : (
          <div className="shex-rows">
            {filtered.map((m, i) => (
            <ModelRow
                key={m.id}
                m={m}
                code={`M-${String(i + 1).padStart(3, "0")}`}
                onRemove={() => remove(m.id, m.display_name)}
              />
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            navigate({ to: "/admin/models/$id", params: { id } });
          }}
        />
      )}
    </div>
  );
}

function ModelRow({ m, code, onRemove }: {
  m: Model; code: string; onRemove: () => void;
}) {
  return (
    <div className="module-row" style={{ gridTemplateColumns: "72px 36px 1fr auto" }}>
      <span className="module-accent" />
      <div className="module-code tabular">{code}</div>
      <div className="shex-avatar" style={{
        backgroundImage: m.avatar_url ? `url(${m.avatar_url})` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
        {!m.avatar_url && (m.display_name[0] ?? "?").toUpperCase()}
      </div>
      <div>
        <Link to="/admin/models/$id" params={{ id: m.id }} className="module-title" style={{ textDecoration: "none", display: "block" }}>
          {m.display_name || "Unbenannt"}
        </Link>
        <div className="module-desc" style={{ marginTop: 4 }}>
          @{m.handle} &middot; <span className="tabular">{(m.subscribers ?? 0).toLocaleString("de-DE")}</span> Subscriber
        </div>
      </div>
      <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
        <Link to="/admin/models/$id" params={{ id: m.id }} className="shex-btn shex-btn-ghost">
          Bearbeiten
        </Link>
        <button onClick={onRemove} className="shex-btn shex-btn-danger" title="Löschen" style={{ padding: "10px 12px" }}>
          ×
        </button>
      </div>
      <span className="module-underline" />
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="shex-rows">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="shex-skeleton" style={{ height: 72, marginBottom: 1 }} />
      ))}
    </div>
  );
}

function EmptyState({ onCreate, hasQuery }: { onCreate: () => void; hasQuery: boolean }) {
  return (
    <div className="premium-card" style={{ textAlign: "center", padding: "56px 28px" }}>
      <div className="kpi-label" style={{ marginBottom: 12 }}>
        {hasQuery ? "Keine Treffer" : "Verzeichnis leer"}
      </div>
      <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: "-0.02em", color: "hsl(0 0% 94%)", marginBottom: 10 }}>
        {hasQuery ? "Nichts gefunden." : "Noch keine Models angelegt."}
      </div>
      <div className="module-desc" style={{ margin: "0 auto 24px", maxWidth: 380 }}>
        {hasQuery
          ? "Filter anpassen oder direkt ein neues Profil anlegen."
          : "Lege das erste Profil an und starte die Persona-Pflege."}
      </div>
      <button onClick={onCreate} className="shex-btn shex-btn-primary">
        + Neues Model
      </button>
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [subscribers, setSubscribers] = useState("0");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !handle.trim()) {
      setErr("Anzeigename und Handle sind Pflicht.");
      return;
    }
    setBusy(true); setErr(null);
    const { data, error } = await supabase
      .from("model_profiles")
      .insert({
        display_name: displayName.trim(),
        handle: handle.trim().replace(/^@/, ""),
        avatar_url: avatarUrl.trim() || null,
        subscribers: parseInt(subscribers) || 0,
      })
      .select("id").single();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onCreated(data.id);
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} className="shex-modal-backdrop">
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="shex-modal">
        <div style={{ marginBottom: 18 }}>
          <div className="shex-eyebrow" style={{ marginBottom: 14 }}>
            <span className="shex-bar" />
            ANLEGEN
          </div>
          <h2 className="shex-h1" style={{ fontSize: 36, margin: 0 }}>Neues Model.</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ModalField label="Anzeigename *" value={displayName} onChange={setDisplayName} placeholder="z. B. Mia" autoFocus />
          <ModalField label="Handle *" value={handle} onChange={setHandle} placeholder="mia_official" prefix="@" />
          <ModalField label="Avatar URL" value={avatarUrl} onChange={setAvatarUrl} placeholder="https://…" />
          <ModalField label="Subscriber" value={subscribers} onChange={setSubscribers} type="number" />
        </div>

        {err && (
          <div style={{
            marginTop: 14, padding: "10px 12px", borderRadius: 8, fontSize: 12,
            background: "hsl(0 75% 58% / 0.08)",
            border: "1px solid hsl(0 75% 58% / 0.3)",
            color: "hsl(0 75% 75%)",
          }}>{err}</div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button type="button" onClick={onClose} className="shex-btn shex-btn-ghost" style={{ flex: 1 }}>
            Abbrechen
          </button>
          <button type="submit" disabled={busy} className="shex-btn shex-btn-primary" style={{ flex: 1 }}>
            {busy ? "Lege an…" : "Anlegen"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ModalField({ label, value, onChange, type = "text", placeholder, prefix, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; prefix?: string; autoFocus?: boolean;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="shex-field-label">{label}</span>
      {prefix ? (
        <div style={{
          display: "flex", alignItems: "center",
          background: "hsl(0 0% 0% / 0.35)",
          border: "1px solid hsl(0 0% 100% / 0.08)",
          borderRadius: 8, overflow: "hidden",
        }}>
          <span style={{ padding: "0 4px 0 14px", color: "hsl(0 0% 45%)", fontSize: 13.5 }}>{prefix}</span>
          <input
            autoFocus={autoFocus}
            type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            className="shex-input"
            style={{ border: "none", background: "transparent", padding: "11px 14px 11px 4px" }}
          />
        </div>
      ) : (
        <input
          autoFocus={autoFocus}
          type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="shex-input"
        />
      )}
    </label>
  );
}
