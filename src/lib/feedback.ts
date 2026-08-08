// Tiny haptic + (optional) sound layer. Opt-in via localStorage.
// Sounds are intentionally NOT bundled — kept as a placeholder hook so
// later we can wire short base64 clips without touching call sites.

type Intensity = "tick" | "soft" | "snap";

const KEY_HAPTIC = "fx.haptic";
const KEY_SOUND = "fx.sound";

const isOn = (k: string, def = true) => {
  if (typeof localStorage === "undefined") return def;
  const v = localStorage.getItem(k);
  return v == null ? def : v === "1";
};

export const fx = {
  haptic(i: Intensity = "tick") {
    if (!isOn(KEY_HAPTIC)) return;
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    const ms = i === "snap" ? 18 : i === "soft" ? 12 : 6;
    try { navigator.vibrate(ms); } catch { /* noop */ }
  },
  sound(_name: "send" | "receive" | "tip") {
    if (!isOn(KEY_SOUND, false)) return;
    // Reserved: hook up Audio() with base64 clip when assets exist.
  },
  setHaptic(on: boolean) { localStorage.setItem(KEY_HAPTIC, on ? "1" : "0"); },
  setSound(on: boolean) { localStorage.setItem(KEY_SOUND, on ? "1" : "0"); },
  hapticOn() { return isOn(KEY_HAPTIC); },
  soundOn() { return isOn(KEY_SOUND, false); },
};
