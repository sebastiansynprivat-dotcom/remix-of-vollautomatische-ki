// =========================================================================
// Sim-Tick — Server-Loop für die vollautomatischen Test-Chats.
//
// pg_cron ruft diese Route jede Minute mit dem Shared Secret auf. Pro Aufruf
// werden die fälligen Läufe (public.sim_runs) je einen Zug weitergespielt:
//   1. offenes Angebot → Kaufentscheidung der Persona
//   2. Fan-Zug   (Edge Function `fan-sim-bot`, Persona-getrieben)
//   3. Model-Zug (Edge Function `chat-copilot`, autopilot: true)
//   4. optional PPV gemäß Verkaufstreppe (src/lib/salesFunnel.ts)
//   5. nächsten Zeitpunkt planen (Session-Pausen, Nachtruhe, Ghosting)
//
// Läuft komplett serverseitig — der Browser muss nicht offen sein.
// =========================================================================
import { createFileRoute } from "@tanstack/react-router";
import type { Message } from "@/data/mockData";
import { computeFunnelState, funnelPayload } from "@/lib/salesFunnel";
import { normalizeStepConfig } from "@/lib/funnelConfig";
import { decidePurchase, simPersona } from "@/lib/simPersonas";
import { buyerFollowupRules, restartRules } from "@/lib/reengage";
import { filterFresh, usedLines } from "@/lib/repetition";
import { buildTopicMemory, topicMemoryRules } from "@/lib/topicMemory";
import { dailyScene, dailySceneRules, timeSlotOf } from "@/lib/dailyScene";

import {
  COLD_RESTART_HOURS,
  decideRhythm,
  gapLabel,
  nextMorning,
  rhythmFromRow,
  simDayFor,
  timeOfDayLabel,
  type SimPhase,
} from "@/lib/sessionRhythm";

const MAX_RUNS_PER_TICK = 10;
const LOCK_MINUTES = 3;
/** Zeitbudget pro Aufruf — danach ist der nächste Tick dran. */
const TICK_BUDGET_MS = 45_000;
/** Nur das aktuelle Chat-Ende laden (die Schnittstelle liefert max. 1000 Zeilen). */
const MESSAGE_WINDOW = 240;

// Non-Buyer-Guard: nach so vielen bezahlten Angeboten ohne Kauf erst Pause, dann Stopp.
const NON_BUYER_PAUSE_OFFERS = 6;
const NON_BUYER_STOP_OFFERS = 9;
const NON_BUYER_PAUSE_HOURS = 6;
/** Mehr als so viele Model-Nachrichten am Stück ohne Fan-Input gibt es nie. */
const MODEL_STREAK_MAX = 2;




type Json = Record<string, unknown>;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randInt = (a: number, b: number) => Math.round(rand(a, b));

function rowToMessage(r: Json): Message {
  const fromMe = r.sender_type === "model";
  const contentType = String(r.content_type) as Message["contentType"];
  return {
    id: String(r.id),
    senderId: fromMe ? "user-001" : `fan-${String(r.conversation_id)}`,
    contentType,
    content: (r.content as string | null) ?? undefined,
    ppv: contentType === "ppv"
      ? {
          price: Number(r.ppv_price_cents ?? 0),
          currency: "EUR",
          mediaType: (r.ppv_media_type === "video" ? "video" : "photo") as "photo" | "video",
          mediaCount: Number(r.ppv_media_count ?? 1),
          previewUrl: null,
          isPurchased: !!r.ppv_is_purchased,
          caption: (r.content as string | null) ?? undefined,
        }
      : undefined,
    tip: contentType === "tip"
      ? {
          amount: Number(r.tip_amount_cents ?? 0),
          currency: "EUR",
          message: (r.tip_message as string | null) ?? "",
        }
      : undefined,
    createdAt: String(r.created_at),
    status: (r.status as Message["status"]) ?? "delivered",
  };
}

function transcript(messages: Message[]): { role: "fan" | "model"; text: string }[] {
  return messages
    .map((m) => {
      const isModel = m.senderId === "user-001";
      if (m.contentType === "text" && m.content) {
        return { role: isModel ? ("model" as const) : ("fan" as const), text: m.content };
      }
      if (m.contentType === "ppv" && m.ppv) {
        const status = m.ppv.isPurchased ? "gekauft" : "nicht gekauft";
        const price = m.ppv.price === 0 ? "kostenlos" : `${(m.ppv.price / 100).toFixed(0)}€`;
        return {
          role: "model" as const,
          text: `[schickt ${m.ppv.mediaType} für ${price} — ${status}] ${m.ppv.caption ?? ""}`.trim(),
        };
      }
      if (m.contentType === "tip" && m.tip) {
        return { role: "fan" as const, text: `[Trinkgeld ${(m.tip.amount / 100).toFixed(0)}€]` };
      }
      return null;
    })
    .filter((x): x is { role: "fan" | "model"; text: string } => !!x);
}

function copilotHistory(messages: Message[]): { role: "user"; content: string }[] {
  return messages
    .map((m) => {
      const isModel = m.senderId === "user-001";
      const speaker = isModel ? "MODEL" : "FAN";
      if (m.contentType === "text" && m.content) return `${speaker}: ${m.content}`;
      if (m.contentType === "ppv" && m.ppv) {
        const status = m.ppv.isPurchased ? "GEKAUFT" : "NICHT GEKAUFT";
        return `MODEL: [PPV ${m.ppv.mediaType} ${(m.ppv.price / 100).toFixed(0)}€ — ${status}]`;
      }
      if (m.contentType === "tip" && m.tip) {
        return `FAN: [Trinkgeld ${(m.tip.amount / 100).toFixed(0)}€]`;
      }
      return "";
    })
    .filter(Boolean)
    .slice(-120)
    .map((content) => ({ role: "user" as const, content }));
}

function modelPersonaPayload(row: Json | null): Json {
  if (!row) return { displayName: "Creatorin", style: "premium, flirty, warm" };
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  return {
    displayName: str(row.display_name) ?? "Creatorin",
    handle: str(row.handle),
    age: typeof row.age === "number" ? row.age : undefined,
    job: str(row.job),
    location: str(row.location),
    relationshipStatus: str(row.relationship_status),
    persona: str(row.persona),
    toneOfVoice: str(row.tone_of_voice),
    writingStyle: str(row.writing_style),
    bio: str(row.bio),
    funFacts: str(row.fun_facts),
    hobbies: arr(row.hobbies),
    languages: arr(row.languages),
    dos: arr(row.dos),
    donts: arr(row.donts),
    personaConfig: (row.persona_config ?? undefined) as Json | undefined,
  };
}

/**
 * Simulierte Chat-Uhr.
 *
 * Die Chats schreiben durchgehend (kein echtes Warten). Der Verlauf über Tage
 * und die Gesprächspausen leben nur in den Zeitstempeln: `jumpHours` überspringt
 * eine Pause, `next` setzt die Zeit innerhalb einer Session weiter.
 */
class SimClock {
  private cursor: number;
  constructor(lastIso: string | undefined) {
    this.cursor = lastIso ? new Date(lastIso).getTime() : Date.now();
  }
  /** Nächster Zeitstempel innerhalb derselben Session. */
  next(minSec = 8, maxSec = 55): string {
    this.cursor += rand(minSec, maxSec) * 1000;
    return new Date(this.cursor).toISOString();
  }
  /** Pause überspringen (Stunden). */
  jumpHours(hours: number): string {
    this.cursor += hours * 3_600_000;
    return new Date(this.cursor).toISOString();
  }
  get ts(): number {
    return this.cursor;
  }
  get lastIso(): string {
    return new Date(this.cursor).toISOString();
  }
}


async function callFunction(name: string, body: Json): Promise<Json> {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) throw new Error("Supabase env missing");
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name} ${res.status}: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text) as Json;
  } catch {
    throw new Error(`${name}: invalid JSON`);
  }
}

interface TurnResult {
  note: string;
  simDay: number;
  sessionTurn: number;
  phase: SimPhase;
  purchasesInSession: number;
  gapHours: number;
  simLastAt: string;
  lastFollowupDay: number;
  done: boolean;
}

async function runTurn(admin: SupabaseAdmin, run: Json): Promise<TurnResult> {
  const convId = String(run.conversation_id);
  const persona = simPersona(String(run.persona));
  const log: string[] = [persona.key];

  const { data: conv } = await admin
    .from("conversations")
    .select("id, model_id, fan_id, autopilot_enabled, fans!inner(id, display_name, total_spent_cents, tip_volume_cents)")
    .eq("id", convId)
    .maybeSingle();
  if (!conv) throw new Error("conversation missing");

  // Manuelle Übersteuerung: Auto-Modus aus → dieser Chat wird nicht bearbeitet.
  if ((conv as Json).autopilot_enabled === false) {
    const rh = rhythmFromRow(run);
    return {
      note: "manual-override-skip",
      simDay: rh.simDay,
      sessionTurn: rh.sessionTurn,
      phase: rh.phase,
      purchasesInSession: rh.purchasesInSession,
      gapHours: 0,
      simLastAt: (run.sim_last_at as string | undefined) ?? new Date().toISOString(),
      lastFollowupDay: rh.lastFollowupDay,
      done: false,
    };
  }


  const fanId = String((conv as Json).fan_id);
  const modelId = String((conv as Json).model_id);

  // WICHTIG: die Datenschnittstelle liefert maximal 1000 Zeilen. Ohne Fenster
  // kamen bei langen Chats die ÄLTESTEN 1000 Nachrichten zurück — der Funnel
  // rechnete dann mit uralten Angeboten und schickte entweder gar kein PPV
  // mehr (altes offenes Angebot blockierte für immer) oder in jedem Zug eins.
  // Deshalb: nur das aktuelle Ende laden, ältere Käufe separat zählen.
  const { data: recentRows } = await admin
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_WINDOW);
  const rows: Json[] = [...((recentRows ?? []) as Json[])].reverse();
  let messages: Message[] = rows.map((r: Json) => rowToMessage(r));

  // Erledigte Angebote vor dem Fenster → Treppe bleibt auf der richtigen Stufe.
  let clearedBefore = 0;
  const windowStart = rows[0]?.created_at as string | undefined;
  if (windowStart) {
    const { count } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", convId)
      .eq("content_type", "ppv")
      .lt("created_at", windowStart)
      .or("ppv_price_cents.eq.0,ppv_is_purchased.is.true");
    clearedBefore = Number(count ?? 0);
  }


  // ---- 0) Session-Rhythmus: weiterschreiben, Pause, Follow-up oder Ende ----
  const rhythm = rhythmFromRow(run);
  const lastIso = (run.sim_last_at as string | undefined) ?? messages[messages.length - 1]?.createdAt;
  const clock = new SimClock(lastIso);
  const startedAt = (run.started_at as string | undefined) ?? messages[0]?.createdAt ?? null;

  let decision = decideRhythm({
    persona,
    state: rhythm,
    cursorTs: clock.ts,
    fanWantsEnd: rhythm.phase === "break",
  });

  const baseResult = {
    sessionTurn: rhythm.sessionTurn,
    phase: rhythm.phase,
    purchasesInSession: rhythm.purchasesInSession,
    gapHours: 0,
    simLastAt: clock.lastIso,
    lastFollowupDay: rhythm.lastFollowupDay,
  };

  if (decision.kind === "done") {
    return { ...baseResult, note: `${persona.key} ${decision.note}`, simDay: rhythm.simDay, phase: "done", done: true };
  }

  // Hat der Fan in der Session gekauft, wird aus der Pause ein Guten-Morgen-
  // Follow-up am nächsten Morgen (maximal eines pro Sim-Tag).
  let isFollowup = decision.kind === "followup";
  if (
    decision.kind === "restart" &&
    rhythm.purchasesInSession > 0 &&
    rhythm.lastFollowupDay < rhythm.simDay
  ) {
    const target = nextMorning(clock.ts);
    decision = {
      kind: "followup",
      gapHours: Math.max(1, (target - clock.ts) / 3_600_000),
      breakKind: "night",
      modelOpens: true,
      cold: true,
      note: "followup (käufer)",
    };
    isFollowup = true;
  }

  let restartAtIso: string | undefined;
  let sessionTurn = rhythm.sessionTurn;
  let purchasesInSession = rhythm.purchasesInSession;
  if (decision.gapHours > 0) {
    restartAtIso = clock.jumpHours(decision.gapHours);
    sessionTurn = 0;
    purchasesInSession = 0;
    log.push(decision.note);
  }
  const modelOpensDay = decision.modelOpens || isFollowup;
  const simDay = simDayFor(startedAt, clock.ts);

  // Profil-eigene Stufen (falls gepflegt) statt der globalen Standard-Stufen.
  const { data: stepCfgRow } = await admin
    .from("model_profiles")
    .select("step_config")
    .eq("id", modelId)
    .maybeSingle();
  const stepConfig = normalizeStepConfig((stepCfgRow as Json)?.step_config ?? null);

  const funnelOpts = {
    hoursSinceLastMessage: decision.gapHours,
    restartAtIso,
    clearedBefore,
    stepConfig: stepConfig ?? undefined,
  };

  // ---- 1) Kaufentscheidung für ein offenes Angebot ----
  // Nach einer langen Pause wird nicht mehr nachträglich gekauft — das Angebot
  // ist emotional tot und wird auch nicht mehr erwähnt.
  const openPpvRow = decision.cold
    ? null
    : [...rows]
        .reverse()
        .find((r: Json) => r.content_type === "ppv" && Number(r.ppv_price_cents ?? 0) > 0 && !r.ppv_is_purchased);
  let offerPurchased: boolean | null = null;
  if (openPpvRow) {
    const pre = computeFunnelState(messages, fanId, funnelOpts);
    const purchasedCount = messages.filter((m) => m.ppv?.isPurchased).length;
    const { data: brainSignalsRow } = await admin
      .from("fan_brain")
      .select("signals")
      .eq("fan_id", fanId)
      .eq("model_id", modelId)
      .maybeSingle();
    const ppvMomentScore = Number(
      ((brainSignalsRow as Json)?.signals as Json)?.ppv_moment_score ?? 50,
    );
    const buys = decidePurchase({
      persona,
      priceCents: Number(openPpvRow.ppv_price_cents ?? 0),
      discountPct: pre.discountPct,
      purchasedCount,
      ppvMomentScore,
    });
    offerPurchased = !!buys;
    if (buys) {
      await admin.from("messages").update({ ppv_is_purchased: true }).eq("id", openPpvRow.id);
      const idx = messages.findIndex((m) => m.id === String(openPpvRow.id));
      if (idx >= 0 && messages[idx].ppv) {
        messages[idx] = { ...messages[idx], ppv: { ...messages[idx].ppv!, isPurchased: true } };
      }
      purchasesInSession += 1;
      log.push("kauft");
      // Asset-Statistik: positive Reaktion + Umsatz zählen
      const usedAssetId = (openPpvRow as Json).asset_id as string | null | undefined;
      if (usedAssetId) {
        const { data: prevAsset } = await admin
          .from("model_assets")
          .select("response_count, revenue_total_cents")
          .eq("id", usedAssetId)
          .maybeSingle();
        if (prevAsset) {
          await admin
            .from("model_assets")
            .update({
              response_count: Number((prevAsset as Json).response_count ?? 0) + 1,
              revenue_total_cents:
                Number((prevAsset as Json).revenue_total_cents ?? 0) +
                Number(openPpvRow.ppv_price_cents ?? 0),
            })
            .eq("id", usedAssetId);
        }
      }

      // After-Care-Lock: 4 Stunden kein neuer Pitch nach Kauf
      const lockUntil = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      const { data: brainForLock } = await admin
        .from("fan_brain")
        .select("signals")
        .eq("fan_id", fanId)
        .maybeSingle();
      await admin
        .from("fan_brain")
        .update({
          signals: {
            ...(((brainForLock as Json)?.signals as Json) ?? {}),
            after_care_lock_until: lockUntil,
          },
        })
        .eq("fan_id", fanId);
      log.push("after-care-lock:4h");
    } else {
      log.push("kauft-nicht");
    }
  }

  // ---- 2) Fan-Zug (entfällt, wenn das Model das Gespräch eröffnet) ----
  const fanTexts: string[] = [];
  let fanEndsSession = false;

  // Fan-seitige Monolog-Bremse: hat der Fan zuletzt mehrfach allein geschrieben
  // (das Model hat nicht geantwortet), wird der Fan-Zug übersprungen.
  let fanOnlyStreak = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].senderId !== "user-001") fanOnlyStreak++;
    else break;
  }
  const skipFanTurn = fanOnlyStreak >= 5;
  if (skipFanTurn && !modelOpensDay) {
    log.push("fan-monolog-skip:" + fanOnlyStreak);
  } else if (!modelOpensDay) {
    // Themen extrahieren: Stichworte aus den letzten 60 Nachrichten
    const recentTranscript = transcript(messages).slice(-60);
    const topicsCovered: string[] = [];
    const topicKeywords = ["job","arbeit","name","stadt","wohnt","hobby","musik","sport","auto","essen","kochen","film","serie","anime","spiel","gaming","urlaub","reise","familie","geschwister","eltern","ex","beziehung","single","alter","geburtstag","haustier","hund","katze","dusche","badewanne","bett","schlafen","müde","wochenende","samstag","sonntag","fitness","gym","rennen","laufen"];
    for (const t of recentTranscript) {
      const lower = (t.text ?? "").toLowerCase();
      for (const kw of topicKeywords) {
        if (lower.includes(kw) && !topicsCovered.includes(kw)) topicsCovered.push(kw);
      }
    }

    // Facts die das Model schon geteilt hat — damit der Fan nicht wieder fragt
    const modelMessages = messages.filter((m) => m.senderId === "user-001" && m.content);
    const modelFactHints: string[] = [];
    const modelText = modelMessages.map((m) => m.content).join(" ").toLowerCase();
    const factPatterns = [
      { key: "beruf", match: ["model", "shooting", "content", "kamera", "creator"], fact: "sie ist Content Creator / macht Shootings" },
      { key: "essen", match: ["lasagne", "pizza", "pasta", "sushi"], fact: "sie hat ihr Lieblingsessen erwähnt" },
      { key: "wohnort", match: ["berlin", "münchen", "hamburg", "köln", "wien"], fact: "sie hat ihren Wohnort erwähnt" },
      { key: "sport", match: ["gym", "fitness", "tanzen", "yoga"], fact: "sie macht Sport / geht ins Gym" },
      { key: "haustier", match: ["hund", "katze", "haustier"], fact: "sie hat über Haustiere gesprochen" },
      { key: "musik", match: ["rnb", "pop", "rock", "musik"], fact: "sie mag bestimmte Musik" },
      { key: "nachbarn", match: ["nachbar", "bohren", "renovier", "lärm"], fact: "ihre Nachbarn machen oft Lärm/renovieren" },
      { key: "shooting", match: ["shooting", "kamera", "fotograf"], fact: "sie hatte heute ein Shooting" },
    ];
    for (const p of factPatterns) {
      if (p.match.some((m) => modelText.includes(m))) modelFactHints.push(p.fact);
    }

    const fanRes = await callFunction("fan-sim-bot", {
      persona: persona.key,
      history: transcript(messages).slice(-40),
      topicsCovered,
      modelFactHints,

      simDay,
      turn: Number(run.turn_count ?? 0),
      sessionTurn,
      restartAfterHours: decision.gapHours > 0 ? Math.round(decision.gapHours) : 0,
    });
    if (Array.isArray(fanRes.messages)) {
      (fanRes.messages as unknown[])
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 3)
        .forEach((t) => fanTexts.push(t));
    }
    fanEndsSession = fanRes.end === true;
    if (fanEndsSession) log.push("fan-verabschiedet");
  }

  // Hat der Fan das Angebot im Text klar abgelehnt, wird der Kauf zurückgenommen.
  if (offerPurchased === true && fanTexts.length > 0) {
    const fanText = fanTexts.join(" ").toLowerCase();
    const rejectionWords = ["zu teuer", "kann nicht kaufen", "kann ich nicht", "ist mir zu viel", "so wird das nix", "leider nicht", "grad kein geld", "kann ich nicht kaufen", "echt viel", "immer noch viel zu teuer"];
    if (rejectionWords.some((w) => fanText.includes(w))) {
      offerPurchased = false;
      if (openPpvRow) {
        await admin.from("messages").update({ ppv_is_purchased: false }).eq("id", openPpvRow.id);
        const idx = messages.findIndex((m) => m.id === String(openPpvRow.id));
        if (idx >= 0 && messages[idx].ppv) {
          messages[idx] = { ...messages[idx], ppv: { ...messages[idx].ppv!, isPurchased: false } };
        }
      }
      purchasesInSession = Math.max(0, purchasesInSession - 1);
      log.push("fan-rejected-override");
    }
  }




  const inserted: Json[] = [];
  for (let i = 0; i < fanTexts.length; i++) {
    const { data } = await admin
      .from("messages")
      .insert({
        conversation_id: convId,
        sender_type: "fan",
        content_type: "text",
        status: "delivered",
        content: fanTexts[i],
        created_at: clock.next(6, 40),
      })
      .select("*")
      .maybeSingle();
    if (data) inserted.push(data as Json);
  }
  messages = [...messages, ...inserted.map((r) => rowToMessage(r))];
  log.push(`fan:${fanTexts.length}`);

  // Monolog-Bremse: bleibt der Fan stumm und das Model hat schon zwei
  // Nachrichten am Stück geschrieben, wird NICHT weitergeredet. Genau so sind
  // in der Simulation Selbstgespräche mit tausenden Nachrichten entstanden.
  let modelStreak = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].senderId === "user-001") modelStreak++;
    else break;
  }
  if (fanTexts.length === 0 && !modelOpensDay && modelStreak >= MODEL_STREAK_MAX) {
    log.push(`monolog-stop:${modelStreak}`);
    return {
      ...baseResult,
      note: log.join(" "),
      simDay,
      sessionTurn: 0,
      phase: "break",
      purchasesInSession,
      gapHours: decision.gapHours,
      simLastAt: clock.lastIso,
      done: false,
    };
  }



  // ---- 3) Model-Zug (identische Logik wie im Browser-Autopilot) ----
  const [{ data: brainRowInitial }, { data: modelRow }] = await Promise.all([
    admin.from("fan_brain").select("*").eq("fan_id", fanId).maybeSingle(),
    admin.from("model_profiles").select("*").eq("id", modelId).maybeSingle(),
  ]);

  // ---- Non-Buyer-Guard (rein technisch: Ressourcen sparen) ----
  // Fans, die viele kostenpflichtige Angebote bekommen und nie kaufen,
  // erzeugen nur Kosten. Erst Pause, danach Chat beenden.
  {
    const paidOffers = messages.filter(
      (m) => m.contentType === "ppv" && (m.ppv?.price ?? 0) > 0,
    ).length;
    const purchases = messages.filter((m) => m.ppv?.isPurchased).length;
    if (purchases === 0 && paidOffers >= NON_BUYER_STOP_OFFERS) {
      log.push(`non-buyer-stop:${paidOffers}`);
      return {
        ...baseResult,
        note: log.join(" "),
        simDay: rhythm.simDay,
        phase: "done",
        done: true,
      };
    }
    if (purchases === 0 && paidOffers >= NON_BUYER_PAUSE_OFFERS) {
      const signals = ((brainRowInitial as Json)?.signals as Json) ?? {};
      if (!signals.boundary_msg_sent) {
        // Grenz-Nachricht einmalig von der KI selbst formulieren lassen.
        const guardFan = (conv as Json).fans as Json;
        let boundaryText =
          "ich investiere hier so viel zeit und herz... und irgendwie fühlt sich das einseitig an 🥺";
        try {
          const boundaryRes = await callFunction("chat-copilot", {
            messages: copilotHistory(messages),
            fanMeta: {
              displayName: String(guardFan?.display_name ?? "Fan"),
              totalSpent_eur: 0,
              tipVolume_eur: 0,
              lastPurchaseAmount_eur: null,
            },
            modelPersona: modelPersonaPayload((modelRow as Json) ?? null),
            fanBrain: brainRowInitial ?? null,
            fanId,
            autopilot: true,
            forceSingleMessage: true,
            systemOverride:
              "Besondere Situation: Dieser Fan hat mehrere deiner Inhalte-Angebote bekommen, aber nie eines gekauft. Du fühlst dich wenig wertgeschätzt und das Ganze einseitig. Schreib EINE ehrliche Nachricht darüber, wie sich das für dich anfühlt — emotional, verletzlich, nicht fordernd. Erwähne KEIN Kaufen, keine Preise, keine Angebote. Nur dein Gefühl zur einseitigen Dynamik. 1–2 Sätze, kleinschreibung, 1–2 Emojis. Das ist keine Verkaufsnachricht.",
          });
          const t =
            ((boundaryRes as Json)?.suggestions as Json[] | undefined)?.[0]?.text ??
            ((boundaryRes as Json)?.slots as Json[] | undefined)?.[0]?.text;
          if (typeof t === "string" && t.trim()) boundaryText = t.trim();
        } catch (e) {
          log.push("non-buyer-boundary-fallback");
        }

        await admin.from("messages").insert({
          conversation_id: convId,
          sender_type: "model",
          content_type: "text",
          status: "delivered",
          content: boundaryText,
          created_at: clock.next(10, 30),
        });
        await admin
          .from("fan_brain")
          .update({ signals: { ...signals, boundary_msg_sent: true } })
          .eq("fan_id", fanId);
        log.push("non-buyer-boundary-msg");
      }
      log.push(`non-buyer-pause:${paidOffers}`);
      return {
        ...baseResult,
        note: log.join(" "),
        simDay: rhythm.simDay,
        sessionTurn: 0,
        phase: "break",
        gapHours: NON_BUYER_PAUSE_HOURS,
        simLastAt: clock.lastIso,
        done: false,
      };
    }

  }


  const fanRow = (conv as Json).fans as Json;

  // Fan-Brain anlegen, falls noch keiner existiert — sonst laufen die
  // Writebacks des chat-copilot ins Leere und der Funnel-Fortschritt geht verloren.
  let brainRow = brainRowInitial;
  if (!brainRow) {
    await admin.from("fan_brain").upsert(
      {
        fan_id: fanId,
        model_id: modelId,
        identity: { name: String(fanRow?.display_name ?? "Fan") },
        emotional: {
          current_mood: "neutral",
          loneliness_score: 0,
          triggers_positive: [],
          triggers_negative: [],
        },
        preferences: { kinks: [], turn_offs: [] },
        commercial: { lifetime_spend: 0, ladder_step: 1, declined_count: 0 },
        relationship: { stage: "unknown", days_known: 0, inside_jokes: [], promises_made: [] },
        red_flags: { broke_signals: 0, aggression: 0, refund_threats: 0, scammer_score: 0 },
        signals: { bridge_state: "idle", funnel_step: 1, ppv_moment_score: 0 },
        confidence: 0,
      },
      { onConflict: "fan_id", ignoreDuplicates: true },
    );
    const { data: freshBrain } = await admin
      .from("fan_brain")
      .select("*")
      .eq("fan_id", fanId)
      .maybeSingle();
    brainRow = freshBrain;
  }
  const lastPurchaseCents = [...messages].reverse().find((m) => m.ppv?.isPurchased)?.ppv?.price ?? 0;
  const funnel = computeFunnelState(messages, fanId, funnelOpts);

  // Session-Kontext: nach einer Pause bekommt das Model explizite Regeln, wie
  // es wieder einsteigt (Neustart) bzw. wie das Käufer-Follow-up klingt.
  const restartContext = isFollowup
    ? buyerFollowupRules({
        gapLabel: gapLabel(decision.gapHours),
        lastPurchaseEur: lastPurchaseCents > 0 ? lastPurchaseCents / 100 : null,
      })
    : decision.gapHours > 0
      ? restartRules({
          gapLabel: gapLabel(decision.gapHours),
          timeOfDay: timeOfDayLabel(clock.ts),
          cold: decision.cold,
          modelOpens: decision.modelOpens,
        })
      : [];

  // Gedächtnis: erledigte Themen sind für Fragen gesperrt, offene Fäden werden
  // bevorzugt aufgegriffen — damit Tag 4 nicht wie Tag 1 klingt.
  const topicMem = buildTopicMemory(messages, (m) => m.senderId === "user-001");
  const brainDays = Number(
    ((brainRow as Json)?.relationship as Json)?.days_known ?? 0,
  );

  // Eigenes Leben: pro Sim-Tag ein fester Tagesverlauf.
  const scene = dailyScene(String(convId), simDay);

  const sessionContext = [
    ...restartContext,
    ...topicMemoryRules(topicMem, {
      fanName: String(fanRow?.display_name ?? "").split(" ")[0] || undefined,
      daysKnownHint: Math.max(brainDays, simDay - 1, topicMem.daysKnown),
    }),
    ...dailySceneRules(scene, timeSlotOf(clock.ts)),
  ];

  // Anti-Wiederholung: die letzten Model-Zeilen sind gesperrt.
  const avoidLines = usedLines(messages, (m) => m.senderId === "user-001");

  const askCopilot = (extraAvoid: string[] = []) =>
    callFunction("chat-copilot", {
      messages: copilotHistory(messages),
      fanMeta: {
        displayName: String(fanRow?.display_name ?? "Fan"),
        totalSpent_eur: Math.round(Number(fanRow?.total_spent_cents ?? 0) / 100),
        tipVolume_eur: Math.round(Number(fanRow?.tip_volume_cents ?? 0) / 100),
        lastPurchaseAmount_eur: lastPurchaseCents > 0 ? lastPurchaseCents / 100 : null,
      },
      modelPersona: modelPersonaPayload((modelRow as Json) ?? null),
      knownFacts: (brainRow as Json)?.identity ?? {},
      fanId,
      fanBrain: brainRow ?? null,
      autopilot: true,
      salesFunnel: funnelPayload(funnel),
      sessionContext,
      forceSingleMessage: isFollowup,
      avoidLines: [...avoidLines.slice(0, 60), ...extraAvoid],
    });

  const readParts = (b: Json) => {
    const suggestion = (b.suggestions as Json[] | undefined)?.[0] ?? {};
    return [suggestion.text, suggestion.text2, suggestion.text3]
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((s) => s.trim())
      // Follow-up am Morgen ist bewusst genau EINE Nachricht.
      .slice(0, isFollowup ? 1 : 3);
  };

  let brief = await askCopilot();
  let { fresh: parts, dropped } = filterFresh(readParts(brief), avoidLines);
  // Alles war schon da → genau EIN neuer Versuch mit erweiterter Sperrliste.
  if (parts.length === 0 && dropped.length > 0) {
    log.push("wiederholung-neu");
    brief = await askCopilot(dropped);
    const retry = filterFresh(readParts(brief), avoidLines);
    parts = retry.fresh;
  }
  if (dropped.length > 0) log.push(`dedupe:${dropped.length}`);
  if (parts.length === 0) parts.push("hey 🙈");



  const modelRows: Json[] = [];
  for (let i = 0; i < parts.length; i++) {
    const { data } = await admin
      .from("messages")
      .insert({
        conversation_id: convId,
        sender_type: "model",
        content_type: "text",
        status: "delivered",
        content: parts[i],
        created_at: clock.next(10, 60),
      })
      .select("*")
      .maybeSingle();
    if (data) modelRows.push(data as Json);
  }
  messages = [...messages, ...modelRows.map((r) => rowToMessage(r))];
  log.push(`model:${parts.length}`);

  // ---- 4) Angebot nur, wenn die Treppe es freigibt (nie im Follow-up) ----
  const funnelNow = computeFunnelState(messages, fanId, funnelOpts);
  let lastPreview = parts[parts.length - 1];
  if (!isFollowup && funnelNow.canOffer) {
    const hint = brief.ppvHint as Json | undefined;
    const hinted = typeof hint?.caption === "string" ? hint.caption.trim() : "";

    // Passendes Asset aus der Bibliothek wählen (am wenigsten genutzt zuerst).
    const stageTier = funnelNow.stage.config.intensity;
    const stageValueCents = funnelNow.stage.priceCents;
    const { data: matchingAssets } = await admin
      .from("model_assets")
      .select("id, description, note, url, thumbnail_url, use_count")
      .eq("model_id", modelId)
      .eq("is_active", true)
      .lte("tier", stageTier)
      .eq("value_cents", stageValueCents)
      .order("use_count", { ascending: true })
      .limit(5);
    const selectedAsset = (matchingAssets?.[0] as Json | undefined) ?? null;

    // Auch die Caption darf keine Wiederholung sein.
    const assetNote = typeof selectedAsset?.note === "string" ? selectedAsset.note.trim() : "";
    const caption = assetNote
      ? assetNote
      : hinted && filterFresh([hinted], avoidLines).fresh.length > 0
        ? hinted
        : `${funnelNow.stage.config.label.toLowerCase()} — nur für dich 🙈`;

    const { error: ppvError } = await admin.from("messages").insert({
      conversation_id: convId,
      sender_type: "model",
      content_type: "ppv",
      status: "delivered",
      content: caption,
      asset_id: (selectedAsset?.id as string | undefined) ?? null,
      ppv_price_cents: stageValueCents,
      ppv_media_type: funnelNow.stage.config.mediaType,
      ppv_media_count: 1,
      ppv_is_purchased: false,
      created_at: clock.next(20, 90),
    });
    // Fehler nicht verschlucken: sonst "verschwindet" das Angebot lautlos.
    if (ppvError) {
      log.push(`ppv-FEHLER:${ppvError.message}`);
    } else {
      lastPreview = caption;
      log.push(`ppv:${(stageValueCents / 100).toFixed(0)}€`);
      if (selectedAsset?.id) {
        await admin
          .from("model_assets")
          .update({ use_count: Number(selectedAsset.use_count ?? 0) + 1 })
          .eq("id", selectedAsset.id as string);
        log.push("asset:genutzt");
      }
    }

  } else if (!isFollowup) {
    log.push(`kein-ppv:${funnelNow.reason.slice(0, 60)}`);
  }


  // ---- 5) Conversation-Kopf aktualisieren ----
  const { data: convRow } = await admin
    .from("conversations")
    .select("unread_count")
    .eq("id", convId)
    .maybeSingle();
  await admin
    .from("conversations")
    .update({
      last_message_preview: lastPreview.slice(0, 160),
      last_message_at: clock.lastIso,
      last_message_from_model: true,
      unread_count: Number((convRow as Json)?.unread_count ?? 0) + fanTexts.length + parts.length,
    })
    .eq("id", convId);

  // ---- 6) Nächste Phase festlegen ----
  // Verabschiedet sich der Fan, endet die Session. Hat er in dieser Session
  // gekauft, ist morgen früh ein Guten-Morgen-Follow-up fällig.
  const nextSessionTurn = sessionTurn + 1;
  let nextPhase: SimPhase = "active";
  let nextFollowupDay = rhythm.lastFollowupDay;
  if (isFollowup) {
    nextFollowupDay = simDay;
    nextPhase = "break";
    log.push("followup gesendet");
  } else if (fanEndsSession) {
    nextPhase = purchasesInSession > 0 && nextFollowupDay < simDay ? "followup_due" : "break";
  }

  // ---- 6b) Telemetrie pro Zug (Auswertung von Funnel & Wiederholungen) ----
  try {
    const { error: telError } = await admin.from("sim_telemetry").insert({
      sim_run_id: run.id,
      conversation_id: convId,
      persona: persona.key,
      sim_day: simDay,
      turn_count: Number(run.turn_count ?? 0) + 1,
      offer_no: funnelNow?.stage?.offerNo ?? null,
      offer_price_cents: funnelNow?.stage?.priceCents ?? null,
      offer_purchased: offerPurchased,
      offer_retry_count: funnelNow?.retryCount ?? 0,
      model_msg_count: parts.length,
      fan_msg_count: fanTexts.length,
      model_total_chars: parts.reduce((s: number, p: string) => s + p.length, 0),
      fan_total_chars: fanTexts.reduce((s: number, t: string) => s + t.length, 0),
      repetition_dropped: dropped.length,
      phase: nextPhase,
      session_turn: nextSessionTurn,
      model_id: modelId,
    });
    if (telError) log.push(`telemetrie-FEHLER:${telError.message.slice(0, 60)}`);
  } catch {
    // Telemetrie darf einen Zug niemals scheitern lassen
  }


  return {
    note: log.join(" "),
    simDay,
    sessionTurn: nextSessionTurn,
    phase: nextPhase,
    purchasesInSession,
    gapHours: decision.gapHours,
    simLastAt: clock.lastIso,
    lastFollowupDay: nextFollowupDay,
    done: false,
  };

}

type SupabaseAdmin = {
  from: (table: string) => any;
};

/** Einen fälligen Lauf sperren, spielen und sofort wieder fällig machen. */
async function processRun(admin: SupabaseAdmin, run: Json, lockCutoff: string): Promise<Json | null> {
  const { data: locked } = await admin
    .from("sim_runs")
    .update({ locked_at: new Date().toISOString() })
    .eq("id", run.id)
    .is("locked_at", null)
    .select("id")
    .maybeSingle();
  const stale = run.locked_at && String(run.locked_at) < lockCutoff;
  if (!locked && !stale) return null;
  if (!locked && stale) {
    await admin.from("sim_runs").update({ locked_at: new Date().toISOString() }).eq("id", run.id);
  }

  const turnCount = Number(run.turn_count ?? 0) + 1;
  try {
    const res = await runTurn(admin, run);
    await admin
      .from("sim_runs")
      .update({
        turn_count: turnCount,
        // Kein Delay: der Chat ist direkt wieder dran
        next_run_at: new Date().toISOString(),
        sim_day: res.simDay,
        session_turn: res.sessionTurn,
        phase: res.phase,
        gap_hours: res.gapHours,
        purchases_in_session: res.purchasesInSession,
        last_followup_day: res.lastFollowupDay,
        sim_last_at: res.simLastAt,
        // Nach `max_sim_days` ist der Lauf fertig und läuft nicht endlos weiter.
        state: res.done ? "completed" : "running",
        locked_at: null,
        last_error: null,
      })
      .eq("id", run.id);
    return { conversation_id: run.conversation_id, ok: true, note: res.note };

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("sim-tick turn failed", run.conversation_id, message);
    await admin
      .from("sim_runs")
      .update({
        next_run_at: new Date(Date.now() + 60_000).toISOString(),
        locked_at: null,
        last_error: message.slice(0, 500),
      })
      .eq("id", run.id);
    return { conversation_id: run.conversation_id, ok: false, error: message };
  }
}

async function handler({ request }: { request: Request }) {
  // Zwei erlaubte Aufrufer:
  //  1. pg_cron / interne Aufrufe mit dem Publishable-Key im apikey-Header
  //  2. optionales Shared Secret (x-sim-secret), falls SIM_TICK_SECRET gesetzt ist
  const secret = process.env['SIM_TICK_SECRET'];
  const keyCandidates = [
    process.env['SUPABASE_PUBLISHABLE_KEY'],
    process.env['SUPABASE_PUBLISHABLE_KEYS'],
    process.env['SUPABASE_ANON_KEY'],
    process.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
  ].filter((v): v is string => !!v);
  const providedSecret = request.headers.get("x-sim-secret");
  const providedKey = request.headers.get("apikey");
  const secretOk = !!secret && providedSecret === secret;
  const keyOk = !!providedKey && keyCandidates.some((k) => k.split(",").includes(providedKey));
  if (!secretOk && !keyOk) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as SupabaseAdmin;

  const startedAt = Date.now();
  const results: Json[] = [];
  let rounds = 0;

  // Durchgehend schreiben: solange Zeitbudget da ist, Runde um Runde alle
  // laufenden Chats parallel weiterspielen.
  while (Date.now() - startedAt < TICK_BUDGET_MS) {
    const lockCutoff = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();
    const { data: due, error } = await admin
      .from("sim_runs")
      .select("*")
      .eq("state", "running")
      .or(`locked_at.is.null,locked_at.lt.${lockCutoff}`)
      .order("next_run_at", { ascending: true })
      .limit(MAX_RUNS_PER_TICK);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }
    // Kein Delay mehr: next_run_at bremst nur noch nach einem Fehler (Backoff).
    const nowIso = new Date().toISOString();
    const runs = ((due ?? []) as Json[]).filter(
      (r) => !r.last_error || String(r.next_run_at ?? nowIso) <= nowIso,
    );
    if (runs.length === 0) break;

    const round = await Promise.all(runs.map((run) => processRun(admin, run, lockCutoff)));
    round.forEach((r) => { if (r) results.push(r); });
    rounds++;
  }

  return Response.json({ ok: true, rounds, processed: results.length, results });
}

export const Route = createFileRoute("/api/public/sim-tick")({
  server: {
    handlers: {
      POST: handler,
      GET: handler,
    },
  },
});
