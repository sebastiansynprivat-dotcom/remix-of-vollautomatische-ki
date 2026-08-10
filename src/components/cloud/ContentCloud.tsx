import { useMemo, useRef, useState } from "react";
import type { ModelProfile } from "@/data/mockData";
import {
  useModelMedia, useModelPpvTemplates, useIsAdmin,
  recordAssetSend, recordTemplateSend, assetThumbUrl, seedDemoCloud,
  type MediaAsset, type PpvTemplate,
} from "@/lib/cloudContent";
import { useChat } from "@/lib/chatStore";
import { fx } from "@/lib/feedback";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AssetLibrary } from "./AssetLibrary";

type Tab = "media" | "templates" | "assets";
type StatusFilter = "all" | "fresh" | "used";
type Sort = "new" | "sent" | "revenue";

interface Props {
  model: ModelProfile;
  returnConvId: string | null;
  onBackToChat: () => void;
}

export function ContentCloud({ model, returnConvId, onBackToChat }: Props) {
  const [tab, setTab] = useState<Tab>("media");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [lightbox, setLightbox] = useState<MediaAsset | null>(null);
  const isAdmin = useIsAdmin();
  const chat = useChat();

  const { items: media, loading: loadingMedia } = useModelMedia(model.id);
  const { items: templates, loading: loadingTpl } = useModelPpvTemplates(model.id);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    media.forEach(m => m.tags.forEach(t => s.add(t)));
    templates.forEach(t => t.tags.forEach(x => s.add(x)));
    return Array.from(s).sort();
  }, [media, templates]);

  const filteredMedia = useMemo(() => {
    let r = media;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(m => (m.title?.toLowerCase().includes(q)) || m.tags.some(t => t.includes(q)));
    }
    if (tagFilter) r = r.filter(m => m.tags.includes(tagFilter));
    if (statusFilter !== "all") r = r.filter(m => m.status === statusFilter);
    if (sort === "sent") r = [...r].sort((a, b) => b.times_sent - a.times_sent);
    return r;
  }, [media, search, tagFilter, statusFilter, sort]);

  const filteredTpl = useMemo(() => {
    let r = templates;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.caption ?? "").toLowerCase().includes(q) ||
        t.tags.some(x => x.includes(q))
      );
    }
    if (tagFilter) r = r.filter(t => t.tags.includes(tagFilter));
    if (sort === "sent") r = [...r].sort((a, b) => b.times_sent - a.times_sent);
    if (sort === "revenue") r = [...r].sort((a, b) => Number(b.revenue_cents) - Number(a.revenue_cents));
    return r;
  }, [templates, search, tagFilter, sort]);

  const sendMedia = async (a: MediaAsset) => {
    if (!returnConvId) {
      toast.error("Wähle zuerst einen Chat aus.");
      return;
    }
    chat.openPpvDraft(returnConvId, {
      caption: a.title ?? "",
      price_cents: 999,
      media_type: a.kind,
      media_count: 1,
      cover_url: assetThumbUrl(a) ?? undefined,
    });
    await recordAssetSend(a.id, returnConvId).catch(() => {});
    fx.haptic("snap");
    onBackToChat();
  };

  const sendTemplate = async (t: PpvTemplate) => {
    if (!returnConvId) {
      toast.error("Wähle zuerst einen Chat aus.");
      return;
    }
    chat.openPpvDraft(returnConvId, {
      caption: t.caption ?? "",
      price_cents: t.price_cents,
      media_type: t.media_type,
      media_count: t.media_count,
      cover_url: t.cover_url ?? undefined,
    });
    await recordTemplateSend(t.id).catch(() => {});
    fx.haptic("snap");
    onBackToChat();
  };

  return (
    <main style={{
      flex: 1, height: "100%", display: "flex", flexDirection: "column",
      minWidth: 0, overflow: "hidden",
      background: "linear-gradient(180deg, hsla(40,18%,8%,0.25), hsla(0,0%,4%,0.5))",
    }}>
      {/* Header */}
      <header className="glass-strong" style={{
        padding: "16px 24px",
        borderBottom: "1px solid var(--hairline-gold)",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <img src={model.avatarUrl} alt={model.displayName} width={42} height={42}
          style={{
            width: 42, height: 42, borderRadius: "50%", objectFit: "cover",
            boxShadow: "0 0 0 2px var(--gold), 0 0 0 4px var(--surface-1), 0 0 18px hsla(38,55%,55%,0.25)",
          }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display" style={{
            color: "var(--text-strong)", fontSize: 18, fontWeight: 600, letterSpacing: -0.3,
          }}>{model.displayName}s Cloud</div>
          <div style={{ color: "var(--text-subtle)", fontSize: 11 }}>
            {media.length} Medien · {templates.length} PPV-Vorlagen
          </div>
        </div>
        {returnConvId && (
          <button onClick={onBackToChat} style={pillBtn}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Zurück zum Chat
          </button>
        )}
      </header>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, padding: "10px 24px 0",
        borderBottom: "1px solid hsla(0,0%,100%,0.04)",
      }}>
        <TabBtn active={tab === "media"} onClick={() => setTab("media")} label="Medien" count={media.length} />
        <TabBtn active={tab === "templates"} onClick={() => setTab("templates")} label="PPV-Vorlagen" count={templates.length} />
        <TabBtn active={tab === "assets"} onClick={() => setTab("assets")} label="Assets" count={0} />
        <div style={{ flex: 1 }} />
        {isAdmin && tab === "media" && (
          <UploadButton modelId={model.id} />
        )}
        {isAdmin && media.length === 0 && (
          <button onClick={async () => {
            const { error } = await seedDemoCloud(model.id);
            if (error) toast.error("Demo-Seed fehlgeschlagen: " + error.message);
            else toast.success("Demo-Inhalte angelegt");
          }} style={{ ...pillBtn, marginBottom: 8 }}>Demo-Inhalte laden</button>
        )}
      </div>

      {/* Toolbar */}
      {tab !== "assets" && (
      <div style={{
        padding: "12px 24px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <div className="premium-card" style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 10, minWidth: 220,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen…"
            style={{ flex: 1, fontSize: 12, color: "var(--text-strong)", background: "transparent", border: "none", outline: "none" }}
          />
        </div>

        {tab === "media" && (
          <>
            <SelectChip label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)}
              options={[
                { id: "all", label: "Alle" },
                { id: "fresh", label: "Frisch" },
                { id: "used", label: "Verbraucht" },
              ]} />
          </>
        )}
        <SelectChip label="Sort" value={sort} onChange={(v) => setSort(v as Sort)}
          options={tab === "media"
            ? [{ id: "new", label: "Neu" }, { id: "sent", label: "Meist gesendet" }]
            : [{ id: "new", label: "Neu" }, { id: "sent", label: "Meist gesendet" }, { id: "revenue", label: "Umsatz" }]} />

        {allTags.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1, minWidth: 0 }}>
            <TagChip active={tagFilter === null} label="Alle Tags" onClick={() => setTagFilter(null)} />
            {allTags.map(t => (
              <TagChip key={t} active={tagFilter === t} label={t} onClick={() => setTagFilter(t === tagFilter ? null : t)} />
            ))}
          </div>
        )}
      </div>
      )}

      {/* Grid */}
      {tab === "assets" ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "0 24px 12px" }}>
          <AssetLibrary modelId={model.id} />
        </div>
      ) : (
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px 24px" }}>
        {tab === "media" ? (
          loadingMedia ? <Empty text="Lade Medien…" /> :
          filteredMedia.length === 0 ? (
            <Empty text={media.length === 0 ? "Noch keine Medien in der Cloud." : "Keine Treffer mit diesen Filtern."} />
          ) : (
            <div style={gridStyle}>
              {filteredMedia.map(a => (
                <MediaCard key={a.id} a={a} onSend={() => sendMedia(a)} onPreview={() => setLightbox(a)} canSend={!!returnConvId} />
              ))}
            </div>
          )
        ) : (
          loadingTpl ? <Empty text="Lade Vorlagen…" /> :
          filteredTpl.length === 0 ? (
            <Empty text={templates.length === 0 ? "Noch keine PPV-Vorlagen." : "Keine Treffer mit diesen Filtern."} />
          ) : (
            <div style={gridStyle}>
              {filteredTpl.map(t => (
                <TemplateCard key={t.id} t={t} onSend={() => sendTemplate(t)} canSend={!!returnConvId} />
              ))}
            </div>
          )
        )}
      </div>
      )}


      {lightbox && <Lightbox a={lightbox} onClose={() => setLightbox(null)} />}
    </main>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 14,
};

function TabBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 16px",
      borderBottom: active ? "2px solid var(--gold)" : "2px solid transparent",
      color: active ? "var(--gold)" : "var(--text-muted)",
      fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
      transition: "all 200ms var(--easing)",
      display: "inline-flex", alignItems: "center", gap: 8,
    }}>
      {label}
      <span className="tabular-nums" style={{
        fontSize: 10, padding: "1px 6px", borderRadius: 6,
        background: active ? "hsla(40,45%,55%,0.15)" : "hsla(0,0%,100%,0.04)",
        color: active ? "var(--gold)" : "var(--text-subtle)",
      }}>{count}</span>
    </button>
  );
}

function TagChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 600, flexShrink: 0,
      color: active ? "var(--gold)" : "var(--text-muted)",
      background: active ? "hsla(40,45%,55%,0.10)" : "hsla(0,0%,100%,0.025)",
      border: `1px solid ${active ? "hsla(40,45%,55%,0.4)" : "hsla(0,0%,100%,0.06)"}`,
    }}>{label}</button>
  );
}

function SelectChip({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 8px 5px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
      background: "hsla(0,0%,100%,0.025)",
      border: "1px solid hsla(0,0%,100%,0.06)",
    }}>
      <span style={{ color: "var(--text-subtle)" }}>{label}:</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        background: "transparent", color: "var(--text-strong)",
        border: "none", outline: "none", fontSize: 11, fontWeight: 600,
      }}>
        {options.map(o => <option key={o.id} value={o.id} style={{ background: "var(--surface-2)" }}>{o.label}</option>)}
      </select>
    </label>
  );
}

function MediaCard({ a, onSend, onPreview, canSend }: { a: MediaAsset; onSend: () => void; onPreview: () => void; canSend: boolean }) {
  const url = assetThumbUrl(a);
  return (
    <div className="premium-card" style={{
      borderRadius: 12, overflow: "hidden", position: "relative",
      background: "var(--surface-2)",
      border: "1px solid hsla(0,0%,100%,0.06)",
      transition: "transform 220ms var(--easing), box-shadow 220ms var(--easing)",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 28px hsla(0,0%,0%,0.45)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <button onClick={onPreview} style={{
        display: "block", width: "100%", aspectRatio: "1 / 1",
        background: "#000", position: "relative", overflow: "hidden",
      }}>
        {url ? (
          <img src={url} alt={a.title ?? ""} loading="lazy" style={{
            width: "100%", height: "100%", objectFit: "cover",
          }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--text-subtle)", fontSize: 11 }}>kein Vorschau</div>
        )}
        {a.kind === "video" && (
          <span style={{
            position: "absolute", top: 8, right: 8,
            padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: "hsla(0,0%,0%,0.6)", color: "#fff", display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20" /></svg>
            {a.duration_sec ? `${a.duration_sec}s` : "VIDEO"}
          </span>
        )}
        {a.status === "used" && (
          <span style={{
            position: "absolute", top: 8, left: 8,
            padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
            background: "hsla(0,0%,0%,0.65)", color: "hsl(40, 50%, 75%)",
            border: "1px solid hsla(40,45%,55%,0.3)",
          }}>verbraucht</span>
        )}
      </button>
      <div style={{ padding: "10px 12px" }}>
        <div style={{
          color: "var(--text-strong)", fontSize: 12, fontWeight: 600, letterSpacing: -0.1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{a.title ?? "Ohne Titel"}</div>
        <div className="tabular-nums" style={{
          color: "var(--text-subtle)", fontSize: 10, marginTop: 2,
          display: "flex", justifyContent: "space-between",
        }}>
          <span>{a.tags.slice(0, 2).join(" · ") || "—"}</span>
          <span>{a.times_sent}× gesendet</span>
        </div>
        <button onClick={onSend} disabled={!canSend} title={canSend ? "An Chat senden" : "Wähle erst einen Chat"} style={{
          marginTop: 10, width: "100%",
          padding: "7px 10px", borderRadius: 8,
          fontSize: 11, fontWeight: 700, letterSpacing: 0.2,
          background: canSend ? "linear-gradient(180deg, hsla(38,42%,58%,0.22), hsla(38,42%,40%,0.12))" : "hsla(0,0%,100%,0.04)",
          color: canSend ? "var(--gold)" : "var(--text-subtle)",
          border: `1px solid ${canSend ? "hsla(38,42%,58%,0.4)" : "hsla(0,0%,100%,0.06)"}`,
          cursor: canSend ? "pointer" : "not-allowed",
        }}>An Chat senden</button>
      </div>
    </div>
  );
}

function TemplateCard({ t, onSend, canSend }: { t: PpvTemplate; onSend: () => void; canSend: boolean }) {
  return (
    <div className="premium-card" style={{
      borderRadius: 12, overflow: "hidden",
      background: "var(--surface-2)",
      border: "1px solid hsla(38,42%,58%,0.18)",
      boxShadow: "0 6px 18px hsla(0,0%,0%,0.35)",
    }}>
      <div style={{ aspectRatio: "16 / 10", background: "#000", position: "relative", overflow: "hidden" }}>
        {t.cover_url && (
          <img src={t.cover_url} alt={t.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.78)" }} />
        )}
        <span className="tabular-nums" style={{
          position: "absolute", top: 8, right: 8,
          padding: "3px 8px", borderRadius: 8,
          fontSize: 11, fontWeight: 800, letterSpacing: -0.2,
          background: "linear-gradient(180deg, hsla(40,55%,55%,0.95), hsla(40,55%,40%,0.95))",
          color: "#1a1306", boxShadow: "0 4px 12px hsla(40,45%,40%,0.4)",
        }}>{(t.price_cents / 100).toFixed(2).replace(".", ",")} €</span>
        <span style={{
          position: "absolute", bottom: 8, left: 8,
          padding: "2px 7px", borderRadius: 6,
          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4,
          background: "hsla(0,0%,0%,0.65)", color: "#fff",
        }}>{t.media_type === "gallery" ? `${t.media_count} Medien` : t.media_type}</span>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ color: "var(--text-strong)", fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>{t.title}</div>
        <div style={{
          color: "var(--text-muted)", fontSize: 11, marginTop: 4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{t.caption ?? ""}</div>
        <div className="tabular-nums" style={{
          marginTop: 8, display: "flex", gap: 10,
          fontSize: 10, color: "var(--text-subtle)",
        }}>
          <span>📤 {t.times_sent}</span>
          <span>✓ {t.times_purchased}</span>
          <span>💰 {(Number(t.revenue_cents) / 100).toFixed(0)} €</span>
        </div>
        <button onClick={onSend} disabled={!canSend} style={{
          marginTop: 10, width: "100%",
          padding: "8px 10px", borderRadius: 8,
          fontSize: 11, fontWeight: 700, letterSpacing: 0.2,
          background: canSend
            ? "linear-gradient(180deg, hsla(38,55%,55%,0.95), hsla(38,55%,42%,0.95))"
            : "hsla(0,0%,100%,0.04)",
          color: canSend ? "#1a1306" : "var(--text-subtle)",
          border: "none",
          cursor: canSend ? "pointer" : "not-allowed",
          boxShadow: canSend ? "0 4px 14px hsla(38,55%,42%,0.4)" : undefined,
        }}>An Chat senden</button>
      </div>
    </div>
  );
}

function Lightbox({ a, onClose }: { a: MediaAsset; onClose: () => void }) {
  const url = assetThumbUrl(a);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "hsla(0,0%,0%,0.85)",
      display: "grid", placeItems: "center",
      backdropFilter: "blur(8px)",
    }}>
      {url && (
        a.kind === "video"
          ? <video src={url} controls autoPlay style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }} />
          : <img src={url} alt={a.title ?? ""} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, boxShadow: "0 30px 80px hsla(0,0%,0%,0.7)" }} />
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{
      padding: "64px 16px", textAlign: "center",
      color: "var(--text-subtle)", fontSize: 13,
    }}>{text}</div>
  );
}

const pillBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 12px", borderRadius: 999,
  fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
  background: "hsla(0,0%,100%,0.03)",
  border: "1px solid hsla(0,0%,100%,0.06)",
};

function UploadButton({ modelId }: { modelId: string }) {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const ext = f.name.split(".").pop() ?? "bin";
        const path = `${modelId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("model-content").upload(path, f);
        if (upErr) throw upErr;
        const isVideo = f.type.startsWith("video/");
        // For private bucket, use signed URL for preview later; for the thumbnail
        // we just store the path and resolve via getPublicUrl/createSignedUrl.
        const { data: { user } } = await supabase.auth.getUser();
        const { error: insErr } = await supabase.from("media_assets").insert({
          model_id: modelId,
          kind: isVideo ? "video" : "photo",
          storage_path: path,
          mime: f.type,
          size_bytes: f.size,
          title: f.name,
          uploaded_by: user?.id,
        });
        if (insErr) throw insErr;
      }
      toast.success(`${files.length} Datei(en) hochgeladen`);
    } catch (err: any) {
      toast.error("Upload fehlgeschlagen: " + err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <input ref={ref} type="file" multiple accept="image/*,video/*" onChange={onPick} style={{ display: "none" }} />
      <button onClick={() => ref.current?.click()} disabled={busy} style={{
        ...pillBtn,
        marginBottom: 8,
        color: "var(--gold)",
        background: "hsla(40,45%,55%,0.10)",
        borderColor: "hsla(40,45%,55%,0.4)",
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        {busy ? "Lädt…" : "Hochladen"}
      </button>
    </>
  );
}
