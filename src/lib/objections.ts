/**
 * Einwandbehandlung.
 *
 * Erkennt aus den letzten Fan-Nachrichten, welcher Einwand gerade im Raum steht
 * (Preis, Geld, Vertrauen, Timing, Zweifel am Wert, klares Nein) und liefert
 * dazu einen Playbook-Block für den KI-Prompt. Rein regelbasiert, damit derselbe
 * Verlauf immer dieselbe Behandlung ergibt.
 */

import { mockCurrentUser, type Message } from "@/data/mockData";

export type ObjectionType =
  | "price"        // "zu teuer", "so viel für ein Bild"
  | "money"        // "hab kein Geld", "erst nach Zahltag"
  | "trust"        // "woher weiß ich, dass das echt ist", "Abzocke"
  | "timing"       // "später", "nicht jetzt", "vielleicht morgen"
  | "value"        // "was ist überhaupt drauf", "lohnt sich das"
  | "free"         // "schick's mir umsonst", "gratis?"
  | "refusal";     // "nein", "kein Interesse", "kaufe nichts"

export interface ObjectionState {
  /** Erkannter Einwand oder null. */
  type: ObjectionType | null;
  /** Zitat aus der Fan-Nachricht, das den Einwand ausgelöst hat. */
  quote: string;
  /** Wie viele der letzten Fan-Nachrichten denselben Einwand tragen. */
  streak: number;
  /** Kurzlabel für UI/Debug. */
  label: string;
  /** Prompt-Anweisung: wie wird der Einwand behandelt. */
  playbook: string[];
}

const PATTERNS: Array<{ type: ObjectionType; re: RegExp }> = [
  { type: "price", re: /\b(zu teuer|teuer|krass viel|so viel|so teuer|preis|billiger|g(ü|ue)nstiger|rabatt|nachlass|lohnt (sich )?nicht f(ü|ue)r den preis)\b/i },
  { type: "money", re: /\b(kein geld|knapp bei kasse|pleite|broke|erst (nach|ab) (zahltag|gehalt|dem ersten)|budget|arbeitslos|muss sparen|ende des monats)\b/i },
  { type: "trust", re: /\b(abzocke|betrug|scam|fake|echt\?|bist du (echt|real|ein bot)|bot\??|vertrauen|reinlegen|verarschen)\b/i },
  { type: "timing", re: /\b(sp(ä|ae)ter|nicht jetzt|morgen|n(ä|ae)chste woche|vielleicht mal|wenn ich zeit|melde mich)\b/i },
  { type: "value", re: /\b(was ist (da )?drauf|was seh ich|wie lang|wie viele bilder|lohnt sich das|wof(ü|ue)r zahl|erst wissen)\b/i },
  { type: "free", re: /\b(umsonst|gratis|kostenlos|for free|geschenkt|einfach so schicken)\b/i },
  { type: "refusal", re: /\b(nein danke|kein interesse|will nicht|kauf(e)? nichts|lass mal|brauch ich nicht|ohne mich)\b/i },
];

const LABELS: Record<ObjectionType, string> = {
  price: "Preis-Einwand",
  money: "Geld fehlt",
  trust: "Vertrauens-Zweifel",
  timing: "Hinhalten / später",
  value: "Wert unklar",
  free: "Will es kostenlos",
  refusal: "Klare Ablehnung",
};

/**
 * Behandlung pro Einwand: immer erst Gefühl anerkennen, dann umdeuten,
 * dann EIN Schritt zurück ins Gespräch. Kein Druck, kein Betteln.
 */
const PLAYBOOKS: Record<ObjectionType, string[]> = {
  price: [
    "Preis NICHT verteidigen und nicht wiederholen — Fokus weg von der Zahl, hin zum Erlebnis.",
    "Erst spiegeln (\"verstehe total\"), dann in einem Satz sagen, was er dafür bekommt (Nähe, exklusiv, nur für ihn gemacht).",
    "Wenn Rabatt laut Verkaufs-Treppe erlaubt ist: genau den freigegebenen Preis als einmaliges Entgegenkommen nennen — sonst KEINEN Nachlass andeuten.",
    "Mit einer warmen, leichten Frage zurück ins Gespräch, nie mit \"kaufst du jetzt?\".",
  ],
  money: [
    "Nie beschämen, nie über Geld diskutieren — Situation kurz anerkennen und sofort entlasten (\"kein Stress, läuft nicht weg\").",
    "Das Angebot bleibt bestehen: klarstellen, dass es für ihn reserviert ist statt es neu zu pitchen.",
    "Beziehung weiterführen: nach seinem Alltag/Tag fragen, damit der Chat nicht am Geld hängt.",
    "Keinen neuen Preis nennen, keine Ratenzahlung, kein Betteln.",
  ],
  trust: [
    "Zweifel ernst nehmen statt beleidigt reagieren — kurz, ruhig, selbstsicher.",
    "Vertrauen über ein persönliches Detail aus dem Chat aufbauen (etwas, das nur sie beide wissen), nicht über Behauptungen.",
    "Einen kleinen, risikofreien Beweis anbieten (etwas Persönliches, das laut Treppe erlaubt ist) — nichts versprechen, was die Stufe übersteigt.",
    "Danach Thema wechseln, nicht rechtfertigen und nicht mehrfach erklären.",
  ],
  timing: [
    "Das \"später\" akzeptieren, ohne es zu kommentieren — kein Nachbohren, kein Termin abringen.",
    "Spannung halten: einen kleinen Teaser darüber, was auf ihn wartet, ohne Preis zu nennen.",
    "Gespräch inhaltlich weiterführen, damit der Faden nicht abreißt.",
    "Maximal einmal locker nachfassen, danach normal weiterchatten.",
  ],
  value: [
    "Konkret werden statt geheimnisvoll: in einem Satz sagen, was er sieht/hört, ohne explizit zu werden.",
    "Auf sein zuvor genanntes Interesse verknüpfen (\"du meintest, du magst …\").",
    "Erst danach wieder zum Angebot — Wert vor Preis, nie umgekehrt.",
  ],
  free: [
    "Freundlich, aber klar bleiben: gratis gibt es das nicht, ohne belehrend oder genervt zu klingen.",
    "Auf das Kostenlose verweisen, das er schon bekommt (Aufmerksamkeit, Chat, ggf. das erste freie Stück).",
    "Wert kurz begründen (Aufwand, exklusiv für ihn) und das Thema dann leicht wieder öffnen.",
    "Keinen Preis senken, weil er nach gratis gefragt hat.",
  ],
  refusal: [
    "Sofort Druck rausnehmen und das Nein stehen lassen — genau EIN Satz dazu, ohne Enttäuschung zu zeigen.",
    "Kein neues Angebot in diesem Zug, keinen Preis nennen, nicht nach dem Grund fragen.",
    "Zurück zu Bonding: an ein früheres Thema anknüpfen und EINE offene Frage stellen.",
    "Erst nach klarer Erholung der Stimmung darf die Treppe wieder greifen.",
  ],
};

/** Letzte Fan-Nachrichten auf Einwände prüfen. */
export function detectObjection(
  messages: readonly Message[],
  fanId: string,
  lookback = 4,
): ObjectionState {
  const isFanMsg = (m: Message) => m.senderId === fanId || m.senderId !== mockCurrentUser.id;
  const fanTexts = messages
    .filter(m => isFanMsg(m) && m.contentType === "text" && !!m.content?.trim())
    .slice(-lookback)
    .map(m => m.content!.trim());

  const none: ObjectionState = { type: null, quote: "", streak: 0, label: "kein Einwand", playbook: [] };
  if (fanTexts.length === 0) return none;

  // Der jüngste Treffer zählt — er ist der aktuell offene Einwand.
  let hit: { type: ObjectionType; quote: string } | null = null;
  for (let i = fanTexts.length - 1; i >= 0 && !hit; i--) {
    const found = PATTERNS.find(p => p.re.test(fanTexts[i]));
    if (found) hit = { type: found.type, quote: fanTexts[i].slice(0, 160) };
  }
  if (!hit) return none;

  const streak = fanTexts.filter(t => PATTERNS.some(p => p.type === hit!.type && p.re.test(t))).length;

  return {
    type: hit.type,
    quote: hit.quote,
    streak,
    label: LABELS[hit.type],
    playbook: PLAYBOOKS[hit.type],
  };
}

/** Kompakter Block für den KI-Prompt / Edge-Function-Payload. */
export function objectionPayload(state: ObjectionState) {
  if (!state.type) return null;
  return {
    type: state.type,
    label: state.label,
    quote: state.quote,
    streak: state.streak,
    playbook: state.playbook,
    /** Ab dem zweiten gleichen Einwand nicht mehr argumentieren, sondern lösen. */
    repeated: state.streak > 1,
  };
}
