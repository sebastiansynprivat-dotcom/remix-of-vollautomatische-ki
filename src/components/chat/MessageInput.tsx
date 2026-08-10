import { useState, useRef, useEffect } from "react";
import { PPVSendModal } from "@/components/monetization/PPVSendModal";
import { fx } from "@/lib/feedback";
import { useChat, useDraft, usePpvDraft, useChainStatus } from "@/lib/chatStore";

export function MessageInput({ convId, fanId, asFan = false, noSuggestions = false }: { convId: string; fanId: string; asFan?: boolean; noSuggestions?: boolean }) {
  const [text, setText] = useState("");
  const [ppvOpen, setPpvOpen] = useState(false);
  const [ppvInit, setPpvInit] = useState<{ priceCents?: number; caption?: string; type?: "photo" | "video" | "gallery"; hint?: string }>({});
  const [pressed, setPressed] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chat = useChat();

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = Math.min(ref.current.scrollHeight, 144) + "px";
    }
  }, [text]);

  // Reset draft when switching conv + pull suggestion drafts on demand
  useEffect(() => { setText(""); setPpvOpen(false); }, [convId]);

  // Pull suggestion text into the input whenever the draft store updates (nur Model-Input)
  const draftFromStore = useDraft(convId);
  const draft = asFan || noSuggestions ? undefined : draftFromStore;
  useEffect(() => {
    if (draft != null) {
      setText(draft);
      chat.consumeDraft(convId);
      setTimeout(() => ref.current?.focus(), 0);
    }
  }, [draft, convId]);

  // PPV-Draft (von AI-Vorschlag) → öffnet Modal vorausgefüllt
  const ppvDraftFromStore = usePpvDraft(convId);
  const ppvDraft = asFan || noSuggestions ? undefined : ppvDraftFromStore;
  useEffect(() => {
    if (ppvDraft) {
      setPpvInit({
        priceCents: ppvDraft.price_cents,
        caption: ppvDraft.caption,
        type: ppvDraft.media_type,
        hint: "Caption + Preis sind als Vorschlag vorausgefüllt. Wähle Medien aus und passe alles bei Bedarf an.",
      });
      setPpvOpen(true);
      chat.consumePpvDraft(convId);
    }
  }, [ppvDraft, convId]);

  // Erkenne 2-Nachrichten-Modus (Doppel-Newline trennt Message 1 von Message 2)
  const splitChain = (raw: string): [string, string?] => {
    const idx = raw.indexOf("\n\n");
    if (idx === -1) return [raw.trim()];
    const a = raw.slice(0, idx).trim();
    const b = raw.slice(idx + 2).trim();
    if (!a || !b) return [raw.replace(/\n+/g, " ").trim()];
    return [a, b];
  };
  const parts = splitChain(text);
  const isChain = !asFan && parts.length === 2 && !!parts[1];

  const send = () => {
    const t = text.trim();
    if (!t) return;
    if (asFan) {
      chat.sendAsFan(convId, fanId, t);
    } else if (isChain) {
      chat.sendChain(convId, fanId, parts[0], parts[1]!);
    } else {
      chat.sendText(convId, fanId, parts[0]);
    }
    setPressed(true);
    setTimeout(() => setPressed(false), 280);
    setText("");
  };

  const handleAttach = () => fileRef.current?.click();
  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const count = files.length;
    const isVideo = files[0].type.startsWith("video/");
    chat.sendPPV(convId, 999, isVideo ? "video" : "photo", count);
    fx.haptic("soft");
    e.target.value = "";
  };

  const hasText = !!text.trim();

  return (
    <div style={{
      position: "relative",
      padding: "12px calc(12px) calc(12px + var(--safe-bottom))",
    }}>
      {ppvOpen && (
        <PPVSendModal
          onClose={() => { setPpvOpen(false); setPpvInit({}); }}
          initialPriceCents={ppvInit.priceCents}
          initialCaption={ppvInit.caption}
          initialType={ppvInit.type}
          hint={ppvInit.hint}
          onSend={(price, type, count, caption) => {
            if (caption) chat.sendText(convId, fanId, caption);
            chat.sendPPV(convId, price, type, count);
            setPpvOpen(false);
            setPpvInit({});
          }}
        />
      )}

      <input ref={fileRef} type="file" multiple accept="image/*,video/*" onChange={onFiles} style={{ display: "none" }} />

      {isChain && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "4px 10px", marginBottom: 6, borderRadius: 999,
          background: "color-mix(in oklab, var(--gold) 8%, transparent)",
          border: "1px solid color-mix(in oklab, var(--gold) 28%, transparent)",
          fontSize: 11, color: "var(--gold)", fontWeight: 600, letterSpacing: 0.3,
        }}>
          <span style={{ fontSize: 13 }}>📨</span>
          <span>Wird als 2 Nachrichten nacheinander gesendet</span>
          <span style={{ marginLeft: "auto", color: "var(--text-subtle)", fontWeight: 400 }}>
            {parts[0]?.length}+{parts[1]?.length} Z.
          </span>
        </div>
      )}

      <ChainStatusBanner convId={convId} />


      <div
        className="premium-card"
        style={{
          display: "flex", alignItems: "flex-end", gap: 6,
          padding: "4px 4px 4px 8px",
          borderRadius: 8,
          background: "var(--surface-1)",
          border: "1px solid hsla(0,0%,100%,0.07)",
          boxShadow: "0 8px 28px -18px rgba(0,0,0,0.55), inset 0 1px 0 hsla(0,0%,100%,0.04)",
          transition: "border-color 220ms var(--easing), box-shadow 220ms var(--easing)",
        }}
      >
        {!asFan && (
          <>
            <button onClick={handleAttach} title="Medien anhängen" style={iconBtn}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="9" cy="9" r="1.6"/>
                <path d="m21 15-5-5L5 21"/>
              </svg>
            </button>
            <button onClick={() => setPpvOpen(true)} title="PPV mit Preis senden" style={{ ...iconBtn, color: "var(--gold)" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h2.5l1.5-2h4l1.5 2H18a3 3 0 0 1 3 3z"/>
                <path d="M12 11.5v4M10 13.5h4"/>
              </svg>
            </button>
          </>
        )}
        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={asFan ? "Schreibe als Fan…" : "Nachricht schreiben"}
          rows={1}
          style={{
            flex: 1, resize: "none", padding: "10px 6px",
            fontSize: 13, color: "var(--text-strong)",
            lineHeight: 1.5, maxHeight: 144,
            background: "transparent", border: "none", outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={send}
          disabled={!hasText}
          className={`${hasText ? "gold-gradient-bg" : ""} ${pressed ? "send-press" : ""}`}
          style={{
            width: 36, height: 36, borderRadius: 8,
            display: "grid", placeItems: "center",
            background: hasText ? undefined : "hsla(0,0%,100%,0.04)",
            color: hasText ? "var(--bg)" : "var(--text-subtle)",
            transform: hasText ? "scale(1)" : "scale(0.92)",
            boxShadow: hasText ? "0 4px 14px hsla(40,55%,55%,0.4), inset 0 1px 0 hsla(0,0%,100%,0.3)" : undefined,
            transition: "transform 280ms var(--easing), background 220ms var(--easing), box-shadow 220ms var(--easing)",
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 6 7 6-7 6"/></svg>
        </button>
      </div>
    </div>
  );
}

function ChainStatusBanner({ convId }: { convId: string }) {
  const status = useChainStatus(convId);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!status || status.phase !== "first-sent") return;
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, [status?.phase]);
  if (!status) return null;
  const isFirst = status.phase === "first-sent";
  const elapsed = isFirst ? Math.min(status.etaMs, tick * 80) : status.etaMs;
  const pct = isFirst ? Math.min(100, (elapsed / status.etaMs) * 100) : 100;
  return (
    <div style={{
      position: "relative",
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px 10px", marginBottom: 6, borderRadius: 10,
      background: isFirst
        ? "color-mix(in oklab, var(--gold) 10%, transparent)"
        : "color-mix(in oklab, #4ade80 12%, transparent)",
      border: `1px solid ${isFirst ? "color-mix(in oklab, var(--gold) 32%, transparent)" : "color-mix(in oklab, #4ade80 35%, transparent)"}`,
      fontSize: 11.5, color: isFirst ? "var(--gold)" : "#86efac",
      fontWeight: 600, letterSpacing: 0.3,
      overflow: "hidden",
      transition: "all 200ms var(--easing)",
    }}>
      <span style={{
        display: "inline-grid", placeItems: "center",
        width: 18, height: 18, borderRadius: "50%",
        background: "currentColor", color: "var(--bg)",
        fontSize: 11, fontWeight: 800,
      }}>{isFirst ? "1" : "✓"}</span>
      <span style={{ flex: 1 }}>
        {isFirst
          ? "Nachricht 1 gesendet · Nachricht 2 folgt gleich…"
          : "Beide Nachrichten gesendet"}
      </span>
      <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 500 }}>
        {status.step}/{status.total}
      </span>
      <div style={{
        position: "absolute", left: 0, bottom: 0, height: 2,
        width: `${pct}%`,
        background: "currentColor",
        transition: isFirst ? "width 80ms linear" : "width 280ms var(--easing)",
      }} />
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10,
  color: "var(--text-muted)", display: "grid", placeItems: "center",
  transition: "all 200ms var(--easing)",
};
