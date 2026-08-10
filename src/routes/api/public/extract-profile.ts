import { createFileRoute } from "@tanstack/react-router";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-sim-secret, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = `You are a document parser. Extract structured information from a profile document (Steckbrief). Return ONLY valid JSON with these fields. If a field is empty, "(keine Angabe)", or not present, set it to null.

Fields to extract:
{
  "display_name": "string — the model name",
  "age": "number",
  "birthday": "string — YYYY-MM-DD format",
  "location": "string — current city",
  "birthplace": "string — birth city",
  "job": "string — occupation",
  "hobbies": ["array of strings"],
  "dream": "string",
  "content_info": "string — what content they want to create (full text)",
  "no_gos": "string — things they don't want to do (full text)",
  "additional_info": "string — additional important notes (full text)",
  "physical": {
    "height_cm": "number",
    "weight": "string",
    "shoe_size": "string",
    "bra_size": "string",
    "hair_color_natural": "string"
  },
  "favorites": {
    "food": "string",
    "music": "string",
    "movie": "string",
    "color": "string"
  },
  "relationship_status": "string"
}

Return ONLY the JSON object, no markdown, no explanation.`;

async function authorize(request: Request): Promise<boolean> {
  const secret = process.env["SIM_TICK_SECRET"];
  const provided = request.headers.get("x-sim-secret");
  if (!secret) return true;
  if (provided && provided === secret) return true;

  // Fallback: signed-in admin from the dashboard
  const auth = request.headers.get("authorization");
  const token = auth?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data?.user) return false;
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: data.user.id,
    _role: "admin",
  });
  return Boolean(isAdmin);
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const Route = createFileRoute("/api/public/extract-profile")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        if (!(await authorize(request))) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: cors,
          });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ ok: false, error: "missing_api_key" }), {
            status: 500,
            headers: cors,
          });
        }

        let file: File | null = null;
        try {
          const form = await request.formData();
          const f = form.get("file");
          if (f instanceof File) file = f;
        } catch {
          /* ignore */
        }
        if (!file || file.size === 0) {
          return new Response(JSON.stringify({ ok: false, error: "missing_file" }), {
            status: 400,
            headers: cors,
          });
        }

        const bytes = new Uint8Array(await file.arrayBuffer());
        const mime = file.type || "application/pdf";
        const dataUrl = `data:${mime};base64,${toBase64(bytes)}`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract the profile data from this document. Return only JSON.",
                  },
                  {
                    type: "file",
                    file: { filename: file.name || "steckbrief.pdf", file_data: dataUrl },
                  },
                ],
              },
            ],
          }),
        });

        if (!res.ok) {
          const detail = await res.text();
          const status = res.status === 429 || res.status === 402 ? res.status : 502;
          return new Response(
            JSON.stringify({ ok: false, error: "ai_gateway_error", detail: detail.slice(0, 800) }),
            { status, headers: cors },
          );
        }

        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = json.choices?.[0]?.message?.content ?? "";
        const parsed = parseJsonLoose(text);
        if (!parsed) {
          return new Response(
            JSON.stringify({ ok: false, error: "parse_failed", detail: text.slice(0, 800) }),
            { status: 502, headers: cors },
          );
        }

        return new Response(JSON.stringify({ ok: true, data: parsed }), { headers: cors });
      },
    },
  },
});
