import { useCopilotBrief, useCopilotLoading, useCopilotError } from "@/lib/chatStore";

const moodColor: Record<string, string> = {
  "kalt": "hsl(210, 30%, 55%)",
  "neutral": "hsl(40, 8%, 60%)",
  "warm": "hsl(35, 70%, 60%)",
  "heiß": "hsl(18, 80%, 60%)",
  "sehr heiß": "hsl(0, 75%, 60%)",
};

const intentLabel: Record<string, string> = {
  "neutral": "Kaufbereitschaft neutral",
  "niedrig": "Kaufbereitschaft niedrig",
  "mittel": "Kaufbereitschaft mittel",
  "hoch": "Kaufbereitschaft hoch",
  "jetzt-pushen": "JETZT pushen",
};

export function SalesIntelBar({ convId }: { convId: string; fanId?: string }) {
  const brief = useCopilotBrief(convId);
  const loading = useCopilotLoading(convId);
  const error = useCopilotError(convId);

  const trendArrow = brief?.sentiment.trend === "up" ? "↗" : brief?.sentiment.trend === "down" ? "↘" : "→";
  const moodC = brief ? moodColor[brief.sentiment.mood] : "hsla(0,0%,100%,0.2)";
  const isHot = brief && (brief.sentiment.mood === "heiß" || brief.sentiment.mood === "sehr heiß");

  const CHIP_H = 28;
  const chipBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    height: CHIP_H, padding: "0 10px", borderRadius: 8,
    fontSize: 11, lineHeight: 1, whiteSpace: "nowrap",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 20px",
      borderBottom: "1px solid hsla(0,0%,100%,0.05)",
      background: "linear-gradient(180deg, hsla(40,30%,10%,0.35), hsla(0,0%,100%,0.01))",
      fontSize: 11, color: "var(--text-muted)",
      minHeight: 44,
    }}>
      {/* Mood */}
      <div style={{
        ...chipBase,
        background: `color-mix(in oklab, ${moodC} 14%, transparent)`,
        border: `1px solid color-mix(in oklab, ${moodC} 45%, transparent)`,
        color: "var(--text-strong)",
        animation: isHot ? "intelPulse 1.6s ease-in-out infinite" : undefined,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: moodC, boxShadow: isHot ? `0 0 8px ${moodC}` : undefined }} />
        <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{brief?.sentiment.mood ?? (loading ? "…" : "—")}</span>
        {brief && <span className="tabular" style={{ color: "var(--text-subtle)", fontSize: 10 }}>{brief.sentiment.score} {trendArrow}</span>}
      </div>

      {/* Buy Intent */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 180, flex: "0 1 260px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-subtle)", lineHeight: 1 }}>
          <span>{brief ? intentLabel[brief.buyIntent.label] : "Kaufbereitschaft"}</span>
          <span className="tabular">{brief ? `${brief.buyIntent.score}%` : ""}</span>
        </div>
        <div style={{ height: 3, borderRadius: 999, background: "hsla(0,0%,100%,0.06)", overflow: "hidden" }}>
          <div className="gold-gradient-bg" style={{
            height: "100%", width: `${brief?.buyIntent.score ?? 0}%`,
            transition: "width 600ms var(--easing)",
            boxShadow: brief && brief.buyIntent.score > 70 ? "0 0 10px hsla(40,55%,55%,0.6)" : undefined,
          }} />
        </div>
      </div>

      {/* Next step */}
      {brief && (
        <div title={brief.nextPriceStep.reason} style={{
          ...chipBase, gap: 6,
          border: "1px solid var(--gold-dark)",
          color: "var(--gold)",
          background: "hsla(40,55%,55%,0.06)",
          fontWeight: 600,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          {brief.nextPriceStep.type === "tip" ? "TIP" : "PPV"} · {brief.nextPriceStep.amount_eur} €
        </div>
      )}

      {/* Right cluster */}
      <div style={{ display: "flex", gap: 8, flex: 1, justifyContent: "flex-end", alignItems: "center", minWidth: 0 }}>
        {brief && brief.riskFlags.length > 0 && (
          <div style={{
            ...chipBase, gap: 8, paddingLeft: 8,
            border: "1px solid hsla(0,75%,60%,0.25)",
            background: "hsla(0,75%,55%,0.06)",
            minWidth: 0, overflow: "hidden",
          }}>
            <span aria-hidden style={{
              display: "grid", placeItems: "center",
              width: 14, height: 14, borderRadius: 999,
              background: "hsla(0,75%,60%,0.20)",
              color: "hsl(0,80%,80%)", fontSize: 9, fontWeight: 700, lineHeight: 1,
            }}>!</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center", overflow: "hidden" }}>
              {brief.riskFlags.slice(0, 3).map((f, i) => (
                <span key={f} style={{
                  fontSize: 10.5, fontWeight: 500,
                  color: "hsl(0,75%,84%)",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis", overflow: "hidden",
                }}>{i > 0 && <span style={{ color: "hsla(0,75%,60%,0.35)", marginRight: 6 }}>·</span>}{f}</span>
              ))}
            </div>
          </div>
        )}
        {error && <span style={{ color: "var(--text-subtle)" }}>{error}</span>}

      </div>

      <style>{`
        @keyframes intelPulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklab, ${moodC} 35%, transparent); }
          50%      { box-shadow: 0 0 0 6px color-mix(in oklab, ${moodC} 0%, transparent); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
