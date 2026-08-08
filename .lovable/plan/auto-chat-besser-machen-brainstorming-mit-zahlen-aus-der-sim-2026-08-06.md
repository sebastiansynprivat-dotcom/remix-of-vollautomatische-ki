# Auto-Chat besser machen — Brainstorming mit Zahlen aus der Simulation

## Was heute schon steht

Auto-Chat (Fan = Mensch, Model = KI), Fan-Brain, deterministische Verkaufs-Treppe, Einwandbehandlung, Session-Rhythmus mit Pausen und Käufer-Follow-up, 10 Server-Personas mit Cron-Tick, Model-Profile mit Chat-Verhalten. Die Logik ist vollständig — die **Qualität der Nachrichten** ist der Flaschenhals.

## Was die Daten sagen (aus der laufenden Simulation)

| Messwert | Ist-Wert | Bewertung |
| --- | --- | --- |
| Model-Textnachrichten | 35.497 | |
| davon inhaltlich verschieden | 26.162 (74 %) | eine Zeile kam **363×** wortgleich |
| Nachrichten in Folge ohne Fan-Antwort | Ø 7,3 / max. 4.121 | das Model schreibt Monologe |
| Anteil Nachrichten mit Fragezeichen | 33 % | viele Schein-Fragen („wetten du…?") |
| Ø Nachrichtenlänge | 61 Zeichen | ok |
| PPV verschickt / gekauft | 6.546 / 56 = **0,9 %** | |
| Angebote zu 23 € und 30 € | 6.349 → **0 Käufe** | Spam-Schleife |
| Angebote zu 5 / 10 / 20 € | 55 / 13 / 9 → 25 % / 92 % / 66 % | die günstigen Stufen funktionieren |

Kurz: nicht die Verkaufslogik ist kaputt, sondern **Wiederholung, Monologe und Angebots-Inflation**.

## Ideen, nach Wirkung sortiert

### A. Anti-Wiederholungs-Wächter (größter Effekt)
Die letzten ~60 Model-Nachrichten werden zu Phrasen-Fingerprints verdichtet. Zwei Stellen greifen darauf zu:
- **Prompt**: Liste „diese Satzanfänge und Bilder sind gerade verbraucht" + Pflicht, einen neuen Beat zu setzen.
- **Nachprüfung**: ist die generierte Nachricht zu ähnlich zu einer der letzten, wird genau einmal neu generiert; sonst fällt sie weg statt raus.
Zusätzlich ein Cooldown für Signature-Phrasen und Standard-Öffner („hehe", „wetten", „glaube du…").

### B. Monolog-Bremse
Ohne Fan-Antwort maximal **2 Nachrichten** hintereinander, danach echte Stille. Erst nach der regulären Pause eine einzige Re-Engage-Nachricht (Logik existiert schon in `sessionRhythm.ts`, wird nur nicht erzwungen). Das killt die 4.000er-Ketten und senkt gleichzeitig die Kosten deutlich.

### C. Angebots-Budget statt Dauerfeuer
- Höchstens **1 Angebot pro Session** und maximal 2 pro Sim-Tag.
- Preis steigt nur nach einem **echten Kauf**, nicht schon nach einem abgelaufenen Angebot.
- Nach zwei Absagen auf derselben Stufe geht die Leiter eine Stufe **zurück** statt weiter hoch.
- Harte Preis-Obergrenze pro Fan aus dem Fan-Brain (Zahlungsbereitschaft), damit nie wieder 3.000 Angebote zu 23 € rausgehen.

### D. Frage- und Beat-Balance
Pro Zug höchstens **eine echte Frage**, Schein-Fragen zählen als Statement und sind limitiert. Die Multi-Reply-Slots bekommen unterschiedliche Rollen (Reaktion → Eigenes Erlebnis → optional Frage), damit drei Nachrichten nicht dreimal dasselbe Muster sind.

### E. Themen-Gedächtnis („nicht zweimal dasselbe fragen")
Im Fan-Brain eine Liste **erledigter Themen und offener Fäden**. Erledigte Fragen sind gesperrt, offene Fäden werden bevorzugt aufgegriffen. Aktuell ist das Brain dünn: Stimmung steht 7 Tage lang auf demselben Wert, das freie Notizfeld ist leer.

### F. Tagesszenen für das Model
Pro Sim-Tag ein kleiner Tagesplan (aufgewacht, Sport, Arbeit, Abend allein). Alle Nachrichten des Tages hängen daran. Das erzeugt Abwechslung von sich aus, statt endloser Teaser-Schleife.

### G. Qualitäts-Telemetrie
Auswertung pro Stufe, Persona und Model: Angebot → Kauf-Rate, Wiederholungsquote, Ø Fan-Antwortlänge, Abbruchquote. Sichtbar im Dev-Bereich. Damit werden Preise und Timing datenbasiert statt aus dem Gefühl gesetzt — und man sieht sofort, ob eine Prompt-Änderung geholfen hat.

### H. Kosten
Der Fan-Bot kann auf ein günstigeres Modell laufen (das Model-Modell bleibt stark). Zusammen mit B und C sinkt der Verbrauch stark, weil die Monolog- und Angebots-Schleifen wegfallen.

## Vorschlag für die Reihenfolge

1. **Schritt 1 (sofort spürbar):** A + B + D — Wiederholung, Monologe, Frage-Balance.
2. **Schritt 2:** C — Angebots-Budget und Rückstufung, damit die PPV-Rate wieder in Richtung der 10-€-Stufe geht.
3. **Schritt 3:** E + F — Gedächtnis und Tagesszenen für echte Abwechslung.
4. **Schritt 4:** G + H — Messbarkeit und Kosten.

## Technische Details

- Neue Datei `src/lib/repetition.ts`: Fingerprints der letzten Model-Nachrichten, Ähnlichkeitsvergleich, verbrauchte Phrasen. Wird von `chatStore.tsx` (Browser) und `sim-tick.ts` (Server) gleich benutzt.
- `supabase/functions/chat-copilot/index.ts`: neuer Block „VERBRAUCHT — nicht wiederholen", Slot-Rollen, Fragen-Limit, Ähnlichkeits-Retry im bestehenden Audit-Schritt.
- Monolog-Bremse in `sim-tick.ts` und `chatStore.tsx`: Zähler für Model-Nachrichten seit der letzten Fan-Nachricht; darüber greift der Pausen-Pfad aus `sessionRhythm.ts`.
- `src/lib/salesFunnel.ts`: Angebots-Budget pro Session/Tag, Aufstieg nur bei bezahltem Kauf, Rückstufung nach zwei Absagen, Preisdeckel aus dem Fan-Brain.
- `src/lib/fanBrainEngine.ts`: Felder für erledigte Themen und offene Fäden; Tagesszene als eigener Prompt-Block.
- Telemetrie als Leseabfragen plus eine kleine Dev-Ansicht; keine neuen Schreibpfade.
- Bestehende Chats, Käufe und Fan-Brain-Daten bleiben unangetastet.
