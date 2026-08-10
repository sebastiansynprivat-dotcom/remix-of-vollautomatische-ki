/**
 * Template-Vererbung: ein Profil kann Einstellungen von einem Master-Template
 * erben. Ein Feld gilt als „überschrieben", wenn es im Kind gesetzt ist.
 * Leere Objekte zählen als „nicht überschrieben" (chat_behavior ist NOT NULL).
 */

export const INHERITABLE_FIELDS = [
  "persona_config",
  "step_config",
  "limits",
  "chat_behavior",
  "persona",
  "tone_of_voice",
  "writing_style",
] as const;

export type InheritableField = (typeof INHERITABLE_FIELDS)[number];

export const FIELD_LABEL: Record<InheritableField, string> = {
  persona_config: "Kommunikationsstil (Persona-Config)",
  step_config: "Stufen (Verkaufstreppe)",
  limits: "Schutz-Limits",
  chat_behavior: "Chat-Verhalten",
  persona: "Persona (Freitext)",
  tone_of_voice: "Tone of Voice",
  writing_style: "Schreibstil",
};

type AnyProfile = Record<string, unknown> & { id?: string; parent_template_id?: string | null };

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

/** Ist das Feld im Kind eigenständig gesetzt (überschrieben)? */
export function isOverridden(profile: AnyProfile, field: InheritableField): boolean {
  return !isEmpty(profile[field]);
}

/**
 * Wert eines Feldes auflösen: eigener Wert → Template-Wert → Default.
 * `getParent` liefert das übergeordnete Profil (oder null).
 */
export function resolveField<T = unknown>(
  profile: AnyProfile | null | undefined,
  field: InheritableField,
  getParent: (id: string) => AnyProfile | null | undefined,
  fallback: T | null = null,
  depth = 0,
): T | null {
  if (!profile || depth > 5) return fallback;
  if (!isEmpty(profile[field])) return profile[field] as T;
  const parentId = profile.parent_template_id;
  if (parentId) {
    const parent = getParent(String(parentId));
    if (parent) return resolveField<T>(parent, field, getParent, fallback, depth + 1);
  }
  return fallback;
}

/** Alle vererbbaren Felder eines Kindes gegen sein Template auflösen. */
export function resolveProfile(
  profile: AnyProfile,
  getParent: (id: string) => AnyProfile | null | undefined,
): AnyProfile {
  const out: AnyProfile = { ...profile };
  for (const f of INHERITABLE_FIELDS) {
    out[f] = resolveField(profile, f, getParent, null);
  }
  return out;
}

/** Leerwert für ein Feld, wenn eine Überschreibung aufgehoben wird. */
export function clearedValue(field: InheritableField): unknown {
  return field === "chat_behavior" ? {} : null;
}
