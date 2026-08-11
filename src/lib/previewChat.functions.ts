import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PreviewTurn = { role: "fan" | "model"; text: string };

type PreviewInput = {
  modelName: string;
  persona: Record<string, unknown>;
  emojiFrequency?: string;
  messageLength?: string;
  turns?: number;
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function buildPrompt(data: PreviewInput, count: number): string {
  const p = data.persona ?? {};
  const lines: string[] = [
    `Name der Creatorin: ${data.modelName || "Creatorin"}`,
    str(p.age) || typeof p.age === "number" ? `Alter: ${String(p.age)}` : "",
    str(p.nationality) ? `Herkunft: ${str(p.nationality)}` : "",
    str(p.description) ? `Persönlichkeit: ${str(p.description)}` : "",
    `Kommunikationsstil: ${str(p.communication_style) || "friendly"}`,
    `Ansprache: ${str(p.approach_style) || "gentle"}`,
    `Humor: ${str(p.humor_type) || "cute"}`,
    list(p.emoji_set).length ? `Erlaubte Emojis: ${list(p.emoji_set).join(" ")}` : "Emojis: sparsam",
    data.emojiFrequency ? `Emoji-Häufigkeit: ${data.emojiFrequency}` : "",
    data.messageLength ? `Nachrichtenlänge: ${data.messageLength}` : "",
    list(p.signature_phrases).length ? `Signature-Phrasen: ${list(p.signature_phrases).join(" | ")}` : "",
    list(p.avoid_words).length ? `Verbotene Wörter (niemals benutzen): ${list(p.avoid_words).join(", ")}` : "",
    str(p.opener_template) ? `Opener-Vorlage: ${str(p.opener_template)}` : "",
    str(p.voice_sample) ? `Voice-Sample (genau dieser Ton):\n${str(p.voice_sample)}` : "",
  ].filter(Boolean);

  return [
    "Du schreibst eine realistische Chat-Vorschau zwischen einem Fan und einer Creatorin.",
    "",
    lines.join("\n"),
    "",
    `Erzeuge exakt ${count} Nachrichten, streng abwechselnd, beginnend mit dem Fan ("fan"), dann "model", usw.`,
    "Der Verlauf zeigt einen natürlichen Bogen: Kennenlernen → Smalltalk → persönliche Nähe → leichtes Flirten → erste Andeutung von exklusivem Content.",
    "Regeln: Lowercase-Chatstil, keine Romane, keine Sternchen-Aktionen, keine expliziten Inhalte, kein Meta-Text.",
    "Die Creatorin-Nachrichten müssen exakt dem oben beschriebenen Stil, Ton, Emoji-Set und der Länge entsprechen.",
    "",
    'Antworte ausschließlich als JSON: {"messages":[{"role":"fan","text":"..."},{"role":"model","text":"..."}]}',
  ].join("\n");
}

function parseTurns(raw: string): PreviewTurn[] {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
      messages?: Array<{ role?: string; text?: string }>;
    };
    return (parsed.messages ?? [])
      .map((m) => ({
        role: m.role === "model" ? ("model" as const) : ("fan" as const),
        text: typeof m.text === "string" ? m.text.trim() : "",
      }))
      .filter((m) => m.text.length > 0);
  } catch {
    return [];
  }
}

export const generatePreviewChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PreviewInput) => data)
  .handler(async ({ data }): Promise<{ turns: PreviewTurn[]; error?: string }> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { turns: [], error: "AI-Zugang ist nicht konfiguriert." };

    const count = Math.min(Math.max(data.turns ?? 40, 10), 40);

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: "Du bist ein Chat-Simulator und antwortest ausschließlich mit gültigem JSON." },
          { role: "user", content: buildPrompt(data, count) },
        ],
      }),
    });

    if (res.status === 429) return { turns: [], error: "Zu viele Anfragen – bitte kurz warten." };
    if (res.status === 402) return { turns: [], error: "AI-Guthaben aufgebraucht." };
    if (!res.ok) {
      console.error("preview-chat gateway error", res.status, await res.text());
      return { turns: [], error: "Generierung fehlgeschlagen." };
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const turns = parseTurns(json.choices?.[0]?.message?.content ?? "");
    if (!turns.length) return { turns: [], error: "Keine verwertbare Antwort erhalten." };
    return { turns: turns.slice(0, count) };
  });
