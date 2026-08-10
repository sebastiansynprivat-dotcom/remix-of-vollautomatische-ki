import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useModelAssets, useResolvedUrl, tierMeta, TIERS, CATEGORIES, CATEGORY_LABEL,
  successRate, euro, deleteAsset, placeholderAssets, type ModelAsset,
} from "@/lib/modelAssets";
import { AssetUploadModal } from "./AssetUploadModal";

type ViewMode = "gallery" | "list";
type ValueFilter = "all" | "free" | "low" | "mid" | "high";
type SortKey = "new" | "used" | "revenue" | "rate";

const CARD_BG = "#131316";

/** Solange true, zeigt die Galerie zusätzlich Test-Assets unterhalb der echten Daten. */
export const USE_PLACEHOLDERS = true;

export function AssetLibrary({ modelId, profile }: {
  modelId: string;
  profile?: { displayName: string; avatarUrl?: string | null } | null;
}) {
  const { items, loading, reload } = useModelAssets(modelId);
  const placeholders = useMemo(
    () => (USE_PLACEHOLDERS ? placeholderAssets(modelId) : []),
    [modelId],
  );
  const [view, setView] = useState<ViewMode>("gallery");
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<number | null>(null);
  const [valueFilter, setValueFilter] = useState<ValueFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("new");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detail, setDetail] = useState<ModelAsset | null>(null);

  const applyFilters = useCallback((list: ModelAsset[]) => {
    let r = list;
    const q = search.trim().toLowerCase();
    if (q) r = r.filter(a =>
      (a.description ?? "").toLowerCase().includes(q) ||
      (a.note ?? "").toLowerCase().includes(q) ||
      a.tags.some(t => t.includes(q)));
    if (tier !== null) r = r.filter(a => a.tier === tier);
    if (category !== "all") r = r.filter(a => a.category === category);
    if (valueFilter !== "all") {
      r = r.filter(a => {
        const c = a.value_cents;
        if (valueFilter === "free") return c === 0;
        if (valueFilter === "low") return c > 0 && c <= 1000;
        if (valueFilter === "mid") return c > 1000 && c <= 5000;
        return c > 5000;
      });
    }
    const sorted = [...r];
    if (sort === "used") sorted.sort((a, b) => b.use_count - a.use_count);
    else if (sort === "revenue") sorted.sort((a, b) => b.revenue_total_cents - a.revenue_total_cents);
    else if (sort === "rate") sorted.sort((a, b) => (successRate(b) ?? -1) - (successRate(a) ?? -1));
    else sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return sorted;
  }, [search, tier, category, valueFilter, sort]);

  const filtered = useMemo(() => applyFilters(items), [applyFilters, items]);
  const filteredPh = useMemo(() => applyFilters(placeholders), [applyFilters, placeholders]);
  const nothingToShow = filtered.length === 0 && filteredPh.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      {profile && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "4px 4px 10px",
          borderBottom: "1px solid #1E1E22",
        }}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName} width={32} height={32}
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", boxShadow: "0 0 0 1px #1E1E22" }} />
          ) : (
            <span style={{
              width: 32, height: 32, borderRadius: "50%", background: CARD_BG,
              display: "grid", placeItems: "center", fontSize: 12, color: "var(--text-subtle)",
            }}>{profile.displayName.slice(0, 1).toUpperCase()}</span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)" }}>{profile.displayName}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>Assets</div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 4px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: CARD_BG, border: "1px solid #1E1E22", borderRadius: 10, padding: 3 }}>
          {(["gallery", "list"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: view === v ? "rgba(255,255,255,0.07)" : "transparent",
              color: view === v ? "var(--text-strong)" : "var(--text-subtle)",
            }}>{v === "gallery" ? "Galerie" : "Liste"}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Assets durchsuchen…"
          style={{
            flex: 1, minWidth: 180, background: CARD_BG, border: "1px solid #1E1E22",
            borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "var(--text-strong)", outline: "none",
          }} />
        <button onClick={() => setUploadOpen(true)} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
          border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 600,
          cursor: "pointer", boxShadow: "0 6px 20px rgba(99,102,241,0.35)",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
          Asset hinzufügen
        </button>
      </div>

      {/* Filter bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 5, display: "flex", gap: 8, flexWrap: "wrap",
        alignItems: "center", padding: "8px 4px", background: "var(--surface-1)",
        borderBottom: "1px solid #1E1E22",
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {TIERS.map(t => {
            const active = tier === t.level;
            return (
              <button key={t.level} onClick={() => setTier(active ? null : t.level)} title={t.label} style={{
                fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                border: active ? "1px solid transparent" : "1px solid #1E1E22",
                background: active ? t.gradient : CARD_BG,
                color: active ? "#fff" : "var(--text-subtle)",
              }}>{t.level} · {t.label}</button>
            );
          })}
        </div>
        <Select value={valueFilter} onChange={v => setValueFilter(v as ValueFilter)} options={[
          { id: "all", label: "Wert: Alle" }, { id: "free", label: "Gratis" },
          { id: "low", label: "Niedrig" }, { id: "mid", label: "Mittel" }, { id: "high", label: "Hoch" },
        ]} />
        <Select value={category} onChange={setCategory} options={[
          { id: "all", label: "Kategorie: Alle" },
          ...CATEGORIES.map(c => ({ id: c, label: CATEGORY_LABEL[c]! })),
        ]} />
        <Select value={sort} onChange={v => setSort(v as SortKey)} options={[
          { id: "new", label: "Neueste" }, { id: "used", label: "Meistgenutzt" },
          { id: "revenue", label: "Höchster Umsatz" }, { id: "rate", label: "Beste Quote" },
        ]} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 4px 24px" }}>
        {loading ? (
          <Centered text="Lade Assets…" />
        ) : nothingToShow ? (
          <EmptyState hasAny={items.length > 0} onAdd={() => setUploadOpen(true)} />
        ) : (
          <>
            {filtered.length > 0 && (
              view === "gallery"
                ? <Grid>{filtered.map(a => <AssetCard key={a.id} a={a} onOpen={() => setDetail(a)} />)}</Grid>
                : <Rows>{filtered.map(a => <AssetRow key={a.id} a={a} onOpen={() => setDetail(a)} />)}</Rows>
            )}

            {filteredPh.length > 0 && (
              <>
                <div style={{
                  borderTop: "1px solid #1E1E22", marginTop: filtered.length > 0 ? 22 : 0,
                  paddingTop: 10, marginBottom: 12,
                  fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1,
                  color: "var(--text-subtle)",
                }}>Test-Daten</div>
                {view === "gallery"
                  ? <Grid>{filteredPh.map(a => <AssetCard key={a.id} a={a} onOpen={() => setDetail(a)} />)}</Grid>
                  : <Rows>{filteredPh.map(a => <AssetRow key={a.id} a={a} onOpen={() => setDetail(a)} />)}</Rows>}
              </>
            )}
          </>
        )}
      </div>

      {uploadOpen && (
        <AssetUploadModal modelId={modelId} onClose={() => setUploadOpen(false)} onSaved={reload} />
      )}
      {detail && (
        <AssetLightbox
          a={detail}
          onClose={() => setDetail(null)}
          onDeleted={() => { setDetail(null); void reload(); }}
        />
      )}
    </div>
  );
}

function AssetCard({ a, onOpen }: { a: ModelAsset; onOpen: () => void }) {
  const url = useResolvedUrl(a.thumbnail_url ?? a.url);
  const [hover, setHover] = useState(false);
  const tm = tierMeta(a.tier);
  const rate = successRate(a);

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: CARD_BG, border: "1px solid #1E1E22", borderRadius: 12,
        overflow: "hidden", cursor: "pointer",
        transform: hover ? "translateY(-2px)" : "none", transition: "transform .15s ease",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "1 / 1", background: "#0A0A0B" }}>
        {url ? (
          a.media_type === "video"
            ? <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
            : <img src={url} alt={a.description ?? "Asset"} loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}

        <span style={{
          position: "absolute", top: 8, left: 8, width: 24, height: 24, borderRadius: 999,
          background: tm.gradient, color: "#fff", fontSize: 11, fontWeight: 700,
          display: "grid", placeItems: "center",
        }}>{a.tier}</span>

        {a.is_placeholder && (
          <span style={{
            position: "absolute", top: 36, right: 8, fontSize: 10, fontWeight: 700,
            padding: "2px 8px", borderRadius: 999, letterSpacing: 0.6,
            background: "rgba(245,158,11,0.20)", color: "#fcd34d",
          }}>TEST</span>
        )}

        <span style={{
          position: "absolute", top: 8, right: 8, fontSize: 11, fontWeight: 700,
          padding: "3px 9px", borderRadius: 999,
          background: a.value_cents > 0 ? "linear-gradient(135deg,#f5d182,#c9a24d)" : "#334155",
          color: a.value_cents > 0 ? "#111" : "#e2e8f0",
        }}>{a.value_cents > 0 ? euro(a.value_cents) : "Gratis"}</span>

        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: 10,
          background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0) 60%)",
          opacity: hover ? 1 : 0, transition: "opacity .2s ease",
        }}>
          <p style={{
            fontSize: 11.5, color: "rgba(255,255,255,0.9)", margin: 0,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{a.description ?? "Keine Beschreibung"}</p>
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: 8, background: CARD_BG,
        fontSize: 11, color: "var(--text-subtle)",
      }}>
        <span style={iconRow}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z" /></svg>
          {a.use_count}
        </span>
        <span style={iconRow}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>
          {a.response_count}
        </span>
        <span style={{ marginLeft: "auto", color: rateColor(rate), fontWeight: 600 }}>
          {rate === null ? "–" : `${rate}%`}
        </span>
      </div>
    </div>
  );
}

function AssetRow({ a, onOpen }: { a: ModelAsset; onOpen: () => void }) {
  const url = useResolvedUrl(a.thumbnail_url ?? a.url);
  const tm = tierMeta(a.tier);
  const rate = successRate(a);
  return (
    <div onClick={onOpen} style={{
      display: "flex", alignItems: "center", gap: 12, padding: 10, cursor: "pointer",
      background: CARD_BG, border: "1px solid #1E1E22", borderRadius: 12,
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: "#0A0A0B", flexShrink: 0 }}>
        {url && a.media_type !== "video" && <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {a.description ?? "Ohne Beschreibung"}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>
          {CATEGORY_LABEL[a.category] ?? a.category} · {a.use_count} Nutzungen · {a.response_count} Reaktionen
        </div>
      </div>
      {a.is_placeholder && (
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.6, padding: "2px 8px", borderRadius: 999,
          background: "rgba(245,158,11,0.20)", color: "#fcd34d",
        }}>TEST</span>
      )}
      <span style={{ background: tm.gradient, color: "#fff", fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>{tm.label}</span>
      <span style={{ fontSize: 12, color: "var(--gold, #d4af6a)", fontVariantNumeric: "tabular-nums" }}>
        {a.value_cents > 0 ? euro(a.value_cents) : "Gratis"}
      </span>
      <span style={{ fontSize: 12, color: rateColor(rate), fontWeight: 600, width: 44, textAlign: "right" }}>
        {rate === null ? "–" : `${rate}%`}
      </span>
    </div>
  );
}

function AssetLightbox({ a, onClose, onDeleted }: { a: ModelAsset; onClose: () => void; onDeleted: () => void }) {
  const url = useResolvedUrl(a.url);
  const tm = tierMeta(a.tier);
  const rate = successRate(a);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const remove = async () => {
    if (a.is_placeholder) { toast.info("Test-Asset – wird nicht in der Datenbank gespeichert."); return; }
    const { error } = await deleteAsset(a);
    if (error) toast.error("Löschen fehlgeschlagen: " + error.message);
    else { toast.success("Asset gelöscht"); onDeleted(); }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.8)",
      backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <button onClick={onClose} aria-label="Schließen" style={{
        position: "absolute", top: 18, right: 20, background: "transparent",
        border: "none", color: "#fff", cursor: "pointer",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>

      <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 0, maxWidth: "94vw", alignItems: "stretch" }}>
        <div style={{ display: "grid", placeItems: "center", maxWidth: "60vw" }}>
          {url && (a.media_type === "video"
            ? <video src={url} controls style={{ maxHeight: "80vh", borderRadius: 12 }} />
            : <img src={url} alt={a.description ?? "Asset"} style={{ maxHeight: "80vh", borderRadius: 12 }} />)}
        </div>

        <aside style={{
          width: 384, maxHeight: "80vh", overflowY: "auto", background: CARD_BG,
          padding: 24, borderRadius: "12px", display: "flex", flexDirection: "column", gap: 14,
        }}>
          <p style={{ fontSize: 13, color: "var(--text-subtle)", margin: 0 }}>
            {a.description ?? "Keine Beschreibung hinterlegt."}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ background: tm.gradient, color: "#fff", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999 }}>
              Tier {a.tier} · {tm.label}
            </span>
            <span style={{ background: "#0A0A0B", border: "1px solid #1E1E22", color: "var(--text-subtle)", fontSize: 11, padding: "3px 10px", borderRadius: 999 }}>
              {CATEGORY_LABEL[a.category] ?? a.category}
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, color: "var(--gold, #d4af6a)", fontVariantNumeric: "tabular-nums" }}>
            {a.value_cents > 0 ? euro(a.value_cents) : "Gratis"}
          </div>
          {a.tags.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {a.tags.map(t => (
                <span key={t} style={{
                  fontSize: 11, background: "#0A0A0B", border: "1px solid #1E1E22",
                  color: "var(--text-subtle)", padding: "3px 10px", borderRadius: 999,
                }}>{t}</span>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Stat label="Nutzungen" value={String(a.use_count)} />
            <Stat label="Reaktionen" value={String(a.response_count)} />
            <Stat label="Umsatz" value={euro(a.revenue_total_cents)} />
            <Stat label="Quote" value={rate === null ? "–" : `${rate}%`} color={rateColor(rate)} />
          </div>
          {a.note && (
            <pre style={{
              fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 11.5,
              background: "#0A0A0B", padding: 12, borderRadius: 10, color: "var(--text-subtle)",
              whiteSpace: "pre-wrap", margin: 0,
            }}>{a.note}</pre>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
            <button onClick={remove} style={{
              background: "transparent", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171",
              fontSize: 12.5, padding: "8px 14px", borderRadius: 10, cursor: "pointer",
            }}>Löschen</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
      {children}
    </div>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>;
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "#0A0A0B", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: color ?? "var(--text-strong)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { id: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: CARD_BG, border: "1px solid #1E1E22", borderRadius: 999,
      padding: "6px 12px", fontSize: 11.5, color: "var(--text-subtle)", outline: "none", cursor: "pointer",
    }}>
      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

function EmptyState({ hasAny, onAdd }: { hasAny: boolean; onAdd: () => void }) {
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 10, padding: "70px 20px", textAlign: "center" }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="1.4">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L3 21" />
      </svg>
      <div className="display" style={{ fontSize: 16, color: "var(--text-strong)" }}>
        {hasAny ? "Keine Treffer" : "Noch keine Assets"}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-subtle)" }}>
        {hasAny ? "Passe Suche oder Filter an." : "Lade das erste Bild oder Video hoch."}
      </div>
      {!hasAny && (
        <button onClick={onAdd} style={{
          marginTop: 6, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
          border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
        }}>Asset hinzufügen</button>
      )}
    </div>
  );
}

function Centered({ text }: { text: string }) {
  return <div style={{ display: "grid", placeItems: "center", padding: 60, color: "var(--text-subtle)", fontSize: 12.5 }}>{text}</div>;
}

function rateColor(rate: number | null) {
  if (rate === null) return "var(--text-subtle)";
  if (rate >= 50) return "#4ade80";
  if (rate >= 20) return "#fbbf24";
  return "#f87171";
}

const iconRow: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4 };
