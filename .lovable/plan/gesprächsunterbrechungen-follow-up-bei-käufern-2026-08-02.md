# Gesprächsunterbrechungen + Follow-up bei Käufern

Heute laufen die Auto-Chats als eine durchgehende Kette: Der Tages-Cut hängt allein an der Nachrichtenzahl (alle 100 Nachrichten ein Tagessprung), die Persona-Felder `sessionTurns`, `breakHours`, `ghostChancePct` und `ghostHours` sind definiert, werden vom Server-Loop aber nicht benutzt. Das `end`-Signal des Fan-Bots wird ebenfalls ignoriert. Es gibt bereits eine Morgen-Nachricht-Logik, aber nur im Browser (`triggerReengage`), nicht serverseitig. Damit fehlen genau die zwei Dinge, die du willst: echte Unterbrechungen mit emotionalem Neustart und ein Abschluss nach einem Kauf.

## 1. Gesprächsunterbrechungen

**Sessions statt Endloskette.** Jeder Chat läuft in Sessions: ein paar Züge hin und her, dann eine Pause, dann ein Neustart. Länge der Session und der Pause kommen aus der Persona (Ghoster taucht 30–70 h ab, der Whale ist nach 4–10 h wieder da).

**Pausen-Arten:**
- Kurz (Minuten) — innerhalb der Session, wie heute
- Session-Pause (Stunden, aus `breakHours`)
- Nachtruhe — landet die Pause zwischen 00:00 und 06:00, wird auf 07:00–10:00 verschoben
- Funkstille (Tage, aus `ghostHours` mit `ghostChancePct`)

**Emotionaler Neustart nach der Pause.** Der Server schickt der KI ab jetzt einen Neustart-Kontext mit: wie lange die Pause war, welche Tageszeit jetzt ist, was das letzte Thema war und ob der Fan oder das Model eröffnet. Regeln im Prompt:
- Höchstens ein kurzer Rückbezug auf vorher, dann ein neues Thema
- Verkaufsspannung von gestern wird nicht fortgesetzt ("und, überlegst du noch?" ist verboten)
- Ab ca. 6 h Pause gilt die Stimmung als zurückgesetzt: neu aufwärmen statt weitermachen
- Nach der Pause eröffnet je nach Persona der Fan oder das Model

**Verkaufstreppe reagiert auf die Pause.** Ein offenes, nicht gekauftes Angebot gilt nach einer langen Pause als kalt: es blockiert nicht mehr, wird aber auch nicht sofort wiederholt — der Aufbau (`requiredFanTurns`) startet neu bei null. Einwände, die vor der Pause gefallen sind, blocken nach einer langen Pause nicht mehr; die Rabatt-Stufe bleibt erhalten.

## 2. Follow-up bei Käufern und Ende der Endlosschleife

**Abschluss statt Abbruch.** Eine Session endet, wenn die Persona-Zugzahl erreicht ist oder der Fan-Bot `end` meldet. Hat der Fan in dieser Session gekauft, geht der Chat in den Zustand "Follow-up offen": Das Model schreibt am nächsten Morgen (07:00–10:00) eine warme, persönliche Guten-Morgen-Nachricht mit einem konkreten Rückbezug, genau einer offenen Frage und ohne jeden Verkauf. Die Formulierungsregeln dafür liegen heute schon im Browser-Code und werden in ein gemeinsames Modul gezogen, damit Browser und Server identisch arbeiten. Pro Sim-Tag gibt es höchstens ein solches Follow-up.

**Kein ewiges Weiterlaufen.** Der Chat bekommt einen Lebenszyklus:

```text
Session → Pause → (Kauf? Guten-Morgen-Follow-up : normaler Neustart) → nächste Session
                                                                   ↓
                                       nach X Sim-Tagen → Zustand "abgeschlossen"
```

Ein Lauf endet automatisch nach einer einstellbaren Zahl Sim-Tage (Standard 14) und geht in den Zustand "abgeschlossen" — er verbraucht dann keine Credits mehr und lässt sich in der Chat-Liste wieder starten.

**Sichtbar in der UI.** Das Simulationsband im Chat zeigt statt nur "läuft/pausiert" jetzt: aktiv, Pause bis <Zeit>, Follow-up morgen früh, oder abgeschlossen nach X Tagen.

## Technische Details

- Neue Spalten auf `sim_runs`: `session_turn`, `phase` (`active` | `break` | `followup_due` | `done`), `gap_hours`, `purchases_in_session`, `last_followup_day`, `max_sim_days`; `state` erhält zusätzlich `completed`. Migration inkl. `GRANT`s bleibt wie bei den bestehenden Spalten.
- Neues Modul `src/lib/sessionRhythm.ts`: entscheidet aus Persona + Lauf-Zustand, ob weiter gespielt, eine Pause eingelegt oder ein Follow-up fällig wird, und berechnet die Pausenlänge inkl. Nachtruhe-Klemmung.
- Neues Modul `src/lib/reengage.ts`: die gemeinsamen Morgen-/Mittags-Prompt-Bausteine, importiert von `chatStore.tsx` (Browser) und `sim-tick.ts` (Server).
- `SimClock` in `sim-tick.ts` bekommt `jumpHours()` und `jumpToNextMorning()`; der starre Cut alle 100 Nachrichten entfällt, `sim_day` wird aus dem Zeitstempel abgeleitet.
- `computeFunnelState` erhält eine Option `hoursSinceLastMessage`, die den Aufbau zurücksetzt, offene Angebote als abgelaufen markiert und alte Einwände verfallen lässt.
- Der Payload an `chat-copilot` erhält `sessionContext` (Pausenlänge, Uhrzeit, Neustart-Flag, Follow-up-Flag). In der Edge Function kommt ein neuer Prompt-Block dafür, plus Deploy.
- `src/lib/simRuns.tsx` liest die neuen Felder, `ChatArea.tsx` zeigt sie im Band an.
- `docs/fahrplan.md` bekommt einen Abschnitt zu Session-Rhythmus, Neustart-Regeln und Follow-up.
- Pausen laufen weiter in simulierter Zeit, nicht in echter — die Chats schreiben also ohne echtes Warten, nur die Zeitstempel und die Stimmung springen. Der Tages-Deckel senkt den Credit-Verbrauch, weil Läufe von allein enden.
