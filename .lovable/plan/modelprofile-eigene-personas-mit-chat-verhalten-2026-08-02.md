# Modelprofile: eigene Personas mit Chat-Verhalten

## Ausgangslage (geprüft)

Es gibt bereits einen Admin-Bereich unter `/admin/models`: Liste, „+ Neues Model", Editor mit den Tabs Basis / Persona / Persönlich / PPV Sets, gespeichert in `model_profiles` (Felder u. a. `persona`, `tone_of_voice`, `writing_style`, `bio`, `fun_facts`, `hobbies`, `dos`, `donts`).

Der Steckbrief wird im Auto-Chat schon genutzt: `runAutopilotTurn` lädt das Profil und schickt es als `modelPersona` an die KI, die daraus einen STECKBRIEF-Block im System-Prompt baut.

Was fehlt: Antwort-Timing ist aktuell hart im Code (Tippen 0,9–2,1 s, zwischen Nachrichten 1,2–2,4 s, Burst-Fenster 2,8 s), Emojis sind nur als Prompt-Satz „emojis dosiert" hinterlegt (max. 1 Emoji pro Nachricht wird sogar erzwungen), und es gibt keine Model-eigenen Verhaltensregeln.

## Was gebaut wird

### 1. Neuer Editor-Tab „Chat-Verhalten"

Pro Model einstellbar:

- **Tempo**: Antwortverzögerung min/max in Sekunden, Tippdauer min/max, Pause zwischen Multi-Nachrichten, Burst-Fenster (wie lange auf weitere Fan-Nachrichten gewartet wird).
- **Multi-Reply**: wie viele Nachrichten pro Antwort typisch sind (1–3) und wie oft gesplittet wird.
- **Emojis**: eigenes Emoji-Set (Chips zum Hinzufügen/Löschen) plus Häufigkeit (keine / sparsam / normal / viele). Ersetzt das feste 1-Emoji-Limit, wenn das Model mehr erlaubt.
- **Steckbrief**: bestehende Persona-Felder bleiben, werden im Tab als Vorschau des Prompt-Blocks angezeigt, damit sichtbar ist, was die KI wirklich sieht.

### 2. Zusätzliche Punkte die wir bauen:

- **Schreibstil-Regler**: Kleinschreibung ja/nein, Nachrichtenlänge (kurz/mittel/lang), Tippfehler-Rate für Natürlichkeit, Duzen/Kosenamen.
- **Signature-Phrasen**: 3–5 typische Sätze/Wörter, die immer wieder auftauchen (macht Personas unterscheidbar).
- **Tabu-Liste**: Wörter/Themen, die nie vorkommen dürfen (härter als `donts`, wird nachträglich geprüft).
- **Aktivzeiten**: Zeitfenster, in denen sie „online" ist; außerhalb längere Verzögerung — passt zum Tagessprung der Simulation.
- **Verkaufs-Aggressivität**: Startpreis-Stufe und wie schnell die Preisleiter steigt, pro Model statt global.
- **Opener**: Begrüßungsvarianten für neue Chats.
- **Duplizieren**: bestehendes Model als Vorlage kopieren, um schnell mehrere Personas zu bauen.

### 3. Wirkung im Auto-Chat

- Das Timing kommt aus dem Profil statt aus Konstanten; ohne Einstellung bleiben die heutigen Werte als Default.
- Emoji-Set, Signature-Phrasen, Stilregler und Tabu-Liste gehen als eigener Block in den Prompt und werden bei der Nachprüfung der KI-Antwort berücksichtigt.
- Aktivzeiten und Verkaufs-Aggressivität greifen in Auto-Chat und Server-Simulation gleich, damit beide dieselbe Logik behalten.
- Bestehende Chats, PPV-Käufe und Fanbrain-Daten werden nicht angetastet.

### 4. Zugang

Ein „Models"-Eintrag im Dev-Bereich der Sidebar führt direkt zum Model-Admin, damit man neue Profile ohne Umweg anlegen kann.

## Technische Details

- Migration auf `model_profiles`: neue Spalten `chat_behavior jsonb default '{}'` (Timing, Multi-Reply, Stil, Aktivzeiten, Verkaufstempo), `emojis text[]`, `emoji_frequency text`, `signature_phrases text[]`, `taboo_words text[]`, `openers text[]`. Bestehende Zeilen bekommen Defaults, keine Datenmigration nötig. GRANTs/RLS wie bei den vorhandenen Spalten (Policies gelten tabellenweit, bleiben unverändert).
- `src/lib/chatStore.tsx`: `buildModelPersonaPayload` um die neuen Felder erweitern; in `runAutopilotTurn` die `rand(...)`-Konstanten und `AUTOPILOT_BURST_WINDOW_MS` durch Werte aus dem Profil ersetzen (mit heutigen Fallbacks).
- `supabase/functions/chat-copilot/index.ts`: Persona-Block um Emoji-/Stil-/Tabu-/Phrasen-Regeln erweitern; die feste Emoji-Obergrenze auf die Model-Einstellung umstellen; Tabu-Wörter im Nachprüf-Schritt filtern.
- `src/routes/api/public/sim-tick.ts`: dieselben Profilwerte für Tempo und Verkaufstempo verwenden.
- `src/routes/_authenticated/_admin/admin.models.$id.tsx`: neuer Tab „Chat-Verhalten" mit Reglern, Emoji-Chips und Prompt-Vorschau; „Duplizieren" in der Liste.
- Doku: Abschnitt „Modelprofile & Verhaltens-Einstellungen" in `docs/fahrplan.md`, inkl. Angabe welcher Wert wo greift.

## Prüfung

Neues Model anlegen, Tempo bewusst langsam + eigenes Emoji-Set setzen, Auto-Test-Chat mit diesem Model öffnen, als Fan schreiben und beobachten, dass Verzögerung, Multi-Reply-Verhalten und Emojis den Einstellungen folgen.