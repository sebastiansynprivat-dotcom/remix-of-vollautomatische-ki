// Content-Ordner: Gruppen-Ansicht, Detail mit Reihenfolge, Vorschau und Abdeckung.
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useContentSets, createContentSet, updateContentSet, deleteContentSet, saveSequence,
  coversTime, TIME_OF_DAY_META, type ContentSetWithAssets, type TimeOfDay,
} from "@/lib/contentSets";
import { euro, TIERS, useResolvedUrl, type ModelAsset } from "@/lib/modelAssets";
import { normalizeStepConfig, getFunnelStages, type FunnelStageConfig } from "@/lib/funnelConfig";
import { AssetUploadModal } from "@/components/cloud/AssetUploadModal";
import { AssetEditPanel } from "@/components/cloud/AssetEditPanel";

import { supabase } from "@/integrations/supabase/client";

const CARD: React.CSSProperties = {
  background: "#131316", border: "1px solid #1E1E22", borderRadius: 12,
};
const FIELD: React.CSSProperties = {
  width: "100%", background: "#0A0A0B", border: "1px solid #1E1E22",
  borderRadius: 10, padding: "9px 12px", color: "var(--text-strong)",
  fontSize: 13, outline: "none", resize: "vertical",
};
const LBL: React.CSSProperties = {
  fontSize: 10.5, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: 0.6,
};

/* ───────────────────────── Icons ───────────────────────── */

const Ico = ({ d, size = 14, ...rest }: { d: string; size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d={d} />
  </svg>
);
const SunIcon = (p: { size?: number }) => (
  <svg width={p.size ?? 12} height={p.size ?? 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const MoonIcon = (p: { size?: number }) => <Ico size={p.size ?? 12} d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />;
const FolderIcon = (p: { size?: number }) => <Ico size={p.size ?? 32} d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />;
const CheckIcon = (p: { size?: number }) => <Ico size={p.size ?? 12} d="m20 6-11 11-5-5" />;
const XIcon = (p: { size?: number }) => <Ico size={p.size ?? 12} d="M18 6 6 18M6 6l12 12" />;
const ChevronRight = () => <Ico size={16} d="m9 18 6-6-6-6" />;
const GripIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
  </svg>
);
const PlayIcon = (p: { size?: number }) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
);

const TOD_ICON: Record<TimeOfDay, React.ReactNode> = {
  day: <SunIcon />, night: <MoonIcon />, any: null,
};

/* ───────────────────────── Root ───────────────────────── */

export function ContentSets({ modelId, stepConfig }: {
  modelId: string;
  stepConfig?: unknown;
}) {
  const { sets, loading, reload } = useContentSets(modelId);
  const [filter, setFilter] = useState<"all" | "day" | "night">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const steps: FunnelStageConfig[] = useMemo(
    () => normalizeStepConfig(stepConfig) ?? getFunnelStages(),
    [stepConfig],
  );

  const visible = useMemo(
    () => (filter === "all" ? sets : sets.filter((s) => coversTime(s, filter))),
    [sets, filter],
  );

  const open = sets.find((s) => s.id === openId) ?? null;

  const addSet = async (name: string, tod: TimeOfDay) => {
    const { data, error } = await createContentSet(modelId, name, tod);
    if (error || !data) { toast.error(error?.message ?? "Anlegen fehlgeschlagen"); return; }
    await reload();
    setCreating(false);
    setOpenId(data.id);
    toast.success("Content-Ordner angelegt");
  };

  if (open) {
    return (
      <SetDetail
        key={open.id}
        modelId={modelId}
        set={open}
        sets={sets}
        steps={steps}
        onBack={() => setOpenId(null)}
        onChanged={reload}
        onDeleted={() => { setOpenId(null); void reload(); }}
      />
    );
  }

  return (
    <div style={{ animation: "sbFadeIn 200ms ease" }}>
      {creating && (
        <SetSettingsDialog
          title="Neuer Content-Ordner"
          initialName=""
          initialTod="any"
          confirmLabel="Ordner anlegen"
          onCancel={() => setCreating(false)}
          onSave={(n, t) => addSet(n, t)}
        />
      )}
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-strong)" }}>Content-Ordner</div>
          <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 3 }}>
            Gruppen von Medien die als Einheit verschickt werden
          </div>
        </div>
        <button onClick={() => setCreating(true)} style={{
          background: "var(--accent-grad)", color: "#fff", border: "none",
          borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
        }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Ordner hinzufügen
        </button>

      </header>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <Pill active={filter === "all"} onClick={() => setFilter("all")}>Alle</Pill>
        <Pill active={filter === "day"} onClick={() => setFilter("day")} icon={<SunIcon size={14} />}>Tagsüber</Pill>
        <Pill active={filter === "night"} onClick={() => setFilter("night")} icon={<MoonIcon size={14} />}>Nachts</Pill>
      </div>

      {loading ? (
        <div style={{ ...CARD, marginTop: 16, padding: 40, textAlign: "center", fontSize: 12.5, color: "var(--text-subtle)" }}>
          Lade Content-Ordner…
        </div>
      ) : visible.length === 0 ? (
        <div style={{ ...CARD, marginTop: 16, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ color: "var(--text-subtle)", display: "grid", placeItems: "center", marginBottom: 12 }}>
            <FolderIcon size={34} />
          </div>
          <div style={{ fontSize: 14, color: "var(--text-strong)", marginBottom: 6 }}>
            {sets.length === 0 ? "Noch keine Content-Ordner" : "Keine Ordner für diese Tageszeit"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>
            Lege einen Ordner an und sortiere die Medien in Versand-Reihenfolge.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 16 }}>
          {visible.map((s) => <SetCard key={s.id} set={s} onOpen={() => setOpenId(s.id)} />)}
        </div>
      )}
    </div>
  );
}

function Pill({ active, onClick, icon, children }: {
  active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999,
      padding: "5px 12px", fontSize: 12, cursor: "pointer",
      background: active ? "rgba(99,102,241,0.10)" : "#131316",
      border: `1px solid ${active ? "rgba(99,102,241,0.22)" : "#1E1E22"}`,
      color: active ? "#A5B4FC" : "var(--text-subtle)",
      transition: "all 150ms ease",
    }}>
      {icon}{children}
    </button>
  );
}

/* ───────────────────────── Karte ───────────────────────── */

function SetCard({ set, onOpen }: { set: ContentSetWithAssets; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  const cover = useResolvedUrl(set.cover_url ?? set.assets[0]?.thumbnail_url ?? set.assets[0]?.url ?? null);
  
  const tod = TIME_OF_DAY_META[set.time_of_day];
  const sent = set.assets.reduce((n, a) => n + (a.use_count ?? 0), 0);

  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...CARD, overflow: "hidden", textAlign: "left", cursor: "pointer", padding: 0,
        borderColor: hover ? "#2A2A30" : "#1E1E22", transition: "border-color 150ms ease",
      }}
    >
      <div style={{ position: "relative", height: 128, background: "#18181D" }}>
        {cover ? (
          <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%", display: "grid", placeItems: "center",
            background: "linear-gradient(135deg,#18181D,#131316)", color: "var(--text-subtle)",
          }}>
            <FolderIcon size={32} />
          </div>
        )}



        <span style={{
          position: "absolute", top: 8, right: 8, display: "inline-flex", alignItems: "center", gap: 4,
          borderRadius: 999, padding: "2px 8px", fontSize: 11,
          background: tod.bg, border: `1px solid ${tod.border}`, color: tod.color,
          backdropFilter: "blur(6px)",
        }}>
          {TOD_ICON[set.time_of_day]}{tod.label}
        </span>

        <span style={{
          position: "absolute", bottom: 8, left: 8, fontSize: 11, borderRadius: 6,
          padding: "2px 8px", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
          color: "var(--text-strong)",
        }}>
          {set.assets.length} {set.assets.length === 1 ? "Medium" : "Medien"}
        </span>
      </div>

      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {set.name}
        </div>
        {set.description && (
          <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {set.description}
          </div>
        )}
        <div style={{ fontSize: 13, color: "var(--money)", fontVariantNumeric: "tabular-nums", marginTop: 5 }}>
          {euro(set.price_cents)}
        </div>

        {set.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {set.tags.map((t) => (
              <span key={t} style={{
                borderRadius: 999, background: "var(--surface-3)", color: "var(--text-subtle)",
                fontSize: 11, padding: "2px 8px",
              }}>{t}</span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, color: "var(--text-subtle)" }}>
          <span style={{ fontSize: 11.5 }}>{sent}× gesendet</span>
          <ChevronRight />
        </div>
      </div>
    </button>
  );
}

/* ───────────────────────── Abdeckung ───────────────────────── */

function CoverageBar({ sets, steps }: { sets: ContentSetWithAssets[]; steps: FunnelStageConfig[] }) {
  const covered = steps.map((s) => ({
    step: s,
    ok: sets.some((x) => x.is_active && x.price_cents === Math.round(s.priceEur * 100) && x.assets.length > 0),
  }));
  const count = covered.filter((c) => c.ok).length;
  const ratio = steps.length ? count / steps.length : 0;
  const color = ratio === 1 ? "#34D399" : ratio >= 0.5 ? "#FBBF24" : "#F87171";

  const dayOk = sets.some((s) => s.is_active && coversTime(s, "day"));
  const nightOk = sets.some((s) => s.is_active && coversTime(s, "night"));

  return (
    <div style={{ ...CARD, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)" }}>Content-Abdeckung</span>
        <span style={{ fontSize: 11.5, color }}>{count}/{steps.length} Stufen abgedeckt</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {covered.map(({ step, ok }) => (
          <span key={step.id} style={{
            display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999,
            padding: "3px 10px", fontSize: 11.5,
            background: ok ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
            border: `1px solid ${ok ? "rgba(16,185,129,0.20)" : "rgba(239,68,68,0.20)"}`,
            color: ok ? "#6EE7B7" : "#FCA5A5",
          }}>
            {ok ? <CheckIcon /> : <XIcon />}{step.priceEur}€
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>Tageszeiten:</span>
        <TodCoverage ok={dayOk} icon={<SunIcon />} label="Tagsüber" />
        <TodCoverage ok={nightOk} icon={<MoonIcon />} label="Nachts" />
      </div>
    </div>
  );
}

function TodCoverage({ ok, icon, label }: { ok: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999,
      padding: "3px 10px", fontSize: 11.5,
      background: ok ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
      border: `1px solid ${ok ? "rgba(16,185,129,0.20)" : "rgba(239,68,68,0.20)"}`,
      color: ok ? "#6EE7B7" : "#FCA5A5",
    }}>
      {icon}{label}{ok ? <CheckIcon /> : <XIcon />}
    </span>
  );
}

/* ───────────────────────── Detail ───────────────────────── */

function SetDetail({ modelId, set, sets, steps, onBack, onChanged, onDeleted }: {
  modelId: string;
  set: ContentSetWithAssets;
  sets: ContentSetWithAssets[];
  steps: FunnelStageConfig[];
  onBack: () => void;
  onChanged: () => void | Promise<void>;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState({
    name: set.name,
    description: set.description ?? "",
    price: String(set.price_cents / 100),
    time_of_day: set.time_of_day,
    
    tags: set.tags,
  });
  const [tagDraft, setTagDraft] = useState("");
  const [order, setOrder] = useState<ModelAsset[]>(set.assets);
  const [dragId, setDragId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);


  const patch = (p: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...p }));

  const save = async () => {
    setSaving(true);
    const { error } = await updateContentSet(set.id, {
      name: draft.name.trim() || "Unbenannt",
      description: draft.description.trim() || null,
      price_cents: Math.max(0, Math.round(Number(draft.price.replace(",", ".")) * 100 || 0)),
      time_of_day: draft.time_of_day,
      tags: draft.tags,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await onChanged();
    toast.success("Ordner gespeichert");
  };

  const removeSet = async () => {
    if (!confirm(`Ordner „${set.name}" wirklich löschen?`)) return;
    const { error } = await deleteContentSet(set.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Ordner gelöscht");
    onDeleted();
  };

  const detach = async (assetId: string) => {
    setOrder((o) => o.filter((a) => a.id !== assetId));
    await supabase.from("model_assets").update({ set_id: null } as never).eq("id", assetId);
    await onChanged();
  };

  const drop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = [...order];
    const from = next.findIndex((a) => a.id === dragId);
    const to = next.findIndex((a) => a.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    setOrder(next);
    setDragId(null);
    await saveSequence(next.map((a) => a.id));
    await onChanged();
  };

  const setAssetTier = async (assetId: string, tier: number) => {
    setOrder((o) => o.map((a) => (a.id === assetId ? { ...a, tier } : a)));
    const { error } = await supabase.from("model_assets").update({ tier } as never).eq("id", assetId);
    if (error) { toast.error(error.message); return; }
    await onChanged();
  };


  return (
    <div style={{ animation: "sbSlideInRight 200ms ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <button onClick={onBack} style={{
            background: "transparent", border: "none", color: "var(--text)", fontSize: 12.5, cursor: "pointer",
          }}>← Content-Ordner</button>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {draft.name || "Unbenannt"}
          </span>
        </div>
        <div style={{ display: "inline-flex", gap: 8 }}>
          <button onClick={save} disabled={saving} style={{
            background: "transparent", border: "1px solid #1E1E22", borderRadius: 9,
            color: "var(--text)", fontSize: 12.5, padding: "7px 14px", cursor: "pointer",
          }}>{saving ? "Speichert…" : "Speichern"}</button>
          <button onClick={removeSet} aria-label="Ordner löschen" style={{
            background: "transparent", border: "1px solid #1E1E22", borderRadius: 9,
            color: "var(--text-subtle)", padding: "7px 10px", cursor: "pointer",
          }}>
            <Ico size={16} d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
          </button>
        </div>
      </div>

      <CoverageBar sets={sets} steps={steps} />

      <div style={{ ...CARD, padding: 16, marginTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={LBL}>Name</span>
            <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} style={FIELD} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={LBL}>Preis (€)</span>
            <input value={draft.price} onChange={(e) => patch({ price: e.target.value })} inputMode="decimal"
              style={{ ...FIELD, color: "var(--money)", fontVariantNumeric: "tabular-nums" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={LBL}>Tageszeit</span>
            <select value={draft.time_of_day} onChange={(e) => patch({ time_of_day: e.target.value as TimeOfDay })} style={FIELD}>
              <option value="day">Tagsüber</option>
              <option value="night">Nachts</option>
              <option value="any">Jederzeit</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
            <span style={LBL}>Beschreibung</span>
            <textarea rows={2} value={draft.description} onChange={(e) => patch({ description: e.target.value })} style={FIELD} />
          </label>
          <div style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
            <span style={LBL}>Tags</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {draft.tags.map((t) => (
                <span key={t} style={{
                  display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11,
                  background: "#0A0A0B", border: "1px solid #1E1E22", color: "var(--text-strong)",
                  padding: "3px 10px", borderRadius: 999,
                }}>
                  {t}
                  <button onClick={() => patch({ tags: draft.tags.filter((x) => x !== t) })}
                    style={{ background: "transparent", border: "none", color: "var(--text-subtle)", cursor: "pointer", lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const t = tagDraft.trim().toLowerCase();
                if (t && !draft.tags.includes(t)) patch({ tags: [...draft.tags, t] });
                setTagDraft("");
              }}
              placeholder="Tag eingeben und Enter" style={FIELD} />
          </div>
        </div>
      </div>

      <section style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-strong)" }}>Medien in diesem Ordner</div>
            <div style={{ fontSize: 11.5, color: "var(--text-subtle)", marginTop: 2 }}>
              Reihenfolge festlegen — so werden sie verschickt
            </div>
          </div>
          <button onClick={() => setUploading(true)} style={{
            background: "var(--surface-3)", border: "1px solid #1E1E22", borderRadius: 9,
            color: "var(--text-strong)", fontSize: 12.5, padding: "7px 13px", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ lineHeight: 1 }}>+</span> Medium hinzufügen
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {order.length === 0 ? (
            <div style={{ ...CARD, padding: 28, textAlign: "center", fontSize: 12.5, color: "var(--text-subtle)" }}>
              Noch keine Medien in diesem Ordner.
            </div>
          ) : order.map((a, i) => (
            <MediaRow
              key={a.id} asset={a} index={i}
              onDragStart={() => setDragId(a.id)}
              onDrop={() => void drop(a.id)}
              onRemove={() => void detach(a.id)}
              onTier={(t) => void setAssetTier(a.id, t)}
              onEdit={() => setEditingId(a.id)}
            />
          ))}

        </div>
      </section>

      <SetPreview assets={order} priceCents={Math.max(0, Math.round(Number(draft.price.replace(",", ".")) * 100 || 0))} />

      {uploading && (
        <AssetUploadModal
          modelId={modelId}
          setId={set.id}
          sequenceOrder={order.length}
          onClose={() => setUploading(false)}
          onSaved={() => { void onChanged(); }}
        />
      )}

      {editingId && order.some((a) => a.id === editingId) && (
        <AssetEditPanel
          asset={order.find((a) => a.id === editingId)!}
          onClose={() => { setEditingId(null); void onChanged(); }}
          onSaved={(patch) => setOrder((o) => o.map((a) => (a.id === editingId ? { ...a, ...patch } : a)))}
        />
      )}
    </div>
  );
}


function MediaRow({ asset, index, onDragStart, onDrop, onRemove, onTier, onEdit }: {
  asset: ModelAsset; index: number;
  onDragStart: () => void; onDrop: () => void; onRemove: () => void;
  onTier: (tier: number) => void;
  onEdit: () => void;
}) {

  const thumb = useResolvedUrl(asset.thumbnail_url ?? asset.url);
  const [over, setOver] = useState(false);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop(); }}
      style={{
        background: "#18181D", border: `1px solid ${over ? "var(--accent)" : "#1E1E22"}`,
        borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 12,
        transition: "border-color 150ms ease",
      }}
    >
      <span style={{ color: "var(--text-subtle)", cursor: "grab", display: "grid" }}><GripIcon /></span>
      <span style={{
        width: 24, height: 24, borderRadius: 999, background: "var(--surface-3)",
        display: "grid", placeItems: "center", fontSize: 11, fontWeight: 500, color: "var(--text-strong)",
        flexShrink: 0,
      }}>{index + 1}</span>

      <div onClick={onEdit} title="Bearbeiten" style={{
        width: 64, height: 64, borderRadius: 8, overflow: "hidden", flexShrink: 0,
        background: "#0A0A0B", display: "grid", placeItems: "center", color: "var(--text-subtle)",
        position: "relative", cursor: "pointer",
      }}>

        {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <FolderIcon size={18} />}
        {asset.media_type === "video" && (
          <span style={{ position: "absolute", color: "#fff", opacity: 0.9 }}><PlayIcon /></span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div onClick={onEdit} title="Bearbeiten" style={{ fontSize: 13, color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>
          {asset.description || "Ohne Beschreibung"}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>
            {asset.media_type === "video" ? "Video" : "Foto"} · Stufe
          </span>
          {TIERS.map((t) => {
            const active = asset.tier === t.level;
            return (
              <button
                key={t.level}
                title={t.label}
                onClick={() => onTier(t.level)}
                style={{
                  width: 22, height: 22, borderRadius: 999, cursor: "pointer", fontSize: 10.5, fontWeight: 600,
                  color: active ? "#fff" : "var(--text-subtle)",
                  background: active ? t.gradient : "transparent",
                  border: `1px solid ${active ? "transparent" : "#1E1E22"}`,
                  transition: "all 150ms ease",
                }}
              >{t.level}</button>
            );
          })}
        </div>
      </div>


      <span style={{ fontSize: 11.5, color: "var(--money)", fontVariantNumeric: "tabular-nums" }}>
        {euro(asset.value_cents)}
      </span>
      <button onClick={onEdit} aria-label="Medium bearbeiten" title="Bearbeiten" style={{
        background: "transparent", border: "none", color: "var(--text-subtle)", cursor: "pointer", display: "grid",
      }}><Ico size={16} d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></button>

      <button onClick={onRemove} aria-label="Aus Ordner entfernen" style={{
        background: "transparent", border: "none", color: "var(--text-subtle)", cursor: "pointer", display: "grid",
      }}><XIcon size={16} /></button>
    </div>
  );
}

/* ───────────────────────── Vorschau ───────────────────────── */

function SetPreview({ assets, priceCents }: { assets: ModelAsset[]; priceCents: number }) {
  if (assets.length === 0) return null;
  return (
    <div style={{ borderTop: "1px solid #1E1E22", marginTop: 18, paddingTop: 18 }}>
      <div style={{ ...LBL, marginBottom: 12 }}>Vorschau</div>
      <div style={{ maxWidth: 384, display: "flex", flexDirection: "column", gap: 8 }}>
        {assets.map((a, i) => (
          <div key={a.id}>
            <PreviewBubble asset={a} priceCents={priceCents} />
            {i < assets.length - 1 && (
              <div style={{ fontSize: 11, color: "var(--text-subtle)", margin: "6px 0 0 4px" }}>
                {`14:${String(32 + i * 3).padStart(2, "0")}`} → {`14:${String(35 + i * 3).padStart(2, "0")}`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewBubble({ asset, priceCents }: { asset: ModelAsset; priceCents: number }) {
  const thumb = useResolvedUrl(asset.thumbnail_url ?? asset.url);
  return (
    <div style={{
      background: "#18181D", borderRadius: 12, borderBottomLeftRadius: 4, padding: 12,
      borderLeft: "2px solid var(--accent)",
    }}>
      {asset.media_type === "video" || !thumb ? (
        <div style={{
          background: "#0A0A0B", height: 80, borderRadius: 8,
          display: "grid", placeItems: "center", color: "var(--text-subtle)",
        }}><PlayIcon size={20} /></div>
      ) : (
        <img src={thumb} alt="" style={{ width: "100%", maxHeight: 128, objectFit: "cover", borderRadius: 8 }} />
      )}
      <div style={{ fontSize: 13, color: "var(--text)", marginTop: 8 }}>
        {asset.description || asset.note || "…"}
      </div>
      {priceCents > 0 && (
        <div style={{ fontSize: 11.5, color: "var(--money)", fontVariantNumeric: "tabular-nums", marginTop: 6 }}>
          {euro(priceCents)}
        </div>
      )}
    </div>
  );
}

export { TIERS };
