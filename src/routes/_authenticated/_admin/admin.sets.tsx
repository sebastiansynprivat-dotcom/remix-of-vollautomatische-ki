import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModelSetsManager } from "@/components/admin/ModelSetsManager";

export const Route = createFileRoute("/_authenticated/_admin/admin/sets")({
  component: SetsPage,
});

type Model = { id: string; display_name: string; handle: string };

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 13,
  background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(255,255,255,0.1)", outline: "none",
};

function SetsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [modelId, setModelId] = useState<string>("");

  useEffect(() => {
    supabase.from("model_profiles").select("id, display_name, handle").order("display_name").then(({ data }) => {
      const ms = (data ?? []) as Model[];
      setModels(ms);
      if (ms[0]) setModelId((cur) => cur || ms[0].id);
    });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>PPV Sets</h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 4 }}>
            Content-Pakete für PPV-Vorschläge. Die KI bekommt diese Liste via API.
          </p>
        </div>
        <select value={modelId} onChange={(e) => setModelId(e.target.value)} style={{ ...input, width: 280 }}>
          {models.map((m) => (
            <option key={m.id} value={m.id} style={{ background: "#1a1010" }}>{m.display_name} · @{m.handle}</option>
          ))}
        </select>
      </header>

      {modelId && <ModelSetsManager modelId={modelId} />}
    </div>
  );
}
