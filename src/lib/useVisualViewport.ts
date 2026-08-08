import { useEffect } from "react";

/**
 * Sets `--kb` on <html> to the current keyboard height (px).
 * Mobile-only effect; on desktops the value stays 0.
 *
 * Uses window.visualViewport (iOS Safari, Android Chrome) – the only reliable
 * way to know the keyboard height in a web context.
 */
export function useVisualViewport() {
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const root = document.documentElement;

    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--kb", `${Math.round(kb)}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.setProperty("--kb", "0px");
    };
  }, []);
}
