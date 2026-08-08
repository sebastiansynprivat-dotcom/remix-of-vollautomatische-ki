import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

type Ctx = {
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  togglePalette: () => void;
  dnaOpen: boolean;
  toggleDna: () => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  // injected by App
  activeId: string | null;
  setActiveId: (id: string) => void;
  conversationIds: string[];
  openCloud: () => void;
};

const ChatUICtx = createContext<Ctx | null>(null);

export function ChatUIProvider({
  children, activeId, setActiveId, conversationIds, openCloud,
}: {
  children: ReactNode;
  activeId: string | null;
  setActiveId: (id: string) => void;
  conversationIds: string[];
  openCloud: () => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dnaOpen, setDnaOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });
  const [helpOpen, setHelpOpen] = useState(false);

  const togglePalette = useCallback(() => setPaletteOpen(v => !v), []);
  const toggleDna = useCallback(() => setDnaOpen(v => !v), []);

  // Persist DNA toggle
  useEffect(() => {
    try {
      const v = localStorage.getItem("chat.dnaOpen");
      if (v != null) setDnaOpen(v === "1");
    } catch (_e) { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("chat.dnaOpen", dnaOpen ? "1" : "0"); } catch (_e) { /* ignore */ }
  }, [dnaOpen]);

  return (
    <ChatUICtx.Provider value={{
      paletteOpen, setPaletteOpen, togglePalette,
      dnaOpen, toggleDna,
      helpOpen, setHelpOpen,
      activeId, setActiveId, conversationIds, openCloud,
    }}>
      {children}
    </ChatUICtx.Provider>
  );
}

export function useChatUI() {
  const v = useContext(ChatUICtx);
  if (!v) throw new Error("useChatUI must be inside ChatUIProvider");
  return v;
}
