// Steckbrief-Upload: PDF per Drag & Drop → KI-Extraktion → Vorschau → Übernehmen.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Physical = {
  height_cm?: number | null; weight?: string | null; shoe_size?: string | null;
  bra_size?: string | null; hair_color_natural?: string | null;
};
type Favorites = { food?: string | null; music?: string | null; movie?: string | null; color?: string | null };

export type ExtractedProfile = {
  display_name?: string | null;
  age?: number | null;
  birthday?: string | null;
  location?: string | null;
  birthplace?: string | null;
  job?: string | null;
  relationship_status?: string | null;
  dream?: string | null;
  hobbies?: string[] | null;
  content_info?: string | null;
  no_gos?: string | null;
  additional_info?: string | null;
  physical?: Physical | null;
  favorites?: Favorites | null;
};

const EMPTY_MARKERS = ["", "-", "—", "keine angabe", "(keine angabe)", "n/a", "null"];

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "string") return EMPTY_MARKERS.includes(v.trim().toLowerCase());
  if (typeof v === "object") return Object.values(v as object).every(isEmpty);
  return false;
}

function display(v: unknown): string {
  if (isEmpty(v)) return "— (leer)";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function trunc(v: unknown, n = 100): string {
  if (isEmpty(v)) return "— (leer)";
  const s = String(v);
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

type Group = { title: string; rows: { label: string; value: unknown }[] };

function buildGroups(d: ExtractedProfile): Group[] {
  const p = d.physical ?? {};
  const f = d.favorites ?? {};
  return [
    {
      title: "Persönliche Informationen",
      rows: [
        { label: "Name", value: d.display_name },
        { label: "Alter", value: d.age },
        { label: "Geburtstag", value: d.birthday },
        { label: "Wohnort", value: d.location },
        { label: "Geburtsort", value: d.birthplace },
        { label: "Beruf", value: d.job },
        { label: "Beziehung", value: d.relationship_status },
        { label: "Traum", value: d.dream },
      ],
    },
    {
      title: "Physische Merkmale",
      rows: [
        { label: "Größe (cm)", value: p.height_cm },
        { label: "BH-Größe", value: p.bra_size },
        { label: "Schuhgröße", value: p.shoe_size },
        { label: "Haarfarbe", value: p.hair_color_natural },
        { label: "Gewicht", value: p.weight },
      ],
    },
    {
      title: "Lieblings-Sachen",
      rows: [
        { label: "Essen", value: f.food },
        { label: "Musik", value: f.music },
        { label: "Film", value: f.movie },
        { label: "Farbe", value: f.color },
      ],
    },
    { title: "Hobbys", rows: [{ label: "Hobbys", value: d.hobbies }] },
    { title: "Content-Informationen", rows: [{ label: "Content", value: d.content_info }] },
    { title: "No-Gos", rows: [{ label: "No-Gos", value: d.no_gos }] },
    { title: "Zusätzliche Informationen", rows: [{ label: "Notizen", value: d.additional_info }] },
  ];
}

const LONG_LABELS = new Set(["Content", "No-Gos", "Notizen"]);

export function SteckbriefUpload({ modelId, current, onApply }: {
  modelId: string;
  current?: ExtractedProfile | null;
  onApply: (fields: Record<string, unknown>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [data, setData] = useState<ExtractedProfile | null>(null);
  const [closing, setClosing] = useState(false);
  const [imported, setImported] = useState(false);
  const [showStored, setShowStored] = useState(false);


  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error("Bitte eine PDF-Datei hochladen");
      return;
    }
    setFileInfo({ name: file.name, size: file.size });
    setData(null);
    setImported(false);
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/public/extract-profile", {
        method: "POST",
        headers: sess.session?.access_token
          ? { Authorization: `Bearer ${sess.session.access_token}` }
          : undefined,
        body: form,
      });
      const json = await res.json() as { ok: boolean; data?: ExtractedProfile; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        toast.error(`Extraktion fehlgeschlagen: ${json.error ?? res.status}`);
        setFileInfo(null);
        return;
      }
      setData(json.data);
    } catch (e) {
      toast.error(`Upload fehlgeschlagen: ${(e as Error).message}`);
      setFileInfo(null);
    } finally {
      setBusy(false);
    }
  };

  const close = (cb?: () => void) => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setData(null);
      setFileInfo(null);
      cb?.();
    }, 200);
  };

  const apply = async () => {
    if (!data) return;
    const patch: Record<string, unknown> = {};
    const put = (k: string, v: unknown) => { if (!isEmpty(v)) patch[k] = v; };
    put("display_name", data.display_name);
    put("age", data.age);
    put("birthday", data.birthday);
    put("location", data.location);
    put("birthplace", data.birthplace);
    put("job", data.job);
    put("relationship_status", data.relationship_status);
    put("dream", data.dream);
    put("hobbies", data.hobbies);
    put("content_info", data.content_info);
    put("no_gos", data.no_gos);
    put("additional_info", data.additional_info);
    put("physical", data.physical);
    put("favorites", data.favorites);

    const count = Object.keys(patch).length;
    const { error } = await supabase.from("model_profiles").update(patch as never).eq("id", modelId);
    if (error) { toast.error(error.message); return; }
    onApply(patch);
    toast.success(`Steckbrief übernommen — ${count} Felder ausgefüllt`);
    close(() => setImported(true));
  };

  const groups = data ? buildGroups(data) : [];
  const allRows = groups.flatMap((g) => g.rows);
  const filled = allRows.filter((r) => !isEmpty(r.value)).length;

  if (data) {
    return (
      <div className="sb-panel" style={{ animation: closing ? "sbSlideUp 200ms ease forwards" : "sbSlideDown 200ms ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ color: "hsl(152 55% 62%)", fontSize: 18, lineHeight: 1 }}>✓</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "hsl(152 55% 72%)" }}>Steckbrief verarbeitet</div>
            <div className="module-desc" style={{ margin: "3px 0 0" }}>
              {filled} von {allRows.length} Feldern ausgefüllt
              {fileInfo && ` · ${fileInfo.name} · ${Math.round(fileInfo.size / 1024)} KB`}
            </div>
          </div>
          <div style={{ display: "inline-flex", gap: 8 }}>
            <button onClick={apply} className="shex-btn shex-btn-primary" style={{ padding: "8px 16px" }}>Übernehmen</button>
            <button onClick={() => close(() => toast("Steckbrief verworfen"))} className="shex-btn shex-btn-ghost" style={{ fontSize: 11 }}>Verwerfen</button>
          </div>
        </div>

        <div style={{ maxHeight: 384, overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {groups.map((g) => (
            <div key={g.title}>
              <div className="kpi-label" style={{ color: "var(--text-subtle)", marginBottom: 8 }}>{g.title}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {g.rows.map((r) => (
                  <div key={r.label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span className="shex-field-label" style={{ width: 96, flexShrink: 0, marginTop: 2 }}>{r.label}</span>
                    <span style={{
                      flex: 1, fontSize: 13,
                      color: isEmpty(r.value) ? "var(--text-subtle)" : "var(--text-strong)",
                    }}>
                      {LONG_LABELS.has(r.label) ? trunc(r.value) : display(r.value)}
                    </span>
                    <span style={{ fontSize: 12, color: isEmpty(r.value) ? "var(--text-subtle)" : "hsl(152 55% 62%)" }}>
                      {isEmpty(r.value) ? "–" : "✓"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        onClick={() => { if (!busy) inputRef.current?.click(); }}
        className={`sb-drop${dragOver ? " sb-drop-over" : ""}${hover && !dragOver && !busy ? " sb-drop-hover" : ""}`}
      >
        {busy ? (
          <>
            <div className="sb-spinner" />
            <div style={{ fontSize: 13, color: "var(--text-secondary, hsl(0 0% 72%))", marginTop: 12 }}>Wird verarbeitet…</div>
            <div className="sb-progress"><span /></div>
          </>
        ) : (
          <>
            <div className="sb-drop-icon">{dragOver ? "⤓" : "⇪"}</div>
            {dragOver ? (
              <div style={{ fontSize: 13, fontWeight: 500, color: "hsl(239 84% 80%)" }}>Loslassen zum Hochladen</div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 500, color: "hsl(0 0% 78%)" }}>Steckbrief hochladen</div>
                <div className="module-desc" style={{ margin: "6px 0 0" }}>PDF hier ablegen oder klicken zum Auswählen</div>
                <div className="module-desc" style={{ margin: "2px 0 0" }}>Das Profil wird automatisch ausgefüllt</div>
              </>
            )}
          </>
        )}
        <input
          ref={inputRef} type="file" accept=".pdf,application/pdf" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
        />
      </div>

      {fileInfo && busy && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: "hsl(0 0% 72%)", animation: "sbFadeIn 200ms ease" }}>
          <span style={{ color: "hsl(152 55% 62%)", marginRight: 6 }}>✓</span>
          {fileInfo.name} · {Math.round(fileInfo.size / 1024)} KB
        </div>
      )}

      {imported && !busy && (
        <button
          onClick={() => inputRef.current?.click()}
          style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-subtle)" }}
        >
          Neuer Steckbrief
        </button>
      )}
    </div>
  );
}
