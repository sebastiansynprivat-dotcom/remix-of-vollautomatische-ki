import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Asset = { id: string; title: string | null; kind: string; thumbnail_url: string | null; external_url: string | null };
type PpvSet = {
  id: string;
  model_id: string;
  title: string;
  caption: string | null;
  price_cents: number;
  media_type: string;
  media_count: number;
  cover_url: string | null;
  tags: string[];
  asset_ids: string[];
  times_sent: number;
  times_purchased: number;
};

const GLASS: React.CSSProperties = {
  background: "linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
  backdropFilter: "blur(22px) saturate(160%)",
  borderRadius: 18,
};
const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
  background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(255,255,255,0.1)", outline: "none",
};

export function ModelSetsManager({ modelId, compact }: { modelId: string; compact?: boolean }) {
  const [sets, setSets] = useState<PpvSet[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [editing, setEditing] = useState<PpvSet | "new" | null>(null);

  const reload = async () => {
    if (!modelId) return;
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("ppv_templates").select("*").eq("model_id", modelId).order("created_at", { ascending: false }),
      supabase.from("media_assets").select("id, title, kind, thumbnail_url, external_url").eq("model_id", modelId),
    ]);
    setSets((s ?? []) as PpvSet[]);
    setAssets((a ?? []) as Asset[]);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [modelId]);

  const remove = async (id: string) => {
    if (!confirm("Set wirklich löschen?")) return;
    await supabase.from("ppv_templates").delete().eq("id", id);
    reload();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>
          {sets.length} {sets.length === 1 ? "Set" : "Sets"} · KI nutzt diese für PPV-Vorschläge.
        </div>
        <button onClick={() => setEditing("new")} style={{
          padding: "9px 16px", borderRadius: 11, fontSize: 12.5, fontWeight: 700,
          background: "linear-gradient(135deg, #f6d36a, #b8893a)", color: "#1a1208",
          border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
          boxShadow: "0 10px 24px rgba(212,175,80,0.3)",
        }}>+ Neues Set</button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: compact ? "repeat(auto-fill, minmax(220px, 1fr))" : "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 14,
      }}>
        {sets.length === 0 && (
          <div style={{ ...GLASS, padding: 24, color: "rgba(255,255,255,0.5)", gridColumn: "1 / -1", textAlign: "center", fontSize: 13 }}>
            Noch keine Sets. Lege das erste an.
          </div>
        )}
        {sets.map((s) => (
          <article key={s.id} style={{ ...GLASS, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{
              aspectRatio: "16/10",
              background: s.cover_url ? `center/cover url(${s.cover_url})` : "linear-gradient(135deg, rgba(212,175,80,0.18), rgba(140,40,70,0.22))",
              position: "relative",
            }}>
              <span style={{
                position: "absolute", top: 10, left: 10,
                padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,232,170,0.95)", backdropFilter: "blur(6px)",
              }}>{s.media_type} · {s.media_count}</span>
              <span style={{
                position: "absolute", top: 10, right: 10,
                padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800,
                background: "linear-gradient(135deg, #f6d36a, #b8893a)", color: "#1a1208",
              }}>{(s.price_cents / 100).toFixed(2)} €</span>
            </div>
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>{s.title}</h3>
              {s.caption && <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{s.caption}</p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "auto", paddingTop: 8 }}>
                {(s.tags ?? []).map((t) => (
                  <span key={t} style={{
                    padding: "2px 8px", borderRadius: 999, fontSize: 10.5,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.7)",
                  }}>{t}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button onClick={() => setEditing(s)} style={{
                  flex: 1, padding: "8px 12px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                  background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                }}>Bearbeiten</button>
                <button onClick={() => remove(s.id)} style={{
                  padding: "8px 12px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                  background: "rgba(220,80,80,0.1)", color: "#f08a8a",
                  border: "1px solid rgba(220,80,80,0.25)", cursor: "pointer",
                }}>Löschen</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <SetEditor
          modelId={modelId}
          assets={assets}
          initial={editing === "new" ? null : editing}
          onClose={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}

function SetEditor({
  modelId, assets, initial, onClose,
}: { modelId: string; assets: Asset[]; initial: PpvSet | null; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [caption, setCaption] = useState(initial?.caption ?? "");
  const [priceEur, setPriceEur] = useState((initial?.price_cents ?? 999) / 100);
  const [mediaType, setMediaType] = useState(initial?.media_type ?? "gallery");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [assetIds, setAssetIds] = useState<string[]>(initial?.asset_ids ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mediaCount = useMemo(() => Math.max(1, assetIds.length || 1), [assetIds.length]);

  const toggle = (id: string) =>
    setAssetIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);

  const save = async () => {
    setErr(null);
    if (!title.trim()) { setErr("Titel ist Pflicht."); return; }
    setBusy(true);
    try {
      const payload = {
        model_id: modelId,
        title: title.trim(),
        caption: caption.trim() || null,
        price_cents: Math.round(priceEur * 100),
        media_type: mediaType,
        media_count: mediaCount,
        cover_url: coverUrl.trim() || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        asset_ids: assetIds,
      };
      const { error } = initial
        ? await supabase.from("ppv_templates").update(payload).eq("id", initial.id)
        : await supabase.from("ppv_templates").insert(payload);
      if (error) throw error;
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(6,4,10,0.75)", backdropFilter: "blur(12px)",
      zIndex: 60, display: "grid", placeItems: "center", padding: 20, overflow: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        ...GLASS, padding: 26, width: "min(720px, 100%)", maxHeight: "90vh", overflow: "auto",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>{initial ? "Set bearbeiten" : "Neues Set"}</h2>

        <Label text="Titel">
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={input} placeholder="z. B. Pool-Set 6 Bilder" />
        </Label>
        <Label text="Caption (Verkaufstext)">
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} style={{ ...input, minHeight: 64, resize: "vertical" }} placeholder="Ich war heute am Pool 🥵 …" />
        </Label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Label text="Preis (€)">
            <input type="number" min={0} step={0.5} value={priceEur} onChange={(e) => setPriceEur(parseFloat(e.target.value) || 0)} style={input} />
          </Label>
          <Label text="Media-Type">
            <select value={mediaType} onChange={(e) => setMediaType(e.target.value)} style={input}>
              {["photo", "video", "gallery", "audio"].map((t) => (
                <option key={t} value={t} style={{ background: "#1a1010" }}>{t}</option>
              ))}
            </select>
          </Label>
        </div>

        <Label text="Cover-URL">
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} style={input} placeholder="https://…" />
        </Label>
        <Label text="Tags (Komma-getrennt)">
          <input value={tags} onChange={(e) => setTags(e.target.value)} style={input} placeholder="outdoor, set, soft" />
        </Label>

        <Label text={`Assets aus Cloud (${assetIds.length} gewählt)`}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8,
            maxHeight: 260, overflow: "auto", padding: 8,
            background: "rgba(0,0,0,0.25)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)",
          }}>
            {assets.length === 0 && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Keine Assets in der Cloud.</span>}
            {assets.map((a) => {
              const on = assetIds.includes(a.id);
              const thumb = a.thumbnail_url || a.external_url || "";
              return (
                <button key={a.id} onClick={() => toggle(a.id)} type="button" style={{
                  aspectRatio: "1", borderRadius: 10, padding: 0, cursor: "pointer",
                  background: thumb ? `center/cover url(${thumb})` : "rgba(255,255,255,0.06)",
                  border: on ? "2px solid #f6d36a" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: on ? "0 0 0 3px rgba(246,211,106,0.25)" : "none",
                  position: "relative",
                }}>
                  {on && <span style={{
                    position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 999,
                    background: "#f6d36a", color: "#1a1208", fontSize: 11, fontWeight: 800,
                    display: "grid", placeItems: "center",
                  }}>✓</span>}
                </button>
              );
            })}
          </div>
        </Label>

        {err && <div style={{ color: "#f08a8a", fontSize: 12 }}>{err}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 6 }}>
          <button onClick={onClose} style={{
            padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
          }}>Abbrechen</button>
          <button disabled={busy} onClick={save} style={{
            padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: "linear-gradient(135deg, #f6d36a, #b8893a)", color: "#1a1208",
            border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
          }}>{busy ? "…" : "Speichern"}</button>
        </div>
      </div>
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.55)" }}>{text}</span>
      {children}
    </label>
  );
}
