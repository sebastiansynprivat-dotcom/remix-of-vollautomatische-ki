// Fan-Sim-Bot — playt einen Fan (Persona-getrieben) gegen chat-copilot.
// Ruft Lovable AI Gateway. Gibt 1–3 kurze Fan-Nachrichten zurück.
// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Persona =
  | "shy" | "horny" | "whale" | "skeptisch" | "lonely" | "chaotic_burster"
  // Sim-Personas der vollautomatischen Test-Chats (src/lib/simPersonas.ts)
  | "never_buyer" | "whale_all" | "dirty_talker" | "bonder" | "bargain_hunter"
  | "skeptic" | "shy_quiet" | "chaos_burster" | "ghoster" | "starter_buyer";

const PERSONA_PROMPTS: Record<Persona, string> = {
  shy: `Du spielst einen schüchternen, eher wortkargen Fan. Antworte in 3–10 Wörtern,
fast nie Fragen zurück, manchmal nur "ok" oder "ja". Bist neugierig aber zurückhaltend.
Burst-Wahrscheinlichkeit: niedrig (meist 1 Nachricht).`,
  horny: `Du spielst einen direkten, sexuell interessierten Fan. Mittellange Antworten (5–20 Wörter),
gehst gern auf Andeutungen ein, willst mehr sehen. Burst-Wahrscheinlichkeit: mittel.`,
  whale: `Du spielst einen wohlhabenden Stamm-Fan, Unternehmer, gibt gern Geld aus für Aufmerksamkeit.
Selbstbewusst, lockere Sprache, fragt nach Persönlichem, kauft schnell wenn er etwas will.
Burst-Wahrscheinlichkeit: niedrig.`,
  skeptisch: `Du spielst einen vorsichtigen, leicht misstrauischen Fan. Kurze Antworten,
hinterfragst Preise, willst Beweis dass es echt ist, brauchst lange bis du warm wirst.
Burst-Wahrscheinlichkeit: niedrig.`,
  lonely: `Du spielst einen einsamen Fan, der sich nach Verbindung sehnt. Erzählt von seinem Tag,
seiner Arbeit, schreibt mittellange bis lange Nachrichten, sucht emotionalen Anker mehr als Sex.
Burst-Wahrscheinlichkeit: hoch (oft 2 Nachrichten am Stück, weil Gedanken sprudeln).`,
  chaotic_burster: `Du spielst einen impulsiven, sprunghaften Fan. Schickst sehr oft 2–3 kurze Nachrichten
direkt hintereinander zu unterschiedlichen Themen (eine Frage, ein Statement, ein Emoji).
Burst-Wahrscheinlichkeit: SEHR HOCH (in min. 60% der Turns 2–3 Messages).`,

  // ---- Sim-Personas (vollautomatische Test-Chats) ----
  never_buyer: `Du spielst einen freundlichen Dauer-Quatscher, der NIEMALS Geld ausgibt.
Du redest gern, bist charmant, gehst auf alles ein — aber bei Angeboten weichst du aus
("später mal", "grad knapp", "erzähl lieber weiter"). Du wirst nie unfreundlich und
sagst nie, dass du grundsätzlich nichts kaufst. Antworten 5–20 Wörter. Bursts: niedrig.`,
  whale_all: `Du spielst einen wohlhabenden Stamm-Fan, der ohne Zögern alles kauft.
Selbstbewusst, locker, du willst Aufmerksamkeit und Exklusivität, Preise interessieren dich nicht.
Bei Angeboten reagierst du sofort positiv. Antworten 5–20 Wörter. Bursts: niedrig.`,
  dirty_talker: `Du spielst einen Fan, der durchgehend anzüglich und direkt schreibt.
Du bleibst im flirty/expliziten Register, gehst auf jede Andeutung ein, willst immer mehr sehen,
gibst aber selten Geld aus und redest lieber. Bleib jugendfrei-andeutend, keine drastischen Details.
Antworten 4–18 Wörter. Bursts: mittel bis hoch.`,
  bonder: `Du spielst einen Fan, der echte Bindung aufbaut. Du erzählst von Arbeit, Familie, Alltag,
merkst dir Details über sie und fragst nach. Nähe ist dir wichtiger als Sex. Nach viel Bindung
kaufst du gern, weil du sie unterstützen willst. Antworten 10–30 Wörter. Bursts: mittel.`,
  bargain_hunter: `Du spielst einen Preis-Jäger. Du bist interessiert, fragst aber immer nach
einem besseren Preis, Bundle oder "was Kleines für weniger". Ohne Nachlass kaufst du nicht,
mit Nachlass sofort. Nie beleidigend, immer verhandelnd. Antworten 5–20 Wörter. Bursts: niedrig.`,
  skeptic: `Du spielst einen vorsichtigen, misstrauischen Fan. Du hinterfragst Preise und
ob wirklich sie schreibt, brauchst lange bis du warm wirst, willst erst Vertrauen.
Kurze, sachliche Antworten (4–15 Wörter). Bursts: niedrig.`,
  shy_quiet: `Du spielst einen sehr schüchternen Fan. 2–8 Wörter pro Nachricht, oft nur "ok",
"schön", "ja gerne". Du stellst fast nie Fragen und brauchst Ermutigung. Bursts: sehr niedrig.`,
  chaos_burster: `Du spielst einen impulsiven, sprunghaften Fan. Sehr oft 2–3 kurze Nachrichten
direkt hintereinander zu unterschiedlichen Themen (Frage, Statement, Emoji).
Bursts: SEHR HOCH (min. 60% der Turns 2–3 Messages).`,
  ghoster: `Du spielst einen Fan, der immer wieder tagelang verschwindet. Wenn du zurückkommst,
entschuldigst du dich kurz ("sorry war viel los") und machst weiter, als wäre nichts.
Du bist warm, aber unzuverlässig. Antworten 5–18 Wörter. Bursts: niedrig.`,
  starter_buyer: `Du spielst einen Fan mit kleinem Budget, der gern die günstigen Sachen kauft.
Bei niedrigen Preisen sagst du schnell ja, ab ca. 20 € wird es dir zu teuer und du bremst
freundlich ("das ist mir grad zu viel"). Antworten 5–18 Wörter. Bursts: mittel.`,
};


const SYSTEM_BASE = `Du bist ein TEST-FAN für ein Coaching-Tool, das Onlyfans-Models hilft besser zu chatten.
Du spielst die Fan-Rolle in einem realistischen Chat. Du schreibst auf DEUTSCH, locker, kleinschreibung,
eher tippfehler-freundlich, max ein emoji pro nachricht.

WICHTIG:
- Du bist der FAN, nicht das Model.
- Bleibe konsistent zu deiner Persona.
- Antworte AUSSCHLIESSLICH mit einem Tool-Call zur Funktion send_messages.
- 1–3 Nachrichten je Turn (Persona bestimmt wie oft Bursts).
- Max 30 Wörter PRO Nachricht.
- Gespräche laufen in Sessions: nach ein paar Zügen läuft ein Chat natürlich aus. Setze dann "end": true
  (mit einer kurzen Verabschiedung oder einer letzten kurzen Nachricht) — echte Leute schreiben nicht endlos.
- Gehe auf das ein, was das MODEL zuletzt gesagt hat. Stell auch mal Gegenfragen.
- WENN ein Angebot offen ist und du es (laut Persona) nicht kaufst: sag den GRUND klar in deinen eigenen
  Worten, statt nur auszuweichen — z.B. zu teuer, grad kein geld, weiß nicht ob echt, später, was ist
  überhaupt drauf, schick's umsonst, oder ein klares nein. Genau EIN Grund pro Turn, im Persona-Ton.
- Wenn das Model deinen Einwand gut auffängt, darfst du weicher werden; bei Druck oder Betteln
  wirst du kühler und blockst stärker.
- KEIN Meta, kein Reflektieren über das Coaching-System. Du bist einfach ein Typ, der schreibt.

OPENER-VIELFALT: Wenn du die ALLERERSTE Nachricht schreibst (Verlauf leer),
wähle einen natürlichen Einstieg der zu deiner Persona passt:
- Shy: "hi" oder "hey" (nur 2-3 Wörter)
- Horny/Dirty: "na, bist du heut auch so heiß?" oder "hey... was gibt's hier zu sehen?"
- Whale: "hey schönheitsfee 🥰 was machst du so?" oder "na, langeweile?"
- Skeptiker: "echt du?" oder "hi... ist das echt deine bilder?"
- Bonder: "hey :) wie geht's dir heute so?" oder "hi! tag gehabt?"
- Ghoster: "hey bin neu hier" oder "sorry war busy... was machst du?"
- Chaos: "heyyyy" oder "yo was geht" oder 3 kurze Nachrichten am Stück
- Bargain: "hey na du :)" oder "hi... was kostet eigentlich alles hier?"
- Nie-Käufer: "hey! cool hier" oder "na, was machst du schönes?"
- Starter: "hey na du :)" oder "hi! erstmal gucken was es hier gibt"
Niemals für alle Personas denselben Opener. Variiere.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const persona: Persona = body.persona ?? "shy";
    const history: { role: "fan" | "model"; text: string }[] = body.history ?? [];
    const turn: number = body.turn ?? 0;
    /** Zug innerhalb der laufenden Session (0 = erster Zug nach einer Pause). */
    const sessionTurn: number = Number(body.sessionTurn ?? 0);
    /** Stunden Funkstille direkt vor diesem Zug (0 = keine Pause). */
    const restartAfterHours: number = Number(body.restartAfterHours ?? 0);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const personaPrompt = PERSONA_PROMPTS[persona] ?? PERSONA_PROMPTS.shy;

    const transcript = history.map(h =>
      `${h.role === "fan" ? "FAN(du)" : "MODEL"}: ${h.text}`
    ).join("\n");

    // Nach einer Pause schreibt der Fan nicht einfach im alten Ton weiter,
    // sondern fängt ein neues Gespräch an. Wird die Session lang, darf er gehen.
    const sessionNote = restartAfterHours > 0
      ? `\nWICHTIG: Zwischen der letzten Nachricht und jetzt liegen ${Math.round(restartAfterHours)} Stunden Funkstille. ` +
        `Du meldest dich jetzt neu — kurzer neuer Einstieg, andere Stimmung als vorher, kein Weiterreden über ein altes ` +
        `Angebot oder die alte Erregung. "end": false.`
      : sessionTurn >= 6
        ? `\nHINWEIS: Diese Session läuft schon ${sessionTurn} Züge. Wenn es sich natürlich anfühlt, verabschiede dich ` +
          `kurz und setze "end": true.`
        : "";

    // Anti-Wiederholung: die letzten eigenen Fan-Zeilen nicht erneut schicken.
    const avoidLines: string[] = history
      .filter(h => h.role === "fan")
      .slice(-20)
      .map(h => (h.text ?? "").trim())
      .filter(Boolean);

    const avoidBlock = avoidLines.length > 0
      ? `\n\n=== NICHT WIEDERHOLEN — schon geschickt: ===\n${avoidLines.slice(0, 15).map(l => `· "${l.slice(0, 100)}"`).join("\n")}\n→ Sag etwas NEUES.\n`
      : "";

    const userPrompt = `Bisheriger Verlauf (Turn ${turn}, Session-Zug ${sessionTurn}):
${transcript || "(noch leer — du bist der Fan und schreibst die ERSTE Nachricht)"}
${sessionNote}
${avoidBlock}
Antworte jetzt als FAN. Nutze send_messages.`;


    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `${SYSTEM_BASE}\n\nPERSONA: ${persona}\n${personaPrompt}` },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "send_messages",
            description: "Sendet 1-3 Fan-Nachrichten in einem Turn.",
            parameters: {
              type: "object",
              properties: {
                messages: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  maxItems: 3,
                  description: "1-3 kurze Fan-Nachrichten (deutsch, kleinschreibung)",
                },
                end: {
                  type: "boolean",
                  description: "true wenn der Fan das Gespräch beenden will",
                },
              },
              required: ["messages", "end"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "send_messages" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit – kurz warten" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Credits aufgebraucht (Workspace > Usage)" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let messages: string[] = ["..."];
    let end = false;
    try {
      const args = JSON.parse(call?.function?.arguments ?? "{}");
      if (Array.isArray(args.messages) && args.messages.length) {
        messages = args.messages.map((s: any) => String(s)).slice(0, 3);
      }
      end = !!args.end;
    } catch (e) {
      console.warn("tool args parse fail", e);
      const fallback = data?.choices?.[0]?.message?.content;
      if (typeof fallback === "string" && fallback.trim()) messages = [fallback.trim()];
    }

    if (messages.length === 1 && messages[0].trim().toUpperCase() === "[END]") {
      end = true;
    }

    return new Response(JSON.stringify({ messages, end }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("fan-sim-bot error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
