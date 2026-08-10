      {import { useState, useEffect, useMemo, useRef } from "react";
import "@/styles/tokens.css";
import { Sidebar, type View } from "@/components/layout/Sidebar";
import { ConversationList } from "@/components/layout/ConversationList";
import { ChatArea } from "@/components/layout/ChatArea";
import { CreatorProfile } from "@/components/profile/CreatorProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisualViewport } from "@/lib/useVisualViewport";
import { fx } from "@/lib/feedback";
import { ChatProvider } from "@/lib/chatStore";
import { ChatUIProvider } from "@/lib/chatUI";
import { CommandPalette } from "@/components/chat/CommandPalette";
import { HotkeyLayer } from "@/components/chat/HotkeyLayer";
import { useAssignedModels, useConversationsForModel, useMessagesLoader } from "@/lib/cloudChat";
import { ContentCloud } from "@/components/cloud/ContentCloud";
import { PerformanceDashboard } from "@/components/profile/PerformanceDashboard";
import { ModelsAdmin } from "@/components/admin/ModelsAdmin";

export function App() {
  return (
    <ChatProvider>
      <AppInner />
    </ChatProvider>
  );
}

function AppInner() {
  useVisualViewport();
  const { models } = useAssignedModels();
  const [view, setView] = useState<View>({ kind: "profile" });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastModelId, setLastModelId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [showChat, setShowChat] = useState(false);
  const [didInitView, setDidInitView] = useState(false);

  // Default to first assigned model once loaded
  useEffect(() => {
    if (!didInitView && models.length > 0) {
      setView({ kind: "messages", profileId: models[0].id });
      setLastModelId(models[0].id);
      setDidInitView(true);
    }
  }, [models, didInitView]);

  // Track most recent model selection so Cloud knows which model to show
  useEffect(() => {
    if (view.kind === "messages") setLastModelId(view.profileId);
  }, [view]);

  const activeModelId = view.kind === "messages" ? view.profileId : null;
  const cloudModelId = view.kind === "cloud" ? (view.profileId ?? lastModelId ?? models[0]?.id ?? null) : null;
  const cloudConvs = useConversationsForModel(activeModelId);
  const conversations = cloudConvs;
  const conversationIds = useMemo(() => conversations.map((c) => c.id), [conversations]);

  useMessagesLoader(activeId);

  const headerContext = view.kind === "messages"
    ? { kind: "profile" as const, profile: models.find((p) => p.id === view.profileId)! }
    : null;

  const ensureActive = (id: string) => setActiveId(id);
  if (view.kind !== "profile" && view.kind !== "cloud" && view.kind !== "performance" && view.kind !== "models" && conversations.length && !conversations.find(c => c.id === activeId)) {
    queueMicrotask(() => ensureActive(conversations[0].id));
  }

  const handleSelectConv = (id: string) => {
    setActiveId(id);
    if (isMobile) { fx.haptic("soft"); setShowChat(true); }
  };

  // Switching tabs: on mobile, if a chat is already open, jump straight into
  // the new profile's first conversation so the bottom bar acts like a profile
  // switcher even while chatting. Profile view always exits chat.
  const handleSetView = (v: View) => {
    fx.haptic("tick");
    setView(v);
    if (v.kind === "profile" || v.kind === "performance" || v.kind === "models") {
      setShowChat(false);
      return;
    }
    if (v.kind === "messages") setActiveId(null); // will pick first conv when loaded
    if (!isMobile || !showChat) setShowChat(false);
  };

  useEffect(() => {
    if (!isMobile) setShowChat(false);
  }, [isMobile]);

  const openCloudForActive = () => {
    const id = activeModelId ?? lastModelId ?? models[0]?.id;
    if (id) setView({ kind: "cloud", profileId: id, returnConvId: activeId });
  };

  const cloudModel = cloudModelId ? models.find((p) => p.id === cloudModelId) ?? null : null;

  const wrap = (node: React.ReactNode) => (
    <ChatUIProvider activeId={activeId} setActiveId={setActiveId} conversationIds={conversationIds} openCloud={openCloudForActive}>
      {node}
      <CommandPalette />
      <HotkeyLayer />
    </ChatUIProvider>
  );
  if (isMobile) {

    return wrap(
      <div style={{
        display: "flex", flexDirection: "column",
        height: "100dvh", width: "100vw", overflow: "hidden",
        background: "var(--surface-1)",
      }}>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Base pane: list or profile — fullscreen, tab bar floats on top */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            {view.kind === "performance" ? (
              <div style={{ flex: 1, overflow: "auto", paddingBottom: "calc(64px + var(--safe-bottom) + 12px)" }}>
                <PerformanceDashboard />
              </div>
            ) : view.kind === "models" ? (
              <div style={{ flex: 1, overflow: "auto", padding: "16px 14px", paddingBottom: "calc(64px + var(--safe-bottom) + 12px)" }}>
                <ModelsAdmin />
              </div>
            ) : view.kind === "profile" ? (
              <div style={{ flex: 1, overflow: "auto", paddingBottom: "calc(64px + var(--safe-bottom) + 12px)" }}>
                <CreatorProfile />
              </div>
            ) : view.kind === "cloud" ? (
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", paddingBottom: "calc(64px + var(--safe-bottom) + 8px)" }}>
                {cloudModel ? (
                  <ContentCloud
                    model={cloudModel}
                    returnConvId={view.returnConvId ?? null}
                    onBackToChat={() => {
                      if (cloudModel) setView({ kind: "messages", profileId: cloudModel.id });
                    }}
                  />
                ) : (
                  <div style={{ padding: 24, color: "var(--text-subtle)" }}>Kein Profil ausgewählt.</div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", paddingBottom: "calc(64px + var(--safe-bottom) + 8px)" }}>
                <ConversationList
                  conversations={conversations}
                  headerContext={headerContext}
                  activeId={activeId}
                  setActiveId={handleSelectConv}
                />
              </div>
            )}
          </div>

          {/* Chat overlay with iOS-style push + edge-swipe-back */}
          <ChatOverlay open={showChat} onClose={() => setShowChat(false)}>
            <ChatArea
              activeId={activeId}
              conversations={conversations}
              onBack={() => setShowChat(false)}
            />
          </ChatOverlay>
        </div>

        {/* Floating, translucent bottom tab bar — hidden while in a chat */}
        {!showChat && (
          <nav style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            height: "calc(64px + var(--safe-bottom))",
            paddingBottom: "var(--safe-bottom)",
            display: "flex", alignItems: "stretch",
            background: "color-mix(in srgb, var(--surface-1) 72%, transparent)",
            backdropFilter: "blur(28px) saturate(140%)",
            WebkitBackdropFilter: "blur(28px) saturate(140%)",
            borderTop: "1px solid hsla(0,0%,100%,0.06)",
            zIndex: 60,
          }}>
            {models.map((p) => (
              <ProfileTab
                key={p.id}
                avatarUrl={p.avatarUrl}
                label={p.displayName.split(" ")[0]}
                unread={p.unread}
                active={view.kind === "messages" && view.profileId === p.id}
                onClick={() => handleSetView({ kind: "messages", profileId: p.id })}
              />
            ))}
            <IconTab

              label="Models"
              active={view.kind === "models"}
              onClick={() => handleSetView({ kind: "models" })}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" /><path d="M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
                </svg>
              }
            />
            <IconTab
              label="Profil"
              active={view.kind === "profile"}
              onClick={() => handleSetView({ kind: "profile" })}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              }
            />
          </nav>
        )}
      </div>
    );
  }

  return wrap(
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", position: "relative" }}>
      <Sidebar view={view} setView={setView} models={models} />

      {view.kind === "fahrplan" ? (
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "28px 32px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <FahrplanView />
          </div>
        </div>
      ) : view.kind === "performance" ? (
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <PerformanceDashboard />
          </div>
        </div>
      ) : view.kind === "models" ? (
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "28px 32px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <ModelsAdmin />
          </div>
        </div>
      ) : view.kind === "profile" ? (
        <CreatorProfile />
      ) : view.kind === "cloud" ? (
        cloudModel ? (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <ContentCloud
              model={cloudModel}
              returnConvId={view.returnConvId ?? null}
              onBackToChat={() => {
                if (cloudModel) setView({ kind: "messages", profileId: cloudModel.id });
              }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--text-subtle)" }}>
            Kein Profil ausgewählt.
          </div>
        )
      ) : (
        <>
          <ConversationList
            conversations={conversations}
            headerContext={headerContext}
            activeId={activeId}
            setActiveId={setActiveId}
          />
          <ChatArea activeId={activeId} conversations={conversations} />
        </>
      )}
    </div>
  );
}

function ProfileTab({
  avatarUrl, label, unread, active, onClick,
}: { avatarUrl: string; label: string; unread: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 0,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
      padding: "8px 4px",
      transition: "all 220ms var(--easing)",
      position: "relative",
    }}>
      <div style={{ position: "relative" }}>
        <img
          src={avatarUrl} alt={label}
          width={26} height={26}
          className={active ? "halo-breathe" : undefined}
          style={{
            width: 26, height: 26, borderRadius: "50%", objectFit: "cover",
            boxShadow: active
              ? undefined
              : "inset 0 0 0 1px hsla(0,0%,100%,0.08)",
            opacity: active ? 1 : 0.65,
            filter: active ? "none" : "saturate(0.7)",
            transition: "all 280ms var(--easing)",
          }}
        />
        {unread > 0 && (
          <span className="gold-gradient-bg tabular" style={{
            position: "absolute", top: -3, right: -6,
            minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8,
            fontSize: 9, fontWeight: 700,
            display: "grid", placeItems: "center",
            border: "2px solid var(--surface-1)",
          }}>{unread}</span>
        )}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: active ? "var(--gold)" : "var(--text-subtle)",
        maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{label}</span>
    </button>
  );
}

function IconTab({
  label, icon, unread, active, onClick,
}: { label: string; icon: React.ReactNode; unread?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 0,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
      padding: "8px 4px",
      color: active ? "var(--gold)" : "var(--text-subtle)",
      transition: "all 220ms var(--easing)",
      position: "relative",
    }}>
      <div style={{ position: "relative", display: "grid", placeItems: "center", height: 26 }}>
        {icon}
        {unread != null && unread > 0 && (
          <span className="tabular" style={{
            position: "absolute", top: -4, right: -10,
            minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8,
            fontSize: 9, fontWeight: 700,
            color: "var(--gold)", background: "hsla(40,45%,55%,0.18)",
            border: "1px solid hsla(40,45%,55%,0.4)",
            display: "grid", placeItems: "center",
          }}>{unread}</span>
        )}
      </div>
      <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

/**
 * Mobile chat overlay with iOS-style push transition + edge-swipe-back.
 * - Off-screen → on-screen with cubic spring.
 * - Edge swipe (start within 24px from left) tracks the finger; commits if
 *   pulled >35% width or velocity >0.6 px/ms.
 */
function ChatOverlay({
  open, onClose, children,
}: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number; startX: number; startY: number; lastX: number; lastT: number;
    width: number; active: boolean; locked: boolean;
  } | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Reset offset whenever overlay closes/opens externally
  useEffect(() => { setDx(0); setDragging(false); }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!open) return;
    if (e.pointerType === "mouse") return; // touch/pen only
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    if (e.clientX - rect.left > 28) return; // must start near left edge
    drag.current = {
      id: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      lastX: e.clientX, lastT: performance.now(),
      width: rect.width, active: true, locked: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const ddx = e.clientX - d.startX;
    const ddy = e.clientY - d.startY;
    if (!d.locked) {
      if (Math.abs(ddy) > 12 && Math.abs(ddy) > Math.abs(ddx)) {
        // It's a vertical scroll → release.
        drag.current = null;
        return;
      }
      if (ddx > 8) {
        d.locked = true;
        setDragging(true);
        try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* noop */ }
      } else return;
    }
    d.lastX = e.clientX; d.lastT = performance.now();
    setDx(Math.max(0, ddx));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.locked) return;
    setDragging(false);
    const dt = Math.max(1, performance.now() - d.lastT);
    const v = (e.clientX - d.lastX) / dt; // px/ms
    const passDist = dx > d.width * 0.35;
    const passVel = v > 0.6;
    if (passDist || passVel) {
      fx.haptic("snap");
      // Animate out fully, then close
      setDx(d.width);
      setTimeout(() => onClose(), 220);
    } else {
      setDx(0);
    }
  };

  const tx = open ? dx : (ref.current?.offsetWidth ?? 9999);
  const progress = open && ref.current ? Math.min(1, dx / ref.current.offsetWidth) : (open ? 0 : 1);

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex", flexDirection: "column",
        background: "var(--surface-1)",
        transform: `translate3d(${tx}px, 0, 0)`,
        transition: dragging ? "none" : "transform 320ms var(--easing-ios)",
        boxShadow: open ? `-${12 * (1 - progress)}px 0 32px hsla(0,0%,0%,${0.45 * (1 - progress)})` : undefined,
        willChange: "transform",
        pointerEvents: open ? "auto" : "none",
        touchAction: "pan-y",
      }}
    >
      {children}
    </div>
  );
}
