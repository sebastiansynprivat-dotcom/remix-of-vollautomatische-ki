import { useState, useRef, useMemo } from "react";

type MediaType = "photo" | "video" | "gallery";

interface Props {
  onClose: () => void;
  onSend: (priceCents: number, type: MediaType, count: number, caption: string) => void;
  initialPriceCents?: number;
  initialCaption?: string;
  initialType?: MediaType;
  hint?: string;
}

function detectType(files: File[], fallback: MediaType = "photo"): MediaType {
  if (files.length === 0) return fallback;
  if (files.length > 1) return "gallery";
  return files[0].type.startsWith("video/") ? "video" : "photo";
}

export function PPVSendModal({ onClose, onSend, initialPriceCents, initialCaption, initialType, hint }: Props) {
  const [price, setPrice] = useState(
    initialPriceCents != null ? (initialPriceCents / 100).toFixed(2) : "9.99"
  );
  const [caption, setCaption] = useState(initialCaption ?? "");
  const [drag, setDrag] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const detected: MediaType = useMemo(
    () => detectType(files, initialType ?? "photo"),
    [files, initialType]
  );

  const previews = useMemo(() => {
    return files.slice(0, 4).map(f => ({
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith("video/"),
      name: f.name,
    }));
  }, [files]);

  const handleSend = () => {
    const v = parseFloat(price.replace(",", "."));
    if (isNaN(v) || v <= 0) return;
    const count = files.length || 1;
    onSend(Math.round(v * 100), detected, count, caption.trim());
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles(Array.from(list));
  };

  const typeLabel = detected === "video"
    ? "Video"
    : detected === "gallery"
      ? `${files.length} Medien`
      : files.length > 0 ? "Foto" : "—";

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "hsla(0,0%,0%,0.72)", backdropFilter: "blur(10px)",
      display: "grid", placeItems: "center", padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} className="premium-card reveal" style={{
        width: "100%", maxWidth: 460, padding: 22,
        borderRadius: 18,
        background: "linear-gradient(180deg, hsla(40,30%,8%,0.85), hsla(0,0%,4%,0.92))",
        border: "1px solid hsla(40,40%,55%,0.18)",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7), inset 0 1px 0 hsla(0,0%,100%,0.05)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700,
              padding: "3px 8px", borderRadius: 4,
              color: "var(--accent)",
              background: "color-mix(in oklab, var(--accent) 12%, transparent)",
              border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
            }}>PPV</span>
            <h3 style={{ color: "var(--text-strong)", fontSize: 15, fontWeight: 500, letterSpacing: 0.2 }}>
              Bezahltes Medium senden
            </h3>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            color: "var(--text-muted)", display: "grid", placeItems: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {hint && (
          <div style={{
            marginBottom: 14, padding: "8px 12px", borderRadius: 10,
            fontSize: 11, lineHeight: 1.45, color: "var(--text-muted)",
            background: "color-mix(in oklab, var(--accent) 8%, transparent)",
            border: "1px solid color-mix(in oklab, var(--accent) 28%, transparent)",
          }}>
            <span style={{ color: "var(--accent)", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", fontSize: 9 }}>AI-Vorschlag · </span>
            {hint}
          </div>
        )}

        <input ref={inputRef} type="file" multiple accept="image/*,video/*"
          onChange={e => addFiles(e.target.files)} style={{ display: "none" }} />

        {/* Media drop / preview */}
        {files.length === 0 ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
            style={{
              border: `1.5px dashed ${drag ? "var(--accent)" : "hsla(40,40%,55%,0.28)"}`,
              borderRadius: 14, padding: "36px 16px",
              textAlign: "center", marginBottom: 16, cursor: "pointer",
              background: drag
                ? "color-mix(in oklab, var(--accent) 8%, transparent)"
                : "hsla(0,0%,100%,0.018)",
              transition: "all 220ms var(--easing)",
            }}>
            <div style={{
              width: 38, height: 38, margin: "0 auto 10px",
              borderRadius: 12, display: "grid", placeItems: "center",
              color: "var(--accent)",
              background: "color-mix(in oklab, var(--accent) 10%, transparent)",
              border: "1px solid color-mix(in oklab, var(--accent) 25%, transparent)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <div style={{ color: "var(--text-strong)", fontSize: 13, fontWeight: 500, letterSpacing: 0.1 }}>
              Medien hierher ziehen
            </div>
            <div style={{ color: "var(--text-subtle)", fontSize: 11, marginTop: 4 }}>
              oder klicken zum Auswählen
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: previews.length === 1 ? "1fr" : "1fr 1fr",
              gap: 6, borderRadius: 14, overflow: "hidden",
              border: "1px solid hsla(0,0%,100%,0.06)",
            }}>
              {previews.map((p, i) => (
                <div key={i} style={{
                  position: "relative",
                  aspectRatio: previews.length === 1 ? "16/10" : "1/1",
                  background: "hsla(0,0%,0%,0.4)",
                }}>
                  {p.isVideo ? (
                    <video src={p.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                  ) : (
                    <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: 6, fontSize: 10.5, color: "var(--text-subtle)",
            }}>
              <span style={{ letterSpacing: 0.4 }}>
                {typeLabel}{files.length > 4 ? ` · +${files.length - 4} weitere` : ""}
              </span>
              <button
                onClick={() => inputRef.current?.click()}
                style={{ color: "var(--text-muted)", fontSize: 10.5, padding: "2px 6px", borderRadius: 6 }}
              >Ändern</button>
            </div>
          </div>
        )}

        {/* Caption */}
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Caption schreiben…"
          rows={2}
          style={{
            width: "100%", resize: "none", padding: "11px 13px",
            fontSize: 13.5, color: "var(--text-strong)", lineHeight: 1.5,
            borderRadius: 12, background: "hsla(0,0%,100%,0.025)",
            border: "1px solid hsla(0,0%,100%,0.07)", marginBottom: 12,
            outline: "none",
          }}
        />

        {/* Price */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 12,
          background: "color-mix(in oklab, var(--accent) 5%, hsla(0,0%,100%,0.018))",
          border: "1px solid color-mix(in oklab, var(--accent) 22%, transparent)",
          marginBottom: 18,
        }}>
          <span style={{
            fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700,
            color: "var(--text-subtle)",
          }}>Preis</span>
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="tabular"
            style={{
              flex: 1, fontSize: 20, fontWeight: 600,
              color: "var(--accent)", textAlign: "right",
              background: "transparent", border: "none", outline: "none",
            }}
          />
          <span style={{ color: "var(--accent)", fontSize: 18, fontWeight: 500 }}>€</span>
        </div>

        <button
          onClick={handleSend}
          disabled={files.length === 0 && !initialCaption}
          className="accent-gradient-bg"
          style={{
            width: "100%", padding: "13px", borderRadius: 12,
            fontSize: 13.5, fontWeight: 700, color: "var(--bg)",
            letterSpacing: 0.3,
            opacity: files.length === 0 && !initialCaption ? 0.5 : 1,
            cursor: files.length === 0 && !initialCaption ? "not-allowed" : "pointer",
            boxShadow: "0 8px 24px -8px hsla(40,55%,55%,0.5)",
          }}>
          Senden
        </button>
      </div>
    </div>
  );
}
