import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES, CATEGORY_LABEL, TIERS, tierMeta, uploadAssetFile, resolveAssetUrl,
} from "@/lib/modelAssets";

interface Props {
  modelId: string;
  onClose: () => void;
  onSaved: () => void;
}

const panel: React.CSSProperties = {
  width: "min(680px, 94vw)", maxHeight: "92vh", overflowY: "auto",
  background: "#131316", border: "1px solid #1E1E22", borderRadius: 14,
  boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
};

const field: React.CSSProperties = {
  width: "100%", background: "#0A0A0B", border: "1px solid #1E1E22",
  borderRadius: 10, padding: "10px 12px", color: "var(--text-strong)",
  fontSize: 13, outline: "none", resize: "vertical",
};

export function AssetUploadModal({ modelId, onClose, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState(1);
  const [category, setCategory] = useState<string>("portrait");
  const [valueEur, setValueEur] = useState("0");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const pick = (f: File | null) => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { toast.error("Datei ist größer als 50 MB."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  };

  const save = async () => {
    if (!file) { toast.error("Bitte zuerst eine Datei auswählen."); return; }
    setSaving(true);
    try {
      const { path, mediaType } = await uploadAssetFile(file, modelId);
      const { error } = await supabase.from("model_assets").insert({
        model_id: modelId,
        url: path,
        thumbnail_url: path,
        media_type: mediaType,
        description: description.trim() || null,
        tier,
        category,
        tags,
        value_cents: Math.max(0, Math.round(Number(valueEur.replace(",", ".")) * 100 || 0)),
        note: note.trim() || null,
      });
      if (error) throw error;
      await resolveAssetUrl(path);
      toast.success("Asset hinzugefügt");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Speichern fehlgeschlagen: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const tm = tierMeta(tier);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(14px)", display: "grid", placeItems: "center", padding: 16,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={panel}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid #1E1E22",
        }}>
          <div className="display" style={{ fontSize: 16, fontWeight: 600, color: "var(--text-strong)" }}>
            Neues Asset hinzufügen
          </div>
          <button onClick={onClose} aria-label="Schließen" style={{
            background: "transparent", border: "none", color: "var(--text-subtle)", cursor: "pointer",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0] ?? null); }}
            style={{
              border: `1.5px dashed ${dragging ? "rgba(99,102,241,0.5)" : "#2A2A30"}`,
              background: dragging ? "rgba(99,102,241,0.05)" : "transparent",
              borderRadius: 14, padding: preview ? 16 : 44, textAlign: "center", cursor: "pointer",
              transition: "all .15s ease",
            }}
          >
            {preview ? (
              file?.type.startsWith("video") ? (
                <video src={preview} style={{ maxHeight: 220, borderRadius: 10, margin: "0 auto" }} controls />
              ) : (
                <img src={preview} alt="Vorschau" style={{ maxHeight: 220, borderRadius: 10, margin: "0 auto" }} />
              )
            ) : (
              <>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="1.6" style={{ margin: "0 auto 10px" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <div style={{ fontSize: 13, color: "var(--text-strong)" }}>Datei hier ablegen oder klicken</div>
                <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 4 }}>JPG, PNG, MP4 — max 50 MB</div>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/mp4" hidden
              onChange={e => pick(e.target.files?.[0] ?? null)} />
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={lbl}>Beschreibung</span>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Beschreibe was im Bild oder Video zu sehen ist" style={field} />
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={lbl}>Tier</span>
              <span style={{
                background: tm.gradient, color: "#fff", fontSize: 11, fontWeight: 600,
                padding: "2px 10px", borderRadius: 999,
              }}>{tier} · {tm.label}</span>
            </div>
            <input type="range" min={1} max={5} step={1} value={tier}
              onChange={e => setTier(Number(e.target.value))}
              style={{
                width: "100%", accentColor: "#7c3aed",
                background: "#1E1E22", borderRadius: 999,
              }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-subtle)" }}>
              {TIERS.map(t => <span key={t.level}>{t.label}</span>)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={lbl}>Kategorie</span>
              <select value={category} onChange={e => setCategory(e.target.value)} style={field}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={lbl}>Wert (€)</span>
              <input value={valueEur} onChange={e => setValueEur(e.target.value)} inputMode="decimal"
                placeholder="0 für gratis, oder Wert in Euro"
                style={{ ...field, color: "var(--gold, #d4af6a)" }} />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={lbl}>Notiz (optional)</span>
            <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Optionale Notiz für die KI"
              style={{ ...field, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }} />
          </label>

          <div style={{ display: "grid", gap: 6 }}>
            <span style={lbl}>Tags</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tags.map(t => (
                <span key={t} style={{
                  display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11,
                  background: "#0A0A0B", border: "1px solid #1E1E22", color: "var(--text-strong)",
                  padding: "4px 10px", borderRadius: 999,
                }}>
                  {t}
                  <button onClick={() => setTags(tags.filter(x => x !== t))} style={{
                    background: "transparent", border: "none", color: "var(--text-subtle)", cursor: "pointer", lineHeight: 1,
                  }}>×</button>
                </span>
              ))}
            </div>
            <input value={tagDraft} onChange={e => setTagDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Tag eingeben und Enter" style={field} />
          </div>
        </div>

        <footer style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "14px 20px", borderTop: "1px solid #1E1E22",
        }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: "var(--text-subtle)",
            fontSize: 13, padding: "8px 14px", borderRadius: 10, cursor: "pointer",
          }}>Abbrechen</button>
          <button onClick={save} disabled={saving || !file} style={{
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
            border: "none", fontSize: 13, fontWeight: 600, padding: "9px 18px",
            borderRadius: 10, cursor: saving || !file ? "not-allowed" : "pointer",
            opacity: saving || !file ? 0.6 : 1,
          }}>{saving ? "Speichert…" : "Speichern"}</button>
        </footer>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  fontSize: 11, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: 0.6,
};
