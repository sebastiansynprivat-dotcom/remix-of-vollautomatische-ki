import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { INHERITABLE_FIELDS, FIELD_LABEL, clearedValue, isOverridden, type InheritableField } from "@/lib/templateInheritance";

type TemplateOption = { id: string; display_name: string };

/** Kinder eines Templates zählen + Sync-Zeitstempel setzen. */
export async function syncTemplateChildren(masterId: string): Promise<number> {
  const { data } = await supabase
    .from("model_profiles")
    .select("id")
    .eq("parent_template_id", masterId);
  return (data ?? []).length;
}

export function TemplateSection({
  profile, set,
}: {
  profile: any;
  set: (k: string, v: any) => void;
}) {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [childCount, setChildCount] = useState(0);
  const [parent, setParent] = useState<any | null>(null);

  const parentId: string | null = profile.parent_template_id ?? null;
  const isTemplate: boolean = !!profile.is_template;

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("model_profiles")
      .select("id, display_name")
      .eq("is_template", true)
      .neq("id", profile.id)
      .order("display_name");
    setTemplates((data ?? []) as TemplateOption[]);

    if (isTemplate) {
      const { count } = await supabase
        .from("model_profiles")
        .select("id", { count: "exact", head: true })
        .eq("parent_template_id", profile.id);
      setChildCount(Number(count ?? 0));
    }
  }, [profile.id, isTemplate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      if (!parentId) { setParent(null); return; }
      const { data } = await supabase.from("model_profiles").select("*").eq("id", parentId).maybeSingle();
      setParent(data ?? null);
    })();
  }, [parentId]);

  if (isTemplate) {
    return (
      <div style={{
        borderTop: "1px solid var(--hairline)", paddingTop: 16, marginTop: 4,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="kpi-label" style={{ color: "var(--text-subtle)" }}>Template</span>
          <span style={{
            padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: "hsla(239,84%,62%,0.12)", border: "1px solid hsla(239,84%,62%,0.28)",
            color: "hsl(239 84% 76%)",
          }}>Template</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)" }}>
          {childCount} {childCount === 1 ? "Profil erbt" : "Profile erben"} von diesem Template
        </div>
        <div style={{ fontSize: 11.5, color: "hsl(43 96% 70%)" }}>
          Änderungen an diesem Template betreffen alle erbenden Profile
        </div>
        <button
          className="shex-btn shex-btn-ghost"
          style={{ alignSelf: "flex-start", fontSize: 11.5 }}
          onClick={() => set("is_template", false)}
        >
          Template aufheben
        </button>
      </div>
    );
  }

  return (
    <div style={{
      borderTop: "1px solid var(--hairline)", paddingTop: 16, marginTop: 4,
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div className="kpi-label" style={{ color: "var(--text-subtle)" }}>Template</div>

      <label style={{ display: "block" }}>
        <span className="shex-field-label" style={{ display: "block", marginBottom: 6 }}>Erbt von</span>
        <select
          className="shex-input"
          value={parentId ?? ""}
          onChange={(e) => set("parent_template_id", e.target.value || null)}
        >
          <option value="">Kein Template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.display_name} Template</option>
          ))}
        </select>
      </label>

      {parentId && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {INHERITABLE_FIELDS.map((f: InheritableField) => {
            const overridden = isOverridden(profile, f);
            return (
              <div key={f} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, padding: "8px 12px", borderRadius: 8,
                background: "#18181D", border: "1px solid #1E1E22",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text-strong)" }}>{FIELD_LABEL[f]}</div>
                  {!overridden && (
                    <span style={{
                      display: "inline-block", marginTop: 4,
                      fontSize: 11, color: "var(--text-subtle)",
                      background: "var(--surface-3)", padding: "1px 6px", borderRadius: 4,
                    }}>geerbt</span>
                  )}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={overridden}
                    onChange={(e) => {
                      if (e.target.checked) {
                        set(f, parent ? (parent as any)[f] ?? clearedValue(f) : clearedValue(f));
                      } else {
                        set(f, clearedValue(f));
                      }
                    }}
                  />
                  <span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>Überschreiben</span>
                </label>
              </div>
            );
          })}
        </div>
      )}

      <button
        className="shex-btn"
        style={{ alignSelf: "flex-start" }}
        onClick={() => { set("is_template", true); toast.success("Profil als Template gespeichert"); }}
      >
        Als Template speichern
      </button>
    </div>
  );
}
