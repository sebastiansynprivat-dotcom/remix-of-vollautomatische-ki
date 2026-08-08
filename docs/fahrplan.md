# Fahrplan — Auto-Chat (Dev-Dokumentation)

> **Fokus des Projekts:** Es gibt nur noch **einen** Chat-Modus: den **Auto-Chat**.
> Der Mensch schreibt als **Fan**, das **Model antwortet vollautomatisch per KI**.
> Smart Replies, Flex-Pool, Routing-Spec und Co-Pilot-Spec sind entfernt.

---

## 1. Vollständige Chat-Logik (Ist-Zustand)

### 1.1 Rollen & Grundprinzip

| Rolle | Wer | Wo |
| --- | --- | --- |
| Fan | Mensch (Tester) bzw. Sim-Bot | `sendAsFan()` in `src/lib/chatStore.tsx` |
| Model | KI, immer automatisch | `runAutopilotTurn()` in `src/lib/chatStore.tsx` |

Es gibt **keinen separaten Testmodus**. Jede Konversation mit `conversations.is_autopilot = true`
läuft dauerhaft automatisch, ist im Sidebar oben angepinnt und trägt ein goldenes Banner.

### 1.2 Turn-Ablauf (Auto-Pilot)

```text
Fan sendet Nachricht
      │
      ▼
scheduleAutopilotTurn(convId)         Burst-Fenster 2800 ms
      │   (weitere Fan-Nachrichten in diesem Fenster werden gesammelt
      │    -> ermöglicht Multi-Reply auf mehrere Fan-Nachrichten)
      ▼
läuft schon ein Turn?  ── ja ──▶ autopilotPending = true  (wird danach nachgeholt)
      │ nein
      ▼
runAutopilotTurn(convId)
  1. Kontext bauen: Verlauf (Text/PPV-Status/Tips), Fan-Brain (Notiz + Facts),
     Funnel-State, Objection-State, Persona/Model-DNA
  2. chat-copilot Edge Function mit { autopilot: true } aufrufen
  3. Antwort = 1–3 Nachrichten-Slots (Multi-Reply ist Default im Autopilot)
  4. Typing-Indicator + gestaffelte Auslieferung der Slots
  5. Optional: ppvHint -> PPV automatisch senden (Bridge-Text wird Caption)
  6. Fan-Brain aktualisieren + in die Cloud persistieren
  7. autopilotPending abarbeiten
```

**Pause-/Resume-Regeln**
- Löschen einer Nachricht (Fan oder KI) pausiert den Auto-Pilot → Button „Weiter & neu generieren“.
- `useAutopilotPaused(convId)` steuert das Banner; Resume triggert erneut `runAutopilotTurn`.

### 1.3 Fan-Brain (`src/lib/fanBrain.ts`, `fanBrainEngine.ts`)

- **Notiz**: freier Text zum Fan (Ton, Vorlieben, Grenzen, Verlaufszusammenfassung).
- **Facts**: strukturierte Key-Value-Fakten (Name, Job, Zeitzone, Kaufverhalten, Trigger).
- Wird bei jedem Turn in den Prompt injiziert und nach dem Turn aus der KI-Antwort angereichert.
- **Persistenz**: Tabelle `public.fan_brain`, debounced Sync (`persistFanContext`) — überlebt Deploys/Änderungen.
- Reset über `resetConversation()` löscht Messages **und** setzt `fan_brain` auf Default zurück.

### 1.4 Sales-Funnel (`src/lib/salesFunnel.ts`, `funnelConfig.ts`)

- **Stufenleiter**: erstes PPV immer **kostenlos (0 €)**, danach 5 € → … → 50 €.
  Preise & Intensität (1–5) sind im `FunnelLadderEditor` konfigurierbar.
- **Deterministischer Übergang**: kein Random. Jede Stufe hat eine Mindestanzahl Fan-Turns.
- **Bridge-Pflicht**: vor jedem PPV eine Überleitungsnachricht; dieser Text wird als
  **Caption unter dem Medium** ausgeliefert (siehe 1.6).
- **No-Skip-Regel**: ein Intensitätssprung erfordert doppelten Aufbau.
- **Bypass-Zähler**: wird ein Angebot innerhalb von 8 Turns nicht gekauft, wird der Block gelöst.
- **Retry**: nicht gekaufte Stufe wird mit neuen Hooks/Captions wiederholt (Intensität steigt nicht).
- **Smart Discount**: ab ≥ 10 € pro Retry 10 % Rabatt, max. 25 %.
- **Käufe sind persistent**: `purchasePPV()` schreibt `ppv_is_purchased` in die DB.

### 1.5 Einwandsbehandlung (`src/lib/objections.ts`)

- Erkennt per Regex 7 Typen: Preis, Vertrauen, kein Geld, kein Interesse, Timing, Vergleich, Zweifel.
- Mappt auf **Playbooks** (Mirroring, Reframing, Value-Stack, Soft-Close).
- **Hard Blocks** (kein Geld / kein Interesse) → Verkauf pausiert, nur Bonding, bis der Einwand gelöst ist.
- Wiederholte Einwände → Modus „Bonding only“.
- Ist im Auto-Chat **und** in der Server-Simulation aktiv (beide nutzen `computeFunnelState`).

### 1.6 Nachrichten-Rendering

- `MessageBubble`, `PPVMessageBubble`, `TipMessageBubble`, gewrappt in `DeletableMessage`.
- PPV-Layout: Medium oben, **Beschreibung/Caption direkt darunter im selben Card** — zusammenhängend lesbar.
- `ChatArea` lädt progressiv: Button „Ältere Nachrichten laden“, Divider „Neu ab hier“ (Read-Marker aus `readState.ts`).

### 1.7 Server-Simulation (bleibt bestehen, getrennt vom Auto-Chat)

- 10 Personas in `src/lib/simPersonas.ts` (Whale, Skeptiker, Sparfuchs, …).
- Tabelle `sim_runs` + Cron auf `/api/public/sim-tick`; ein Tick verarbeitet mehrere Runden im 45s-Budget.
- **SimClock**: Zeitstempel laufen in Sim-Zeit weiter; Pausen werden mit `jumpHours()` übersprungen.
- Pause/Resume pro Run über `setSimState()`.
- Die Simulation nutzt exakt dieselbe Funnel-, Fan-Brain- und Objection-Logik.

### 1.7a Gesprächsunterbrechungen & Käufer-Follow-up (`src/lib/sessionRhythm.ts`, `reengage.ts`)

Chats laufen nicht als Endloskette, sondern in **Sessions**:

```text
Session (n Züge) → Pause (Stunden / Nachtruhe / Ghosting) → Neustart mit neuer Stimmung → …
                                 ↳ hat der Fan gekauft: am nächsten Morgen Follow-up
```

- **Session-Ende**: der Fan-Bot setzt `end: true` (Verabschiedung) oder die Persona-Zuglänge
  (`sessionTurns`) ist erreicht → Phase `break`.
- **Pausenlänge**: `breakHours` bzw. `ghostHours` der Persona, `ghostChancePct` entscheidet über Funkstille.
  `clampToWakeWindow()` verschiebt Pausen, die zwischen 23:00 und 07:00 landen, auf den nächsten Morgen.
- **Kalter Neustart** ab `COLD_RESTART_HOURS = 6`:
  - offenes Angebot gilt als tot (kein Nachkauf, keine Erinnerung daran),
  - erkannte Einwände verfallen,
  - Aufbau (`fanTurnsSinceOffer`) zählt erst ab dem Neustart → in diesem Zug garantiert kein PPV,
  - `restartRules()` liefert die Prompt-Regeln: neues Gespräch statt Fortsetzung, Tageszeit beachten,
    keine Vorwürfe wegen der Pause, höchstens ein kurzer Rückbezug.
  - Wer eröffnet, entscheidet der Zufall (`modelOpens`); eröffnet das Model, entfällt der Fan-Zug.
- **Käufer-Follow-up**: gab es in der Session einen Kauf (`purchases_in_session > 0`), wird aus der Pause
  ein Follow-up am nächsten Morgen (07:00–10:00, `nextMorning()`): genau **eine** warme Nachricht ohne
  Verkauf (`buyerFollowupRules()`, `forceSingleMessage`), maximal eines pro Sim-Tag (`last_followup_day`).
- **Ende des Laufs**: nach `max_sim_days` (Standard 14 Sim-Tage) → `phase = done`, `state = completed`.
  Damit ist die Endlosschleife beendet; Neustart nur manuell.
- **Spalten in `sim_runs`**: `session_turn`, `phase` (`active|break|followup_due|done`), `gap_hours`,
  `purchases_in_session`, `last_followup_day`, `max_sim_days`, `started_at`, `sim_last_at`.
- **Browser-Autopilot**: `gapHoursBefore()` in `chatStore.tsx` erkennt Pausen im manuellen Auto-Chat und
  nutzt dieselben `restartRules()` — der Sim-Loop und der Browser verhalten sich identisch.
- Banner in `ChatArea.tsx` zeigt Phase an: läuft / Pause (~n Std.) / Follow-up folgt / abgeschlossen.


### 1.7b Model-Profile & Chat-Verhalten

Jedes Model-Profil (`public.model_profiles`) steuert sein eigenes Chat-Verhalten.
Editor: Admin → Models → Model → Tab **Chat-Verhalten**.

| Bereich | Felder | Wirkung im Auto-Chat |
| --- | --- | --- |
| Tempo | `replyDelayMin/MaxSec`, `multiGapMin/MaxSec`, `ppvDelayMin/MaxSec`, `burstWindowSec` | Verzögerungen in `runAutopilotTurn()` und `scheduleAutopilotTurn()` |
| Multi-Reply | `multiReplyMin/Max` (1–3) | Anzahl Slots im Prompt; zu viele Teile werden zusammengefasst |
| Stil | `emojis`, `emoji_frequency`, `messageLength`, `lowercase`, `signature_phrases`, `petNames`, `taboo_words`, `openers` | landen als STIL-Block im System-Prompt; Emoji-Cap und Tabu-Wörter werden im Audit geprüft |
| Aktivzeiten | `activeFrom`, `activeTo`, `offHoursDelayFactor` | außerhalb der Zeiten längere Delays (`delayFactor()`) |
| Verkauf | `salesTempo` (slow/normal/fast), `salesStartStage` | skaliert `requiredFanTurns` und überspringt Startstufen in `computeFunnelState()` |

Speicherort: Spalte `chat_behavior` (JSONB) plus eigene Spalten für Emojis/Phrasen/Tabus/Openers.
Shared Logic: `src/lib/modelBehavior.ts` (`resolveChatBehavior`, `buildStyleBlock`, `emojiCap`, `delayFactor`).
Fehlende Werte fallen immer auf `DEFAULT_CHAT_BEHAVIOR` zurück — bestehende Chats verhalten sich unverändert.


### 1.8 Backend-Bausteine

| Baustein | Zweck |
| --- | --- |
| `supabase/functions/chat-copilot` | Model-Antwort generieren (Slots, ppvHint, Brain-Update) |
| `supabase/functions/fan-sim-bot` | Fan-Antworten für die Server-Simulation |
| `supabase/functions/ai-chat` | Freier KI-Chat (Assistenz) |
| `src/routes/api/public/sim-tick.ts` | Cron-Endpoint der Simulation |
| Tabellen | `conversations` (`is_autopilot`), `messages`, `fan_brain`, `sim_runs` |

---

## 2. Entfernt (nicht wieder einbauen)

- Smart Replies inkl. Rail, Suggestion-Tray, Hotkeys 1/2/3
- Dual-Mode / manueller Test-Toggle (Hotkey `T`)
- Flex-Pool inkl. Flex-Profile, Flex-Konversationen, `flexRouting.ts`
- Routing-Spec (`SmartRoutingSpec`) und Co-Pilot-Spec (`SalesCopilotSpec`)

## 3. Bleibt unverändert

- Content Cloud
- Server-seitige Fan-Simulationen (Personas, Cron, Pause)
- Fan-Brain, Sales-Funnel, Einwandsbehandlung, PPV-Persistenz

## 4. Nächste Schritte für den Dev

1. Auto-Chat-Qualität: Prompt-Tuning für weichere Bridges bei Stufenwechsel.
2. Telemetrie pro Stufe (Angebot → Kauf-Rate) für datenbasierte Preisleiter.
3. Retry-Varianten-Pool erweitern (Hooks/Captions), damit Wiederholungen nie gleich klingen.
4. Fan-Brain-Facts-Schema versionieren, bevor weitere Felder ergänzt werden.

## 5. Qualitäts-Guards (aktiv)

Aus der Auswertung der Simulation (Zeilen 363× wortgleich, Monologe mit
tausenden Nachrichten, 0 % Kaufrate bei 23–30 €) sind drei harte Bremsen
eingebaut:

- **Anti-Wiederholung** (`src/lib/repetition.ts`): die letzten 60 Model-Zeilen
  gehen als Sperrliste in den Prompt (`avoidLines`). Vor dem Senden prüfen
  Server-Sim und Browser-Autopilot jede Zeile noch einmal (Token-Overlap ≥ 0,6
  oder gleicher Satzanfang) und generieren bei Bedarf genau einmal neu.
- **Monolog-Bremse** (`sim-tick.ts`): maximal 2 Model-Nachrichten am Stück ohne
  Fan-Input; danach endet die Session statt weiterzureden.
- **Angebots-Budget** (`src/lib/salesFunnel.ts`): 1 Angebot pro Session,
  maximal 2 pro Sim-Tag, und nach 2 Wiederholungen ohne Kauf geht die Treppe
  eine Stufe zurück statt weiter zu eskalieren.


## 6. Gedächtnis & Tagesszenen (aktiv)

**Themen-Gedächtnis** (`src/lib/topicMemory.ts`)
- Leitet aus dem Verlauf ab, welche Themen schon dran waren (Name, Job, Wohnort, Familie, Sport, Urlaub, Geld, …). Fragen zu erledigten Themen sind im Prompt hart gesperrt — stattdessen Anknüpfen.
- **Offene Fäden**: persönliche Aussagen des Fans, auf die das Model nie eingegangen ist, werden im Prompt aufgelistet; genau einer davon soll aufgegriffen werden.
- **Beziehungs-Zeitstrahl**: "ihr schreibt seit X Tagen" verhindert Erstkontakt-Ton an Tag 4 (Quelle: `fan_brain.relationship.days_known`, Sim-Tag, Verlaufsdauer — der größte Wert gewinnt).

**Tagesszene** (`src/lib/dailyScene.ts`)
- Pro Chat und Tag ein deterministischer Tagesverlauf (Morgen / Tag / Abend + Stimmung). Der Prompt zeigt nur, was zeitlich schon passiert ist.
- Regel: erst von sich erzählen, dann höchstens eine Frage; kein Widerspruch zum Tagesverlauf.

Beide Blöcke hängen an `sessionContext` und gelten identisch in Server-Simulation (`src/routes/api/public/sim-tick.ts`) und Browser-Autopilot (`src/lib/chatStore.tsx`) — keine Änderung an der Edge Function nötig.
