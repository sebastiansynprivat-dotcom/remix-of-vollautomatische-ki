import { useEffect, useMemo, useRef, useState } from "react";
import { mockCurrentUser, AI_CONV_ID, type Conversation } from "@/data/mockData";
import { fx } from "@/lib/feedback";
import { useChat, useMessages, useTyping, useAutopilotPaused } from "@/lib/chatStore";
import { useSimRun, setSimState, type SimRun } from "@/lib/simRuns";
import { useReadMarker } from "@/lib/readState";
import { useChatUI } from "@/lib/chatUI";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ManualModeBanner } from "@/components/chat/AutoModeToggle";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { PPVMessageBubble } from "@/components/chat/PPVMessageBubble";
import { TipMessageBubble } from "@/components/chat/TipMessageBubble";
import { DeletableMessage } from "@/components/chat/DeletableMessage";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { MessageInput } from "@/components/chat/MessageInput";
import { TimeTravelPanel } from "@/components/chat/TimeTravelPanel";
import { SalesIntelBar } from "@/components/copilot/SalesIntelBar";
import { FanDnaPanel } from "@/components/copilot/FanDnaPanel";
import { FunnelLadderEditor } from "@/components/copilot/FunnelLadderEditor";
import { Drawer, DrawerContent, DrawerPortal, DrawerOverlay } from "@/components/ui/drawer";

const RENDER_STEP = 80;

/** Statuszeile im Simulations-Banner: Tag, Session-Phase und Turns. */
function simStatusLabel(run: SimRun): string {
  const base = `Tag ${run.simDay}/${run.maxSimDays} · ${run.turnCount} Turns`;
  if (run.state === "completed" || run.phase === "done") return `Simulation abgeschlossen · ${base}`;
  if (run.state === "paused") return `Simulation pausiert · ${base}`;
  if (run.phase === "followup_due") return `Guten-Morgen-Follow-up folgt (Käufer) · ${base}`;
  if (run.phase === "break") {
    const gap = run.gapHours >= 1 ? ` (~${Math.round(run.gapHours)} Std.)` : "";
    return `Gesprächspause${gap} — danach Neustart · ${base}`;
  }
  return `Simulation läuft am Server · ${base} · Zug ${run.sessionTurn} der Session`;
}


export function ChatArea({
  activeId, conversations, onBack,
}: { activeId: string | null; conversations: Conversation[]; onBack?: () => void }) {
  const conv = conversations.find(c => c.id === activeId) ?? conversations[0];
  const chat = useChat();
  const ui = useChatUI();

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [ladderOpen, setLadderOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);

  const convId = conv?.id ?? "";
  const messages = useMessages(convId);
  const isTyping = useTyping(convId);
  

  const [autoModeOverride, setAutoModeOverride] = useState<boolean | null>(null);
  useEffect(() => { setAutoModeOverride(null); }, [convId]);
  const autoMode = autoModeOverride ?? (conv?.autopilotEnabled !== false);
  const manualMode = !autoMode;

  const autopilot = !!conv?.isAutopilot && autoMode;
  const autopilotPaused = useAutopilotPaused(convId);

  // Serverseitig laufende Simulation (läuft weiter, auch wenn die Seite zu ist)
  const simRun = useSimRun(convId || null);
  const isSim = !!simRun;

  // Lesestand: Marker beim Öffnen einfrieren → "Neu ab hier"-Linie
  const { entryMarker, markRead } = useReadMarker(convId || null);
  const unreadRef = useRef<HTMLDivElement>(null);
  const scrolledToUnreadRef = useRef<string | null>(null);
  const firstUnreadId = useMemo(() => {
    if (!entryMarker) return null;
    const m = messages.find(x => x.createdAt > entryMarker && x.senderId !== mockCurrentUser.id);
    return m?.id ?? null;
  }, [messages, entryMarker]);

  // Beim Öffnen genau bei der ersten ungelesenen Nachricht einsteigen
  useEffect(() => {
    if (!convId || !firstUnreadId) return;
    if (scrolledToUnreadRef.current === convId) return;
    const t = window.setTimeout(() => {
      if (unreadRef.current) {
        unreadRef.current.scrollIntoView({ block: "center" });
        scrolledToUnreadRef.current = convId;
      }
    }, 60);
    return () => clearTimeout(t);
  }, [convId, firstUnreadId]);

  // Mark as read + trigger AI intro when opening / changing conv (deferred past first paint)
  useEffect(() => {
    if (!conv) return;
    const id = conv.id;
    const t = window.setTimeout(() => {
      chat.markRead(id);
      chat.ensureAIIntro(id);
      
    }, 0);
    return () => clearTimeout(t);
  }, [conv?.id, autopilot]);

  // Lesestand fortschreiben, solange der Chat offen ist
  useEffect(() => {
    if (!convId) return;
    const last = messages[messages.length - 1];
    if (!last) return;
    const t = window.setTimeout(() => { void markRead(last.createdAt); }, 1200);
    return () => clearTimeout(t);
  }, [convId, messages.length, markRead]);


  // Auto-scroll: smooth for own sends, instant for incoming, but
  // only if the user is already near the bottom (don't snatch away their context).
  const [showJump, setShowJump] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    const isNew = last && last.id !== lastMsgIdRef.current;
    const ownSend = !!last && last.senderId === mockCurrentUser.id;
    lastMsgIdRef.current = last?.id ?? null;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distFromBottom < 120;
    if (ownSend || nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: ownSend && isNew ? "smooth" : "auto" });
      setShowJump(false);
    } else if (isNew) {
      setShowJump(true);
    }
  }, [messages.length, isTyping, conv?.id]);

  // Hide jump pill once user scrolls back to bottom on their own.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (dist < 60) setShowJump(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [conv?.id]);

  const [renderCount, setRenderCount] = useState(RENDER_STEP);
  useEffect(() => { setRenderCount(RENDER_STEP); }, [conv?.id]);
  const hasOlder = messages.length > renderCount;

  const loadOlder = () => {
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    setRenderCount(c => c + RENDER_STEP);
    requestAnimationFrame(() => {
      const e = scrollRef.current;
      if (e) e.scrollTop = prevTop + (e.scrollHeight - prevHeight);
    });
  };

  const filtered = useMemo(() => {
    const base = messages.length > renderCount ? messages.slice(messages.length - renderCount) : messages;
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(m =>
      (m.content?.toLowerCase().includes(q)) ||
      (m.tip?.message?.toLowerCase().includes(q))
    );
  }, [messages, search, renderCount]);

  if (!conv) {
    return (
      <main style={{ flex: 1, display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 50% 35% at 50% 45%, hsla(38,40%,22%,0.35), transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="display" style={{
          fontSize: 200, fontWeight: 500, lineHeight: 1,
          color: "var(--accent)",
          letterSpacing: "-0.05em",
          animation: "monogramBreathe 5s ease-in-out infinite",
          textShadow: "0 0 100px hsla(38,55%,55%,0.45)",
          userSelect: "none",
          position: "relative",
        }}>·</div>
        <div style={{
          position: "absolute", bottom: 56, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <span style={{ width: 28, height: 1, background: "var(--hairline-accent)" }} />
          <span style={{ color: "var(--text-subtle)", fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" }}>
            Wähle eine Konversation
          </span>
        </div>
      </main>
    );
  }

  
  const isMobile = !!onBack;
  const showDna = !isMobile && conv.id !== AI_CONV_ID && ui.dnaOpen;
  const mobileDnaOpen = isMobile && conv.id !== AI_CONV_ID && ui.dnaOpen;

  return (
    <div style={{ flex: 1, display: "flex", minWidth: 0, height: "100%", position: "relative" }}>
      <main style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>
      <ChatHeader
        conv={conv}
        onBack={onBack}
        onToggleSearch={() => setSearchOpen(s => !s)}
        searchActive={searchOpen}
        onAvatarTap={isMobile && conv.id !== AI_CONV_ID ? () => ui.toggleDna() : undefined}
        autoMode={autoMode}
        onAutoModeChange={(next) => setAutoModeOverride(next)}
      />
      <ManualModeBanner visible={manualMode && conv.id !== AI_CONV_ID} />
      {conv.id === AI_CONV_ID && <TimeTravelPanel convId={conv.id} />}
      {conv.id !== AI_CONV_ID && <SalesIntelBar convId={conv.id} fanId={conv.participant.id} />}
      {searchOpen && (
        <div style={{ padding: "10px 24px", borderBottom: "1px solid hsla(0,0%,100%,0.05)", background: "hsla(0,0%,100%,0.01)" }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="In Nachrichten suchen…"
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              background: "hsla(0,0%,100%,0.03)", border: "1px solid hsla(0,0%,100%,0.06)",
              color: "var(--text-strong)", fontSize: 13,
            }}
          />
        </div>
      )}

          <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div ref={scrollRef} style={{
              flex: 1, overflowY: "auto",
              display: "flex", flexDirection: "column", gap: 8,
              padding: "20px 0",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}>
              {hasOlder && (
                <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
                  <button
                    type="button"
                    onClick={loadOlder}
                    style={{
                      padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                      background: "hsla(0,0%,100%,0.04)",
                      border: "1px solid hsla(0,0%,100%,0.08)",
                      color: "var(--text-subtle)", fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
                    }}
                  >
                    Ältere Nachrichten laden ({messages.length - renderCount})
                  </button>
                </div>
              )}
              {filtered.length === 0 && (
                <div style={{ margin: "auto", color: "var(--text-subtle)", fontSize: 12, padding: 24 }}>
                  {search.trim() ? "Keine Treffer." : "Schreibe die erste Nachricht…"}
                </div>
              )}
              {filtered.map(msg => {
                const isOwn = msg.senderId === mockCurrentUser.id;
                const bubble = msg.contentType === "ppv"
                  ? <PPVMessageBubble convId={conv.id} msg={msg} isOwn={isOwn} />
                  : msg.contentType === "tip"
                    ? <TipMessageBubble msg={msg} senderName={conv.participant.displayName} />
                    : <MessageBubble msg={msg} isOwn={isOwn} />;
                const divider = msg.id === firstUnreadId ? (
                  <div ref={unreadRef} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 16px 2px",
                  }}>
                    <span style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
                      color: "var(--accent)",
                    }}>Neu ab hier</span>
                    <span style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
                  </div>
                ) : null;
                const body = !autopilot ? bubble : (
                  <DeletableMessage
                    align={isOwn ? "right" : "left"}
                    onDelete={() => { void chat.deleteMessage(conv.id, msg.id); }}
                  >
                    {bubble}
                  </DeletableMessage>
                );
                return <div key={msg.id}>{divider}{body}</div>;
              })}
              {isTyping && !manualMode && <TypingIndicator name={conv.participant.displayName} />}
            </div>
            {showJump && (
              <button
                onClick={() => {
                  const el = scrollRef.current;
                  if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                  setShowJump(false);
                  fx.haptic("tick");
                }}
                style={{
                  position: "absolute", left: "50%", bottom: 12,
                  transform: "translateX(-50%)",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 999,
                  fontSize: 11, fontWeight: 600, color: "var(--bg)",
                  background: "var(--accent)",
                  boxShadow: "0 8px 24px hsla(40,55%,55%,0.35), 0 0 0 1px hsla(40,55%,55%,0.4)",
                  animation: "bubbleIn 240ms var(--easing-ios) both",
                  zIndex: 5,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
                Neue Nachricht
              </button>
            )}
          </div>
          
          {isSim && simRun && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              margin: "6px 16px 0", padding: "7px 12px", borderRadius: 10,
              background: "var(--surface-1)",
              border: "1px solid var(--hairline)",
              fontSize: 11, fontWeight: 500, letterSpacing: 0, color: "var(--text)",
            }}>
              <span
                style={{
                  width: 8, height: 8, borderRadius: 999,
                  background: simRun.state === "running" ? "var(--status-success)" : "var(--text-disabled)",
                }}
              />
              {simStatusLabel(simRun)}
              {simRun.state !== "completed" && (
                <button
                  type="button"
                  onClick={() => { fx.haptic("tick"); void setSimState(conv.id, simRun.state === "running" ? "paused" : "running"); }}
                  style={{
                    marginLeft: "auto", padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                    background: simRun.state === "running" ? "transparent" : "var(--accent)",
                    color: simRun.state === "running" ? "var(--accent)" : "var(--bg)",
                    border: "1px solid color-mix(in oklab, var(--accent) 34%, transparent)",
                    fontSize: 10.5, fontWeight: 700,
                  }}
                >
                  {simRun.state === "running" ? "Pause" : "Weiter"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setLadderOpen(true)}
                style={{
                  padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                  background: "transparent", color: "var(--accent)",
                  border: "1px solid color-mix(in oklab, var(--accent) 34%, transparent)",
                  fontSize: 10.5, fontWeight: 700,
                }}
              >
                Stufen
              </button>
            </div>
          )}
          {autopilot && !isSim && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              margin: "6px 16px 0", padding: "7px 12px", borderRadius: 10,
              background: "var(--surface-1)",
              border: "1px solid var(--hairline)",
              fontSize: 11, fontWeight: 500, letterSpacing: 0, color: "var(--text)",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--status-success)" }} />
              Auto-Pilot aktiv — du schreibst als Fan, der Creator antwortet automatisch
              <button
                type="button"
                onClick={() => setLadderOpen(true)}
                style={{
                  marginLeft: "auto", padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                  background: "transparent", color: "var(--accent)",
                  border: "1px solid color-mix(in oklab, var(--accent) 34%, transparent)",
                  fontSize: 10.5, fontWeight: 700,
                }}
              >
                Stufen
              </button>
            </div>
          )}
          {ladderOpen && <FunnelLadderEditor onClose={() => setLadderOpen(false)} />}
          {autopilot && autopilotPaused && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              margin: "6px 16px 0", padding: "8px 12px", borderRadius: 10,
              background: "hsla(0,60%,50%,0.08)",
              border: "1px solid hsla(0,60%,60%,0.28)",
              fontSize: 11, fontWeight: 600, color: "hsl(0,70%,74%)",
            }}>
              <span>Auto-Pilot pausiert — Nachricht gelöscht.</span>
              <button
                type="button"
                onClick={() => chat.resumeAutopilot(conv.id)}
                style={{
                  padding: "6px 12px", borderRadius: 999, border: "none",
                  background: "var(--accent)", color: "var(--bg)",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 6px 18px hsla(40,55%,55%,0.3)",
                }}
              >
                Weiter & neu generieren
              </button>
            </div>
          )}
      <MessageInput convId={conv.id} fanId={conv.participant.id} asFan={autopilot} noSuggestions={manualMode} />
      </main>
      {showDna && <FanDnaPanel conv={conv} onClose={() => ui.toggleDna()} />}
      {isMobile && (
        <Drawer open={mobileDnaOpen} onOpenChange={(o) => { if (!o) ui.toggleDna(); }}>
          <DrawerPortal>
            <DrawerOverlay />
            <DrawerContent
              className="border-0 p-0"
              style={{
                background: "var(--surface-1)",
                backgroundImage: "linear-gradient(180deg, hsla(40,30%,9%,0.6), hsla(0,0%,100%,0.012))",
                maxHeight: "92dvh",
                paddingBottom: "var(--safe-bottom)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", maxHeight: "calc(92dvh - var(--safe-bottom))", overflow: "hidden" }}>
                <FanDnaPanel conv={conv} onClose={() => ui.toggleDna()} fullWidth />
              </div>
            </DrawerContent>
          </DrawerPortal>
        </Drawer>
      )}
      {!isMobile && conv.id !== AI_CONV_ID && !ui.dnaOpen && (
        <button
          onClick={() => ui.toggleDna()}
          title="Fan-Panel anzeigen ( ] )"
          style={{
            position: "absolute", top: "50%", right: 0,
            transform: "translateY(-50%)",
            width: 22, height: 56, borderRadius: "8px 0 0 8px",
            background: "hsla(0,0%,100%,0.04)",
            border: "1px solid hsla(0,0%,100%,0.06)",
            borderRight: "none",
            color: "var(--text-subtle)",
            display: "grid", placeItems: "center",
            zIndex: 10,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
      )}
    </div>
  );
}

