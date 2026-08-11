import type { ActiveWindow, ChatBehavior } from "@/lib/modelBehavior";

/**
 * Aktivzeiten: beliebig viele Zeitfenster pro Tag + Verzögerungs-Multiplikator
 * für die Zeit außerhalb dieser Fenster (fest oder variabel).
 */
export function ActiveHoursEditor({ b, setB }: {
  b: ChatBehavior;
  setB: (patch: Partial<ChatBehavior>) => void;
}) {
  const windows: ActiveWindow[] = b.activeWindows?.length
    ? b.activeWindows
    : [{ from: b.activeFrom, to: b.activeTo }];

  const commit = (list: ActiveWindow[]) => {
    const safe = list.length ? list : [{ from: "08:00", to: "23:59" }];
    setB({ activeWindows: safe, activeFrom: safe[0].from, activeTo: safe[0].to });
  };

  const patchWin = (i: number, patch: Partial<ActiveWindow>) =>
    commit(windows.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));

  const min = Math.max(1, b.offHoursDelayFactor);
  const max = Math.max(min, b.offHoursDelayFactorMax ?? min);
  const variable = max > min;

  const exampleSec = (f: number) => {
    const s = b.replyDelayMaxSec * f;
    return s >= 90 ? `${(s / 60).toFixed(1)} Min.` : `${s.toFixed(1)} Sek.`;
  };

  return (
    <>
      <div className="module-desc" style={{ margin: 0 }}>
        Innerhalb dieser Fenster antwortet sie normal schnell. Du kannst mehrere Fenster
        pro Tag anlegen (z. B. mittags und abends).
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {windows.map((w, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <label style={{ display: "block" }}>
              <span className="shex-field-label" style={{ display: "block", marginBottom: 6 }}>
                Aktiv von {windows.length > 1 ? `(Fenster ${i + 1})` : ""}
              </span>
              <input type="time" className="shex-input" value={w.from} onChange={(e) => patchWin(i, { from: e.target.value })} />
            </label>
            <label style={{ display: "block" }}>
              <span className="shex-field-label" style={{ display: "block", marginBottom: 6 }}>Aktiv bis</span>
              <input type="time" className="shex-input" value={w.to} onChange={(e) => patchWin(i, { to: e.target.value })} />
            </label>
            <button
              type="button"
              className="shex-btn"
              disabled={windows.length <= 1}
              style={{ opacity: windows.length <= 1 ? 0.4 : 1, height: 38 }}
              onClick={() => commit(windows.filter((_, idx) => idx !== i))}
            >
              Entfernen
            </button>
          </div>
        ))}
        {windows.length < 6 && (
          <button
            type="button"
            className="shex-btn"
            style={{ alignSelf: "flex-start" }}
            onClick={() => commit([...windows, { from: "12:00", to: "14:00" }])}
          >
            + Zeitfenster hinzufügen
          </button>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="kpi-label" style={{ color: "var(--text-subtle)" }}>Verzögerung außerhalb der Aktivzeiten</div>
        <div className="module-desc" style={{ margin: 0 }}>
          Der Wert ist <strong>keine Zeitangabe</strong> (weder Sekunden noch Minuten), sondern ein
          <strong> Multiplikator</strong> auf alle Wartezeiten: 1× = gleich schnell, 3× = dreimal so lange Pausen.
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="shex-btn"
            style={{ opacity: variable ? 0.55 : 1 }}
            onClick={() => setB({ offHoursDelayFactorMax: min })}
          >
            Fester Faktor
          </button>
          <button
            type="button"
            className="shex-btn"
            style={{ opacity: variable ? 1 : 0.55 }}
            onClick={() => setB({ offHoursDelayFactorMax: Math.min(20, min + 2) })}
          >
            Variabel (Bereich)
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: variable ? "1fr 1fr" : "1fr", gap: 12 }}>
          <label style={{ display: "block" }}>
            <span className="shex-field-label" style={{ display: "block", marginBottom: 6 }}>
              {variable ? "Faktor min. (×)" : "Faktor (×)"}
            </span>
            <input
              type="number" step={0.1} min={1} max={20} className="shex-input" value={min}
              onChange={(e) => {
                const v = Math.max(1, Math.min(20, parseFloat(e.target.value) || 1));
                setB({ offHoursDelayFactor: v, offHoursDelayFactorMax: Math.max(v, variable ? max : v) });
              }}
            />
          </label>
          {variable && (
            <label style={{ display: "block" }}>
              <span className="shex-field-label" style={{ display: "block", marginBottom: 6 }}>Faktor max. (×)</span>
              <input
                type="number" step={0.1} min={1} max={20} className="shex-input" value={max}
                onChange={(e) => {
                  const v = Math.max(min, Math.min(20, parseFloat(e.target.value) || min));
                  setB({ offHoursDelayFactorMax: v });
                }}
              />
            </label>
          )}
        </div>

        <div className="module-desc" style={{ margin: 0 }}>
          Beispiel: Antwortverzögerung max. {b.replyDelayMaxSec.toFixed(1)} Sek. wird außerhalb der Aktivzeiten zu{" "}
          {variable ? `${exampleSec(min)} – ${exampleSec(max)} (zufällig pro Antwort)` : exampleSec(min)}.
        </div>
      </div>
    </>
  );
}
