// =========================================================================
// Sales-Funnel — deterministische Verkaufs-Leiter für den Auto-Pilot.
//
// Die Stufen kommen aus der von dir gepflegten Konfiguration
// (src/lib/funnelConfig.ts). Regeln:
//  (a) genug Fan-Nachrichten Aufbau seit dem letzten Angebot,
//  (b) bezahlte Stufen erst weiter, wenn die Vorstufe gekauft wurde,
//  (c) pro Angebot maximal EINE Intensitäts-Stufe weiter — größere Sprünge
//      brauchen doppelten Aufbau statt eines Sprungs von 0 auf 100,
//  (d) vor jedem Angebot ist eine Brücken-Nachricht Pflicht.
// =========================================================================
import type { Message } from "@/data/mockData";
import { detectObjection, objectionPayload, type ObjectionState } from "@/lib/objections";
import { mockCurrentUser } from "@/data/mockData";
import { stageConfigFor, type FunnelStageConfig } from "@/lib/funnelConfig";
import { COLD_RESTART_HOURS } from "@/lib/sessionRhythm";


export interface FunnelStage {
  /** Nummer des NÄCHSTEN Angebots (1-basiert). */
  offerNo: number;
  /** Preis des nächsten Angebots in Cent (0 = kostenlos). */
  priceCents: number;
  /** Wie viele Fan-Nachrichten seit dem letzten Angebot nötig sind. */
  minFanTurns: number;
  /** Kurzbeschreibung für den KI-Prompt. */
  goal: string;
  config: FunnelStageConfig;
  /** Intensität der vorigen Stufe (0 = noch kein Angebot). */
  prevIntensity: number;
}

function goalFor(cfg: FunnelStageConfig, offerNo: number, prevIntensity: number): string {
  if (offerNo === 1) {
    return `Aufwärmen → erstes Angebot "${cfg.label}" (kostenloser Einstieg, Intensität ${cfg.intensity}/5). Erst Rapport, dann natürlich überleiten.`;
  }
  return `Nächste Stufe "${cfg.label}" (Intensität ${cfg.intensity}/5, vorher ${prevIntensity}/5). An die Reaktion auf das letzte Angebot anknüpfen, ein Schritt weiter — nicht mehr.`;
}

function stageFor(offerNo: number): FunnelStage {
  const cfg = stageConfigFor(offerNo);
  const prevIntensity = offerNo > 1 ? stageConfigFor(offerNo - 1).intensity : 0;
  return {
    offerNo,
    priceCents: Math.round(cfg.priceEur * 100),
    minFanTurns: cfg.minFanTurns,
    goal: goalFor(cfg, offerNo, prevIntensity),
    config: cfg,
    prevIntensity,
  };
}

/**
 * Bypass-Zähler: so viele Fan-Nachrichten darf ein offenes (nicht gekauftes)
 * Angebot blockieren. Danach gilt es als abgelaufen und die Treppe läuft
 * normal weiter, statt für immer stehen zu bleiben.
 */
export const BYPASS_FAN_TURNS = 8;

/**
 * Angebots-Budget. Die Auswertung der Simulation zeigte: hohe Stufen wurden
 * tausendfach angeboten und NIE gekauft — die Chats waren reine Pitch-Schleifen.
 * Deshalb:
 *  - maximal EIN Angebot pro Session (nach einer Pause gibt es ein neues),
 *  - maximal ZWEI Angebote pro Sim-Tag,
 *  - nach 2 Wiederholungen ohne Kauf geht die Treppe eine Stufe ZURÜCK
 *    (billiger, leichter zu kaufen), statt weiter nach oben zu eskalieren.
 */
export const MAX_OFFERS_PER_SESSION = 1;
export const MAX_OFFERS_PER_DAY = 2;
export const DEMOTE_AFTER_RETRIES = 1;


/**
 * Rabatt-Regeln bei Wiederholung einer Stufe:
 *  - erst ab 10 € darf überhaupt rabattiert werden (darunter bleibt der Preis),
 *  - 10 % pro Wiederholung, maximal 25 % — "ein bisschen", nicht verschenken,
 *  - Preis wird auf ganze Euro gerundet und fällt nie unter 10 €.
 */
export const DISCOUNT_MIN_PRICE_CENTS = 1000;
export const DISCOUNT_STEP_PCT = 10;
export const DISCOUNT_MAX_PCT = 25;

export function retryPriceCents(basePriceCents: number, retryCount: number): { priceCents: number; discountPct: number } {
  if (retryCount <= 0 || basePriceCents < DISCOUNT_MIN_PRICE_CENTS) {
    return { priceCents: basePriceCents, discountPct: 0 };
  }
  const discountPct = Math.min(DISCOUNT_MAX_PCT, retryCount * DISCOUNT_STEP_PCT);
  const raw = basePriceCents * (1 - discountPct / 100);
  const rounded = Math.round(raw / 100) * 100;
  const priceCents = Math.max(DISCOUNT_MIN_PRICE_CENTS, rounded);
  return { priceCents, discountPct: Math.round((1 - priceCents / basePriceCents) * 100) };
}

export interface FunnelState {
  stage: FunnelStage;
  /** Darf jetzt ein Angebot raus? */
  canOffer: boolean;
  /** Warum (nicht) — für Prompt + Debug. */
  reason: string;
  /** Fan-Nachrichten seit dem letzten Angebot. */
  fanTurnsSinceOffer: number;
  /** Tatsächlich nötiger Aufbau (inkl. Aufschlag bei Intensitätssprung). */
  requiredFanTurns: number;
  /** Letztes bezahltes Angebot wurde noch nicht gekauft. */
  awaitingPurchase: boolean;
  /** Offenes Angebot hat den Bypass-Zähler erreicht → blockiert nicht mehr. */
  offerExpired: boolean;
  /** Fan-Nachrichten, bis ein offenes Angebot abläuft. */
  bypassAfterFanTurns: number;
  /** Intensitätssprung > 1 in der Konfiguration → extra Aufbau. */
  intensityJump: number;
  /** Dieselbe Stufe wird wiederholt, weil das letzte Angebot nicht gekauft wurde. */
  isRetry: boolean;
  /** Wie oft diese Stufe bereits ohne Kauf angeboten wurde. */
  retryCount: number;
  /** Listenpreis der Stufe (ohne Wiederholungs-Rabatt), in Cent. */
  basePriceCents: number;
  /** Tatsächlicher Rabatt in Prozent (0 = kein Rabatt). */
  discountPct: number;
  /** Aktuell offener Einwand des Fans (Preis, Geld, Vertrauen …). */
  objection: ObjectionState;
  /** Angebote in der laufenden Session / in den letzten 24 h. */
  offersInSession: number;
  offersLast24h: number;
  /** Wie viele Stufen wegen ausbleibender Käufe zurückgestuft wurde. */
  demotedSteps: number;

}


/**
 * Leitet den Funnel-Zustand allein aus dem Nachrichtenverlauf ab —
 * dieselbe Historie ergibt damit immer denselben nächsten Schritt.
 */
/**
 * Model-Optionen: `tempo` skaliert den nötigen Aufbau vor einem Angebot,
 * `startStage` überspringt die ersten Stufen der Leiter.
 */
export type FunnelOptions = {
  tempo?: "slow" | "normal" | "fast";
  startStage?: number;
  /**
   * Stunden Funkstille vor diesem Zug. Ab COLD_RESTART_HOURS gilt das Gespräch
   * als kalt: offene Angebote blockieren nicht mehr, alte Einwände verfallen
   * und der Aufbau beginnt neu.
   */
  hoursSinceLastMessage?: number;
  /** Zeitpunkt des Neustarts — Aufbau zählt erst ab hier. */
  restartAtIso?: string;
  /**
   * Anzahl erledigter (gekaufter oder kostenloser) Angebote VOR dem geladenen
   * Nachrichtenfenster. Nötig, weil bei langen Chats nur die letzten
   * Nachrichten geladen werden.
   */
  clearedBefore?: number;
};


const TEMPO_FACTOR: Record<"slow" | "normal" | "fast", number> = {
  slow: 1.6,
  normal: 1,
  fast: 0.6,
};

export function computeFunnelState(messages: readonly Message[], fanId: string, opts: FunnelOptions = {}): FunnelState {
  const coldBreak = (opts.hoursSinceLastMessage ?? 0) >= COLD_RESTART_HOURS;

  // Fan-Nachrichten robust erkennen: Cloud-Rehydrierung vergibt teils andere
  // Absender-IDs als der lokale Store, deshalb zählt alles, was nicht vom
  // Creator kommt, als Fan-Turn.
  const isFanMsg = (m: Message) =>
    m.senderId === fanId || m.senderId !== mockCurrentUser.id;
  const ppvs = messages.filter(m => m.contentType === "ppv");

  // Wiederholung statt Weiterspringen: nur "erledigte" Angebote (kostenlos oder
  // gekauft) rücken die Treppe weiter. Ein nicht gekauftes bezahltes Angebot
  // wird nach Ablauf desselben Stufen-Levels erneut angeboten.
  const isCleared = (m: Message) => (m.ppv?.price ?? 0) === 0 || !!m.ppv?.isPurchased;
  // Ältere Angebote außerhalb des geladenen Fensters zählen mit, damit die
  // Treppe bei langen Verläufen nicht wieder bei Stufe 1 anfängt.
  const clearedCount = ppvs.filter(isCleared).length + Math.max(0, Math.round(opts.clearedBefore ?? 0));
  // Startstufe des Models: überspringt die ersten Stufen der Leiter.
  const startOffset = Math.max(0, Math.round(opts.startStage ?? 0));
  const stageBase = stageFor(clearedCount + 1 + startOffset);





  // Wie oft wurde genau diese Stufe schon ohne Kauf angeboten?
  let retryCount = 0;
  for (let i = ppvs.length - 1; i >= 0; i--) {
    if (isCleared(ppvs[i])) break;
    retryCount++;
  }
  const isRetry = retryCount > 0;

  // Rückstufung: kauft er zwei Mal hintereinander nicht, war die Stufe zu
  // groß. Statt weiter zu eskalieren geht es eine Stufe zurück.
  const minOfferNo = 1 + startOffset;
  // Nach einer langen Pause fällt die Treppe zusätzlich zurück — die
  // Kauf-Spannung ist weg. Starke Käufer (≥5 Käufe) fallen nur 1 Stufe.
  const purchasedCount = ppvs.filter(m => !!m.ppv?.isPurchased).length;
  const coldDemote = coldBreak && clearedCount > 2 ? (purchasedCount >= 5 ? 1 : 2) : 0;
  const demoteSteps = Math.floor(retryCount / DEMOTE_AFTER_RETRIES) + coldDemote;
  const effectiveOfferNo = Math.max(minOfferNo, stageBase.offerNo - demoteSteps);
  const stageNow = effectiveOfferNo === stageBase.offerNo ? stageBase : stageFor(effectiveOfferNo);

  // Wiederholung darf ab 10 € moderat rabattiert werden — mehr Abschlüsse,
  // ohne den Wert der Stufe zu zerstören.
  const basePriceCents = stageNow.priceCents;
  const { priceCents, discountPct } = retryPriceCents(basePriceCents, retryCount);
  const stage: FunnelStage = { ...stageNow, priceCents };

  const lastOffer = ppvs[ppvs.length - 1];
  const lastOfferIdx = lastOffer ? messages.lastIndexOf(lastOffer) : -1;
  // Nach einem Neustart zählt nur der Aufbau NACH der Pause — die Stimmung
  // von vorher ist weg, also fängt die Überleitung wieder bei null an.
  const restartAt = opts.restartAtIso ? new Date(opts.restartAtIso).getTime() : null;
  const fanTurnsSinceOffer = messages
    .slice(lastOfferIdx + 1)
    .filter(isFanMsg)
    .filter(m => !restartAt || new Date(m.createdAt).getTime() >= restartAt).length;

  // Angebots-Budget: Angebote in dieser Session bzw. in den letzten 24 h
  // (gemessen an der Chat-Uhr, also der letzten Nachricht).
  const nowTs = messages.length
    ? new Date(messages[messages.length - 1].createdAt).getTime()
    : Date.now();
  const offerTs = (m: Message) => new Date(m.createdAt).getTime();
  const offersInSession = restartAt ? ppvs.filter(m => offerTs(m) >= restartAt).length : 0;
  const offersLast24h = ppvs.filter(m => nowTs - offerTs(m) <= 24 * 3_600_000).length;

  const openOffer = !!lastOffer && (lastOffer.ppv?.price ?? 0) > 0 && !lastOffer.ppv?.isPurchased;

  // Bypass: ein offenes Angebot sperrt nur so lange, bis der Fan genug
  // weitergeschrieben hat. Danach ist es "abgelaufen" und blockiert nicht mehr.
  // Nach einer langen Pause ist es sofort kalt und blockiert nicht mehr.

  const offerExpired = openOffer && (coldBreak || fanTurnsSinceOffer >= BYPASS_FAN_TURNS);
  const awaitingPurchase = openOffer && !offerExpired;

  // (c) Nicht-Überspringen: ist der konfigurierte Sprung größer als +1,
  // wird er nicht übersprungen, sondern mit doppeltem Aufbau abgebremst.
  const intensityJump = Math.max(0, stage.config.intensity - stage.prevIntensity - 1);
  const tempoFactor = TEMPO_FACTOR[opts.tempo ?? "normal"];
  const requiredFanTurns = Math.max(
    1,
    Math.round(stage.minFanTurns * (intensityJump > 0 ? 2 : 1) * tempoFactor),
  );

  // Einwandbehandlung: was blockt den Kauf gerade emotional?
  // Nach einer langen Pause sind alte Einwände erledigt — nicht mehr aufwärmen.
  const objection = coldBreak
    ? { type: null, quote: "", streak: 0, label: "kein Einwand", playbook: [] } as ObjectionState
    : detectObjection(messages, fanId);

  const base = {
    stage, fanTurnsSinceOffer, requiredFanTurns, awaitingPurchase,
    offerExpired, bypassAfterFanTurns: BYPASS_FAN_TURNS, intensityJump,
    isRetry, retryCount, basePriceCents, discountPct, objection,
    offersInSession, offersLast24h, demotedSteps: demoteSteps,

  };

  // Kalter Neustart: in diesem Zug garantiert kein Angebot — erst wieder
  // Nähe aufbauen, sonst wirkt es wie "weiter im Verkaufsgespräch von gestern".
  if (coldBreak && fanTurnsSinceOffer < requiredFanTurns) {
    return {
      ...base, canOffer: false,
      reason: `Neustart nach ${Math.round(opts.hoursSinceLastMessage ?? 0)} h Pause — Stimmung ist zurückgesetzt: erst wieder aufwärmen, kein Angebot, altes Angebot nicht erwähnen.`,
    };
  }


  // Bei klarer Ablehnung, fehlendem Geld oder Gratis-Forderung wird in diesem
  // Zug NICHT verkauft — erst Einwand auflösen, sonst wirkt es aufdringlich.
  const hardBlock = objection.type === "refusal" || objection.type === "money" || objection.type === "free";
  if (hardBlock) {
    return {
      ...base, canOffer: false,
      reason: `Einwand offen (${objection.label}: "${objection.quote}") — jetzt kein Angebot, erst Einwand emotional auflösen und Stimmung zurückholen.`,
    };
  }




  if (awaitingPurchase) {
    const left = BYPASS_FAN_TURNS - fanTurnsSinceOffer;
    return {
      ...base, canOffer: false,
      reason: `Letztes Angebot ist noch nicht gekauft — erst weiterreden/nachfassen, kein neues Angebot (läuft nach ${left} weiteren Fan-Nachricht(en) ab).`,
    };
  }
  // Angebots-Budget: lieber ein starkes Angebot pro Session als zehn schwache.
  if (offersInSession >= MAX_OFFERS_PER_SESSION) {
    return {
      ...base, canOffer: false,
      reason: `Angebots-Budget dieser Session ist aufgebraucht (${offersInSession}/${MAX_OFFERS_PER_SESSION}) — jetzt nur Nähe, Alltag und Spaß. Kein Preis, kein Teaser auf Bezahltes. Das nächste Angebot kommt erst in einer neuen Session.`,
    };
  }
  if (offersLast24h >= MAX_OFFERS_PER_DAY) {
    return {
      ...base, canOffer: false,
      reason: `Tages-Budget aufgebraucht (${offersLast24h} Angebote in 24 h) — heute nichts mehr anbieten, nur Beziehung aufbauen.`,
    };
  }

  if (fanTurnsSinceOffer < requiredFanTurns) {
    const missing = requiredFanTurns - fanTurnsSinceOffer;
    return {
      ...base, canOffer: false,
      reason: intensityJump > 0
        ? `Intensitätssprung (${stage.prevIntensity}→${stage.config.intensity}) — doppelter Aufbau nötig, noch ${missing} Fan-Nachricht(en).`
        : `Noch ${missing} Fan-Nachricht(en) Aufbau, bevor Angebot ${stage.offerNo} kommt.`,
    };
  }
  const priceTxt = stage.priceCents === 0 ? "kostenlos" : (stage.priceCents / 100).toFixed(2) + " €";
  const discountTxt = discountPct > 0
    ? ` Preis ist bewusst von ${(basePriceCents / 100).toFixed(2)} € auf ${priceTxt} gesenkt (−${discountPct} %) — als kleiner, einmaliger Anreiz verpacken, nicht als Ausverkauf, keine weiteren Rabatte versprechen.`
    : ` Preis bleibt identisch — nicht senken.`;
  return {
    ...base, canOffer: true,
    reason: isRetry
      ? `Letztes Angebot wurde nicht gekauft (${retryCount}. Versuch abgelaufen) — dieselbe Stufe ${stage.offerNo} wird wiederholt: ${stage.config.label} (${priceTxt}).${discountTxt} Neu verpacken, anderer Aufhänger, nicht aufs alte Angebot verweisen, Intensität NICHT erhöhen.`
      : `Angebot ${stage.offerNo} freigegeben: ${stage.config.label} (${priceTxt}).`,
  };
}


/** Kompakter Block für den KI-Prompt / Edge-Function-Payload. */
export function funnelPayload(state: FunnelState) {
  return {
    offerNo: state.stage.offerNo,
    goal: state.stage.goal,
    nextPriceEur: state.stage.priceCents / 100,
    canOffer: state.canOffer,
    reason: state.reason,
    fanTurnsSinceOffer: state.fanTurnsSinceOffer,
    requiredFanTurns: state.requiredFanTurns,
    awaitingPurchase: state.awaitingPurchase,
    offerExpired: state.offerExpired,
    bypassAfterFanTurns: state.bypassAfterFanTurns,
    stageLabel: state.stage.config.label,
    mediaType: state.stage.config.mediaType,
    intensity: state.stage.config.intensity,
    prevIntensity: state.stage.prevIntensity,
    isRetry: state.isRetry,
    retryCount: state.retryCount,
    listPriceEur: state.basePriceCents / 100,
    discountPct: state.discountPct,
    discountAllowed: state.basePriceCents >= DISCOUNT_MIN_PRICE_CENTS,
    maxDiscountPct: DISCOUNT_MAX_PCT,
    /** Brücken-Nachricht vor dem Angebot ist Pflicht. */
    bridgeRequired: true,
    /** Offener Einwand samt Behandlungs-Playbook (oder null). */
    objection: objectionPayload(state.objection),
    offersInSession: state.offersInSession,
    maxOffersPerSession: MAX_OFFERS_PER_SESSION,
    offersLast24h: state.offersLast24h,
    maxOffersPerDay: MAX_OFFERS_PER_DAY,
    demotedSteps: state.demotedSteps,

  };

}

