import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/tokens.css";

export const Route = createFileRoute("/voice-sim")({
  head: () => ({
    meta: [
      { title: "Voice-Sim — Coaching-Voice Phasen-Test" },
      { name: "description", content: "Lokaler Simulator für W/G/F/S/C/R Coaching-Voice." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: VoiceSimPage,
});

// ─────────────────────────────────────────────────────────────
// Mock-Szenarien — Brain + Verlauf so getunt, dass die Engine
// im Edge-Function jeweils die Zielphase berechnet.
// ─────────────────────────────────────────────────────────────
type Phase = "W" | "G" | "F" | "S" | "C" | "R" | "BURST";

type Scenario = {
  phase: Phase;
  label: string;
  hint: string;
  fanMeta: { displayName: string; totalSpent_eur: number };
  fanBrain: any;
  messages: { content: string }[];
};

const SCENARIOS: Record<Phase, Scenario> = {
  W: {
    phase: "W",
    label: "W — Welcome (Sek 0–60)",
    hint: "Kein Pitch, kein Flirt. Erstkontakt, Anker setzen.",
    fanMeta: { displayName: "Tom", totalSpent_eur: 0 },
    fanBrain: emptyBrain("Tom"),
    messages: [{ content: "FAN: hey" }],
  },
  G: {
    phase: "G",
    label: "G — Greeting (Msg 2–4)",
    hint: "Mensch erkennen: Name, Stimmung, Tag. Noch kein Flirt.",
    fanMeta: { displayName: "Marc", totalSpent_eur: 0 },
    fanBrain: { ...emptyBrain("Marc"), identity: { name: "Marc" } },
    messages: [
      { content: "MODEL: hey... wie heißt du?" },
      { content: "FAN: marc" },
      { content: "MODEL: schön dich kennenzulernen, marc... wie war dein tag?" },
      { content: "FAN: ganz okay" },
    ],
  },
  F: {
    phase: "F",
    label: "F — Funnel/Qualify",
    hint: "1 Frage pro Antwort. Job/Stadt/Stimmung holen.",
    fanMeta: { displayName: "Jonas", totalSpent_eur: 0 },
    fanBrain: {
      ...emptyBrain("Jonas"),
      identity: { name: "Jonas", job_hint: "ingenieur" },
      emotional: { current_mood: "neutral", loneliness_score: 30, triggers_positive: [], triggers_negative: [] },
    },
    messages: [
      { content: "MODEL: hey jonas... wie war dein tag?" },
      { content: "FAN: lang. arbeit war stress" },
      { content: "MODEL: oh nein, was machst du beruflich?" },
      { content: "FAN: ingenieur" },
      { content: "MODEL: klingt anstrengend... wo wohnst du eigentlich?" },
      { content: "FAN: in köln" },
    ],
  } as any,
  S: {
    phase: "S",
    label: "S — Sexting/Tease",
    hint: "Bridge-Vokabular bevorzugt (Dusche/Outfit/...). Yes-Train vor Pitch.",
    fanMeta: { displayName: "Patrick", totalSpent_eur: 30 },
    fanBrain: {
      identity: { name: "Patrick", job_hint: "architekt", city_hint: "Hamburg", relationship_status: "single" },
      emotional: { current_mood: "horny", loneliness_score: 55, triggers_positive: ["beine", "augenkontakt"], triggers_negative: [] },
      preferences: { kinks: ["lingerie"], turn_offs: [], favorite_bridge: "dusche" },
      commercial: { lifetime_spend: 30, last_purchase_amount: 10, days_since_last_buy: 1, ladder_step: 3, declined_count: 0 },
      relationship: { stage: "regular", days_known: 12, inside_jokes: ["balkon-kaffee"], promises_made: [], nicknames_for_him: ["süßer"] },
      red_flags: { broke_signals: 0, aggression: 0, refund_threats: 0, scammer_score: 0 },
      signals: { bridge_state: "idle", funnel_step: 4, ppv_moment_score: 50 },
    },
    messages: [
      { content: "MODEL: na süßer, schon zuhause?" },
      { content: "FAN: ja grad reingekommen" },
      { content: "MODEL: hab so nen tag gehabt..." },
      { content: "FAN: was ist los?" },
      { content: "MODEL: alles cool, einfach lange. lieg jetzt platt aufm bett" },
      { content: "FAN: hot. was hast du an?" },
    ],
  },
  C: {
    phase: "C",
    label: "C — Conversion (Yes-Train durch, Pitch erlaubt)",
    hint: "Genau 1 Move. Caption knüpft an seine Worte an. Preis aus Leiter.",
    fanMeta: { displayName: "Daniel", totalSpent_eur: 80 },
    fanBrain: {
      identity: { name: "Daniel", job_hint: "anwalt", city_hint: "München", relationship_status: "single" },
      emotional: { current_mood: "horny", loneliness_score: 60, triggers_positive: ["lingerie", "stimme"], triggers_negative: [] },
      preferences: { kinks: ["dirty talk"], turn_offs: [], favorite_bridge: "unterwäsche" },
      commercial: { lifetime_spend: 80, last_purchase_amount: 20, days_since_last_buy: 2, ladder_step: 4, declined_count: 0 },
      relationship: { stage: "regular", days_known: 20, inside_jokes: [], promises_made: [], nicknames_for_him: ["daddy"] },
      red_flags: { broke_signals: 0, aggression: 0, refund_threats: 0, scammer_score: 0 },
      signals: { bridge_state: "fan_ack", funnel_step: 5, ppv_moment_score: 80 },
    },
    messages: [
      { content: "MODEL: hab mir heute neue unterwäsche geholt..." },
      { content: "FAN: zeig mal" },
      { content: "MODEL: meinst du das ernst? 🙈" },
      { content: "FAN: ja unbedingt baby" },
    ],
  },
  R: {
    phase: "R",
    label: "R — Re-engagement (Whale, inaktiv)",
    hint: "Personal Reference, Open Loop, kein Generic-'miss u'.",
    fanMeta: { displayName: "Stefan", totalSpent_eur: 640 },
    fanBrain: {
      identity: { name: "Stefan", job_hint: "unternehmer", city_hint: "Zürich", relationship_status: "verheiratet" },
      emotional: { current_mood: "neutral", loneliness_score: 40, triggers_positive: ["aufmerksamkeit"], triggers_negative: [] },
      preferences: { kinks: [], turn_offs: [], favorite_bridge: "outfit" },
      commercial: { lifetime_spend: 640, last_purchase_amount: 100, days_since_last_buy: 9, ladder_step: 8, declined_count: 1 },
      relationship: { stage: "whale", days_known: 90, inside_jokes: ["münchen-auftrag"], promises_made: [{ text: "schick dir morgen ein video", due: null }], nicknames_for_him: ["daddy"] },
      red_flags: { broke_signals: 0, aggression: 0, refund_threats: 0, scammer_score: 0 },
      signals: { bridge_state: "idle", funnel_step: 4, ppv_moment_score: 30 },
    },
    messages: [
      { content: "MODEL: hey daddy, denk grad an dich" },
      { content: "FAN: hi" },
    ],
  },
  BURST: {
    phase: "BURST",
    label: "BURST — Fan schickt 3 Msgs am Stück",
    hint: "AI muss Haupt-Spur wählen, andere Parts anerkennen, max 1 Frage gesamt.",
    fanMeta: { displayName: "Lukas", totalSpent_eur: 45 },
    fanBrain: {
      identity: { name: "Lukas", job_hint: "lehrer", city_hint: "Berlin" },
      emotional: { current_mood: "horny", loneliness_score: 50, triggers_positive: ["beine"], triggers_negative: [] },
      preferences: { kinks: [], turn_offs: [], favorite_bridge: "dusche" },
      commercial: { lifetime_spend: 45, last_purchase_amount: 10, days_since_last_buy: 3, ladder_step: 3, declined_count: 0 },
      relationship: { stage: "casual", days_known: 8, inside_jokes: [], promises_made: [], nicknames_for_him: ["süßer"] },
      red_flags: { broke_signals: 0, aggression: 0, refund_threats: 0, scammer_score: 0 },
      signals: { bridge_state: "idle", funnel_step: 4, ppv_moment_score: 50 },
    },
    messages: [
      { content: "MODEL: lieg grad mit nem buch im bett" },
      { content: "FAN: was liest du?" },
      { content: "FAN: ich denk grad noch an dein letztes pic" },
      { content: "FAN: war heut auch lange unterwegs, müde" },
    ],
  },
};

function emptyBrain(name?: string) {
  return {
    identity: { name },
    emotional: { current_mood: "neutral", loneliness_score: 0, triggers_positive: [], triggers_negative: [] },
    preferences: { kinks: [], turn_offs: [] },
    commercial: { lifetime_spend: 0, ladder_step: 1, declined_count: 0 },
    relationship: { stage: "unknown", days_known: 0, inside_jokes: [], promises_made: [] },
    red_flags: { broke_signals: 0, aggression: 0, refund_threats: 0, scammer_score: 0 },
    signals: { bridge_state: "idle", funnel_step: 1, ppv_moment_score: 0 },
  };
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
type Persona = "shy" | "horny" | "whale" | "skeptisch" | "lonely" | "chaotic_burster";
type StarterKey = "cold_hey" | "warm_returning" | "dm_after_pic" | "post_purchase";

const STARTERS: Record<StarterKey, { label: string; modelOpener?: string; fanMeta: { displayName: string; totalSpent_eur: number }; fanBrain: any }> = {
  cold_hey: {
    label: "Cold — Fan schreibt zuerst",
    fanMeta: { displayName: "Fan", totalSpent_eur: 0 },
    fanBrain: emptyBrain(),
  },
  warm_returning: {
    label: "Warm — kennt sich seit 2 Wochen",
    modelOpener: "hey du, schon zurück?",
    fanMeta: { displayName: "Fan", totalSpent_eur: 25 },
    fanBrain: { ...emptyBrain(), commercial: { lifetime_spend: 25, ladder_step: 2, declined_count: 0 }, relationship: { stage: "regular", days_known: 14, inside_jokes: [], promises_made: [], nicknames_for_him: [] }, signals: { bridge_state: "idle", funnel_step: 3, ppv_moment_score: 30 } },
  },
  dm_after_pic: {
    label: "DM nach Pic — er hat grad ein Bild gesehen",
    modelOpener: "na, gefällt dir was du siehst? 🙈",
    fanMeta: { displayName: "Fan", totalSpent_eur: 10 },
    fanBrain: { ...emptyBrain(), emotional: { current_mood: "horny", loneliness_score: 40, triggers_positive: [], triggers_negative: [] }, signals: { bridge_state: "armed", funnel_step: 4, ppv_moment_score: 60 } },
  },
  post_purchase: {
    label: "Post-Purchase — hat grad gekauft",
    modelOpener: "danke baby 🥺 hat dir gefallen?",
    fanMeta: { displayName: "Fan", totalSpent_eur: 60 },
    fanBrain: { ...emptyBrain(), commercial: { lifetime_spend: 60, last_purchase_amount: 15, days_since_last_buy: 0, ladder_step: 4, declined_count: 0 }, signals: { bridge_state: "bought", funnel_step: 6, ppv_moment_score: 40 } },
  },
};

type Turn = {
  side: "fan" | "model";
  texts: string[];      // 1..3 (für model: text, text2, text3)
  spec?: any;
  burst?: any;
  ts: number;
};

function VoiceSimPage() {
  const [mode, setMode] = useState<"auto" | "manual">("auto");

  // ─── manual state ────────────────────────────────
  const [phase, setPhase] = useState<Phase>("W");
  const [results, setResults] = useState<Record<Phase, any>>({} as any);
  const [loading, setLoading] = useState<Phase | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── auto-play state ─────────────────────────────
  const [persona, setPersona] = useState<Persona>("shy");
  const [starter, setStarter] = useState<StarterKey>("cold_hey");
  const [maxTurns, setMaxTurns] = useState(20);
  const [speed, setSpeed] = useState<"fast" | "normal" | "step">("normal");
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);
  const pauseRef = useRef(false);
  const stepGateRef = useRef<(() => void) | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  function waitMs(ms: number) {
    return new Promise<void>(res => setTimeout(res, ms));
  }
  function waitForStep() {
    return new Promise<void>(res => { stepGateRef.current = res; });
  }
  async function gate() {
    while (pauseRef.current && !stopRef.current) {
      await waitMs(150);
    }
    if (speed === "step") {
      await waitForStep();
    } else {
      await waitMs(speed === "fast" ? 200 : 800);
    }
  }

  async function startAutoPlay() {
    if (running) return;
    stopRef.current = false;
    pauseRef.current = false;
    setRunning(true);
    setError(null);

    const cfg = STARTERS[starter];
    const initial: Turn[] = cfg.modelOpener
      ? [{ side: "model", texts: [cfg.modelOpener], ts: Date.now() }]
      : [];
    setTranscript(initial);

    const history: { role: "fan" | "model"; text: string }[] = initial.map(t => ({ role: t.side, text: t.texts[0] }));
    let detectedName: string | undefined;

    try {
      for (let turn = 0; turn < maxTurns && !stopRef.current; turn++) {
        // ── Fan-Bot call ─────────────────────
        const fanRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fan-sim-bot`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ persona, history, turn }),
          }
        );
        if (!fanRes.ok) throw new Error(`fan-sim-bot ${fanRes.status}`);
        const fanData = await fanRes.json();
        if (stopRef.current) break;

        const fanMessages: string[] = (fanData.messages ?? []).filter((s: string) => s && s.trim());
        if (!fanMessages.length) break;

        // detect name on first short reply
        if (!detectedName && turn <= 2) {
          const candidate = fanMessages[0].trim().split(/\s+/)[0];
          if (/^[a-zA-ZäöüÄÖÜß]{2,15}$/.test(candidate) && !["ja","nein","hey","hi","hallo","ok","okay","gut","danke"].includes(candidate.toLowerCase())) {
            detectedName = candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
          }
        }

        for (const m of fanMessages) history.push({ role: "fan", text: m });
        setTranscript(prev => [...prev, { side: "fan", texts: fanMessages, ts: Date.now() }]);

        if (fanData.end) break;
        await gate();
        if (stopRef.current) break;

        // ── Copilot call ──────────────────────
        const fanBrain = JSON.parse(JSON.stringify(cfg.fanBrain));
        if (detectedName) fanBrain.identity.name = detectedName;
        // light mood-bump every 5 turns
        if (turn >= 5 && fanBrain.signals) fanBrain.signals.funnel_step = Math.min(7, (fanBrain.signals.funnel_step ?? 1) + Math.floor(turn / 5));

        const messagesForCopilot = history.map(h => ({
          content: `${h.role === "fan" ? "FAN" : "MODEL"}: ${h.text}`,
        }));

        const { data: copilotData, error: copErr } = await supabase.functions.invoke("chat-copilot", {
          body: {
            messages: messagesForCopilot,
            fanMeta: { ...cfg.fanMeta, displayName: detectedName ?? cfg.fanMeta.displayName },
            modelPersona: { displayName: "Lia", style: "premium, warm, führend" },
            knownFacts: {},
            fanBrain,
          },
        });
        if (copErr) throw copErr;
        if (stopRef.current) break;

        const slot = copilotData?.suggestions?.[0];
        if (!slot) break;
        const modelTexts = [slot.text, slot.text2, slot.text3].filter(Boolean) as string[];
        if (!modelTexts.length) break;

        for (const t of modelTexts) history.push({ role: "model", text: t });
        setTranscript(prev => [...prev, {
          side: "model",
          texts: modelTexts,
          spec: copilotData.spec,
          burst: copilotData.burst,
          ts: Date.now(),
        }]);

        await gate();
      }
    } catch (e: any) {
      setError(e?.message ?? "Auto-Play Fehler");
    } finally {
      setRunning(false);
      stopRef.current = false;
      pauseRef.current = false;
    }
  }

  function pauseAuto() { pauseRef.current = !pauseRef.current; }
  function stepOnce() {
    if (stepGateRef.current) { const r = stepGateRef.current; stepGateRef.current = null; r(); }
  }
  function stopAuto() { stopRef.current = true; stepOnce(); }
  function resetAuto() { stopAuto(); setTranscript([]); }

  function copyTranscript() {
    const md = transcript.map(t => {
      if (t.side === "fan") return t.texts.map(x => `**FAN:** ${x}`).join("\n");
      const tags = t.spec ? ` _[step ${t.spec.funnelStep}/7 · bridge:${t.spec.bridgeState} · ppv:${t.spec.ppvMomentScore}]_` : "";
      return t.texts.map((x, i) => `**MODEL${i ? `(${i + 1})` : ""}:** ${x}${i === 0 ? tags : ""}`).join("\n");
    }).join("\n\n");
    navigator.clipboard?.writeText(md);
  }


  async function run(p: Phase) {
    setLoading(p);
    setError(null);
    try {
      const sc = SCENARIOS[p];
      const { data, error: err } = await supabase.functions.invoke("chat-copilot", {
        body: {
          messages: sc.messages,
          fanMeta: sc.fanMeta,
          modelPersona: { displayName: "Lia", style: "premium, warm, führend" },
          knownFacts: {},
          fanBrain: sc.fanBrain,
        },
      });
      if (err) throw err;
      setResults(prev => ({ ...prev, [p]: data }));
    } catch (e: any) {
      setError(e?.message ?? "Fehler beim Aufruf");
    } finally {
      setLoading(null);
    }
  }

  async function runAll() {
    setLoading("all");
    setError(null);
    for (const p of Object.keys(SCENARIOS) as Phase[]) {
      await run(p);
    }
    setLoading(null);
  }

  const sc = SCENARIOS[phase];
  const res = results[phase];

  return (
    <div style={{ background: "var(--surface-1, #0b0b0e)", minHeight: "100vh", color: "var(--text-strong, #eee)", padding: "24px 28px", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.4 }}>Voice-Sim — Coaching-Voice Phasen-Test</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.7, fontSize: 13 }}>
          <b>Auto-Play:</b> Fan-Bot (Persona) chattet automatisch gegen <code style={{ color: "var(--accent, #d4af37)" }}>chat-copilot</code>. <b>Manual:</b> Step durch W → G → F → S → C → R mit fixen Mock-Verläufen.
        </p>
      </header>

      {/* Mode switch */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["auto", "manual"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "8px 14px", fontSize: 12, fontWeight: 700, borderRadius: 8,
            border: "1px solid hsla(0,0%,100%,0.1)",
            background: mode === m ? "var(--accent, #d4af37)" : "hsla(0,0%,100%,0.04)",
            color: mode === m ? "#1a1408" : "var(--text-strong, #eee)",
            cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.6,
          }}>{m === "auto" ? "▶ Auto-Play" : "Manual W/G/F/S/C/R"}</button>
        ))}
      </div>

      {mode === "auto" && (
        <AutoPlaySection
          persona={persona} setPersona={setPersona}
          starter={starter} setStarter={setStarter}
          maxTurns={maxTurns} setMaxTurns={setMaxTurns}
          speed={speed} setSpeed={setSpeed}
          transcript={transcript}
          running={running}
          start={startAutoPlay} pause={pauseAuto} step={stepOnce} stop={stopAuto} reset={resetAuto}
          copy={copyTranscript}
          error={error}
          transcriptEndRef={transcriptEndRef}
        />
      )}

      {mode === "manual" && (
        <ManualSection {...{ phase, setPhase, results, loading, error, run, runAll }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Auto-Play UI
// ─────────────────────────────────────────────────────────────
function AutoPlaySection(props: {
  persona: Persona; setPersona: (p: Persona) => void;
  starter: StarterKey; setStarter: (s: StarterKey) => void;
  maxTurns: number; setMaxTurns: (n: number) => void;
  speed: "fast" | "normal" | "step"; setSpeed: (s: "fast" | "normal" | "step") => void;
  transcript: Turn[]; running: boolean;
  start: () => void; pause: () => void; step: () => void; stop: () => void; reset: () => void;
  copy: () => void; error: string | null;
  transcriptEndRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const { persona, setPersona, starter, setStarter, maxTurns, setMaxTurns, speed, setSpeed,
    transcript, running, start, pause, step, stop, reset, copy, error, transcriptEndRef } = props;

  const personaOpts: { v: Persona; label: string }[] = [
    { v: "shy", label: "schüchtern" },
    { v: "horny", label: "horny" },
    { v: "whale", label: "whale" },
    { v: "skeptisch", label: "skeptisch" },
    { v: "lonely", label: "einsam" },
    { v: "chaotic_burster", label: "chaotic burster" },
  ];

  const lastModel = [...transcript].reverse().find(t => t.side === "model");

  return (
    <>
      {/* Controls */}
      <section style={{ ...cardStyle(), marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
          <Field label="Persona">
            <select value={persona} onChange={e => setPersona(e.target.value as Persona)} style={selectStyle()} disabled={running}>
              {personaOpts.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Start">
            <select value={starter} onChange={e => setStarter(e.target.value as StarterKey)} style={selectStyle()} disabled={running}>
              {Object.entries(STARTERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Turns">
            <input type="number" min={3} max={40} value={maxTurns} onChange={e => setMaxTurns(Math.max(3, Math.min(40, Number(e.target.value) || 20)))} style={selectStyle()} disabled={running} />
          </Field>
          <Field label="Speed">
            <select value={speed} onChange={e => setSpeed(e.target.value as any)} style={selectStyle()}>
              <option value="fast">schnell (200ms)</option>
              <option value="normal">normal (800ms)</option>
              <option value="step">step (klick)</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {!running && <button onClick={start} style={btnPrimary(false)}>▶ Auto-Play starten</button>}
          {running && <button onClick={pause} style={btnGhost(false)}>⏸ Pause/Resume</button>}
          {running && speed === "step" && <button onClick={step} style={btnGhost(false)}>⏭ Step</button>}
          {running && <button onClick={stop} style={btnGhost(false)}>⏹ Stop</button>}
          <button onClick={reset} style={btnGhost(running)} disabled={running}>↺ Reset</button>
          <div style={{ flex: 1 }} />
          <button onClick={copy} style={btnGhost(false)} disabled={!transcript.length}>📋 Copy Transcript</button>
        </div>
      </section>

      {error && (
        <div style={{ padding: 12, background: "hsla(0,70%,50%,0.12)", border: "1px solid hsla(0,70%,50%,0.3)", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Live transcript + spec rail */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 16 }}>
        <section style={cardStyle()}>
          <h2 style={h2Style()}>Live Verlauf {running && <span style={{ marginLeft: 6, color: "#7ee787" }}>● läuft</span>}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
            {transcript.length === 0 && (
              <p style={{ opacity: 0.4, fontSize: 13 }}>Noch nichts. Wähle Persona + Start, dann ▶.</p>
            )}
            {transcript.map((t, i) => {
              const isFan = t.side === "fan";
              return (
                <div key={i} style={{
                  alignSelf: isFan ? "flex-end" : "flex-start",
                  background: isFan ? "hsla(210,80%,55%,0.18)" : "hsla(40,60%,50%,0.10)",
                  border: `1px solid ${isFan ? "hsla(210,80%,55%,0.3)" : "hsla(40,70%,55%,0.25)"}`,
                  padding: "8px 12px", borderRadius: 12, maxWidth: "85%", fontSize: 13.5, lineHeight: 1.45,
                }}>
                  <div style={{ fontSize: 9.5, opacity: 0.6, marginBottom: 3, fontWeight: 700, letterSpacing: 0.4 }}>
                    {isFan ? "FAN" : "MODEL"}
                    {!isFan && t.spec && <> · step {t.spec.funnelStep}/7 · {t.spec.bridgeState} · ppv {t.spec.ppvMomentScore}</>}
                    {!isFan && t.burst && <> · 🌀 burst {t.burst.count}</>}
                  </div>
                  {t.texts.map((x, j) => (
                    <div key={j} style={{ marginTop: j ? 4 : 0, opacity: j ? 0.85 : 1, fontStyle: j ? "italic" : "normal" }}>
                      {j > 0 && "↳ "}{x}
                    </div>
                  ))}
                </div>
              );
            })}
            <div ref={transcriptEndRef} />
          </div>
        </section>

        <section style={cardStyle()}>
          <h2 style={h2Style()}>Spec (letzte Model-Antwort)</h2>
          {!lastModel?.spec && <p style={{ opacity: 0.5, fontSize: 13 }}>Noch keine Antwort.</p>}
          {lastModel?.spec && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Chip>step {lastModel.spec.funnelStep}/7</Chip>
              <Chip>bridge: {lastModel.spec.bridgeState}</Chip>
              <Chip>ppv: {lastModel.spec.ppvMomentScore}</Chip>
              <Chip>tones: {(lastModel.spec.allowedTones ?? []).join(", ")}</Chip>
              <Chip>price: {lastModel.spec.nextPriceEur}€</Chip>
              {lastModel.spec.isWhale && <Chip warn>WHALE</Chip>}
              {lastModel.burst && <Chip accent>🌀 burst {lastModel.burst.count} (main #{lastModel.burst.mainIndex + 1})</Chip>}
            </div>
          )}
          <div style={{ marginTop: 16, fontSize: 11, opacity: 0.5, lineHeight: 1.5 }}>
            Persona-Tipp: <b>chaotic burster</b> triggert oft 2–3-Msg-Bursts → testet das neue Burst-Handling. <b>einsam</b> liefert lange emotionale Texte. <b>skeptisch</b> stresst den Pitch.
          </div>
        </section>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, opacity: 0.85, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      {children}
    </label>
  );
}
function selectStyle(): React.CSSProperties {
  return {
    padding: "7px 10px", fontSize: 13, borderRadius: 8,
    background: "hsla(0,0%,100%,0.05)", color: "var(--text-strong, #eee)",
    border: "1px solid hsla(0,0%,100%,0.1)",
  };
}
function cardStyle(): React.CSSProperties {
  return {
    background: "hsla(0,0%,100%,0.025)",
    border: "1px solid hsla(0,0%,100%,0.06)",
    borderRadius: 12, padding: "16px 18px",
  };
}
function h2Style(): React.CSSProperties {
  return { fontSize: 13, fontWeight: 700, margin: "0 0 10px", color: "var(--accent, #d4af37)", textTransform: "uppercase", letterSpacing: 0.6 };
}

// ─────────────────────────────────────────────────────────────
// Manual section (existing UI extracted)
// ─────────────────────────────────────────────────────────────
function ManualSection(props: {
  phase: Phase; setPhase: (p: Phase) => void;
  results: Record<Phase, any>;
  loading: Phase | "all" | null;
  error: string | null;
  run: (p: Phase) => Promise<void>;
  runAll: () => Promise<void>;
}) {
  const { phase, setPhase, results, loading, error, run, runAll } = props;
  const sc = SCENARIOS[phase];
  const res = results[phase];
  return (
    <>
      {/* Phase tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {(Object.keys(SCENARIOS) as Phase[]).map(p => {
          const active = phase === p;
          const has = !!results[p];
          return (
            <button
              key={p}
              onClick={() => setPhase(p)}
              style={{
                padding: "8px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8,
                border: "1px solid hsla(0,0%,100%,0.08)",
                background: active ? "var(--accent, #d4af37)" : "hsla(0,0%,100%,0.03)",
                color: active ? "#1a1408" : "var(--text-strong, #eee)",
                cursor: "pointer", display: "flex", gap: 6, alignItems: "center",
              }}
            >
              <span>{SCENARIOS[p].label}</span>
              {has && <span style={{ width: 6, height: 6, borderRadius: 99, background: active ? "#1a1408" : "#7ee787" }} />}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => run(phase)}
          disabled={loading !== null}
          style={btnPrimary(loading !== null)}
        >
          {loading === phase ? "läuft…" : `▶ Run ${phase}`}
        </button>
        <button onClick={runAll} disabled={loading !== null} style={btnGhost(loading !== null)}>
          {loading === "all" ? "läuft alle…" : "▶ Run all"}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: "hsla(0,70%,50%,0.12)", border: "1px solid hsla(0,70%,50%,0.3)", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Two cols: scenario + result */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)", gap: 16 }}>
        {/* Scenario */}
        <section style={card()}>
          <h2 style={h2()}>Szenario</h2>
          <p style={{ fontSize: 13, opacity: 0.75, margin: "0 0 10px" }}>{sc.hint}</p>

          <KV k="Fan" v={`${sc.fanMeta.displayName} · ${sc.fanMeta.totalSpent_eur}€ lifetime`} />
          <KV k="Mood" v={sc.fanBrain.emotional?.current_mood ?? "—"} />
          <KV k="Bridge-state" v={sc.fanBrain.signals?.bridge_state ?? "idle"} />
          <KV k="Stage" v={sc.fanBrain.relationship?.stage ?? "—"} />

          <h3 style={h3()}>Verlauf</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sc.messages.map((m, i) => {
              const isFan = /^FAN:/i.test(m.content);
              return (
                <div key={i} style={{
                  alignSelf: isFan ? "flex-end" : "flex-start",
                  background: isFan ? "hsla(210,80%,55%,0.18)" : "hsla(0,0%,100%,0.05)",
                  border: "1px solid hsla(0,0%,100%,0.06)",
                  padding: "7px 11px", borderRadius: 10, maxWidth: "88%", fontSize: 13, lineHeight: 1.45,
                }}>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2, fontWeight: 600 }}>{isFan ? "FAN" : "MODEL"}</div>
                  {m.content.replace(/^(FAN|MODEL):\s*/i, "")}
                </div>
              );
            })}
          </div>
        </section>

        {/* Result */}
        <section style={card()}>
          <h2 style={h2()}>Ergebnis (echte Edge-Function-Antwort)</h2>
          {!res && <p style={{ opacity: 0.5, fontSize: 13 }}>Noch kein Run für diese Phase.</p>}
          {res && (
            <>
              {/* Spec line */}
              {res.spec && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  <Chip>step {res.spec.funnelStep}/7</Chip>
                  <Chip>bridge: {res.spec.bridgeState}</Chip>
                  <Chip>ppv-score: {res.spec.ppvMomentScore}</Chip>
                  <Chip>tones: {(res.spec.allowedTones ?? []).join(", ")}</Chip>
                  <Chip>nextPrice: {res.spec.nextPriceEur}€</Chip>
                  {res.spec.isWhale && <Chip warn>WHALE</Chip>}
                  {res.spec.isAfterCareLocked && <Chip warn>AFTER-CARE-LOCK</Chip>}
                  {res.burst && <Chip accent>🌀 burst {res.burst.count} (main #{res.burst.mainIndex + 1}: {res.burst.parts[res.burst.mainIndex]?.category})</Chip>}
                </div>
              )}

              {/* Suggestions */}
              <h3 style={h3()}>Suggestions</h3>
              {(res.suggestions ?? []).map((s: any, i: number) => (
                <div key={i} style={{
                  padding: "10px 12px", border: "1px solid hsla(0,0%,100%,0.08)",
                  borderRadius: 10, marginBottom: 8, background: "hsla(0,0%,100%,0.02)",
                }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                    <Chip>slot {i + 1}</Chip>
                    <Chip>{s.tone}</Chip>
                    {s.phase && <Chip>phase {s.phase}</Chip>}
                    {s.type && <Chip>{s.type}</Chip>}
                    {s.voice_anchor && <Chip accent>🎙 {s.voice_anchor}</Chip>}
                    {s.cialdini && <Chip>{s.cialdini}</Chip>}
                    {s.yes_train_used && <Chip accent>yes-train ✓</Chip>}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 500 }}>{s.text}</div>
                  {s.text2 && (
                    <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 4, opacity: 0.85, fontStyle: "italic" }}>
                      ↳ {s.text2}
                    </div>
                  )}
                  {s.text3 && (
                    <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 4, opacity: 0.7, fontStyle: "italic" }}>
                      ↳↳ {s.text3}
                    </div>
                  )}
                  {s.why && <div style={{ fontSize: 11, opacity: 0.55, marginTop: 6 }}>why: {s.why}</div>}
                  {Array.isArray(s.anti_pattern_check) && s.anti_pattern_check.length > 0 && (
                    <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>checked: {s.anti_pattern_check.join(", ")}</div>
                  )}
                </div>
              ))}

              {/* PPV */}
              {res.ppvHint && (
                <>
                  <h3 style={h3()}>PPV-Hint</h3>
                  <div style={{ padding: 10, borderRadius: 10, border: "1px solid hsla(40,60%,50%,0.3)", background: "hsla(40,40%,15%,0.25)", fontSize: 13 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                      <Chip>{res.ppvHint.ready ? "READY" : "blocked"}</Chip>
                      {res.ppvHint.ready && <Chip>{res.ppvHint.suggested_price_eur}€</Chip>}
                      {res.ppvHint.ready && <Chip>{res.ppvHint.media_type}</Chip>}
                    </div>
                    {res.ppvHint.caption && <div style={{ fontStyle: "italic" }}>"{res.ppvHint.caption}"</div>}
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{res.ppvHint.why}</div>
                  </div>
                </>
              )}

              {/* Sentiment / buy */}
              <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                {res.sentiment && <span>mood: {res.sentiment.mood} ({res.sentiment.score}, {res.sentiment.trend})</span>}
                {res.buyIntent && <span>buy: {res.buyIntent.label} ({res.buyIntent.score})</span>}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

// ─── tiny ui helpers ──────────────────────────────────────────
function card(): React.CSSProperties {
  return {
    background: "hsla(0,0%,100%,0.025)",
    border: "1px solid hsla(0,0%,100%,0.06)",
    borderRadius: 12, padding: "16px 18px",
  };
}
function h2(): React.CSSProperties {
  return { fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: "var(--accent, #d4af37)", textTransform: "uppercase", letterSpacing: 0.6 };
}
function h3(): React.CSSProperties {
  return { fontSize: 12, fontWeight: 700, margin: "14px 0 8px", opacity: 0.8, textTransform: "uppercase", letterSpacing: 0.5 };
}
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: "1px dashed hsla(0,0%,100%,0.05)" }}>
      <span style={{ opacity: 0.55 }}>{k}</span>
      <span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );
}
function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 14px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: "none",
    background: "var(--accent, #d4af37)", color: "#1a1408",
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  };
}
function btnGhost(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8,
    border: "1px solid hsla(0,0%,100%,0.12)", background: "transparent",
    color: "var(--text-strong, #eee)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  };
}

function Chip({ children, warn, accent }: { children: React.ReactNode; warn?: boolean; accent?: boolean }) {
  const bg = warn ? "hsla(0,70%,50%,0.18)" : accent ? "hsla(40,70%,50%,0.18)" : "hsla(0,0%,100%,0.06)";
  const bd = warn ? "hsla(0,70%,55%,0.4)" : accent ? "hsla(40,70%,55%,0.4)" : "hsla(0,0%,100%,0.1)";
  return (
    <span style={{
      fontSize: 10, padding: "2px 7px", borderRadius: 99,
      background: bg, border: `1px solid ${bd}`, fontWeight: 600,
      letterSpacing: 0.3, textTransform: "lowercase",
    }}>{children}</span>
  );
}
