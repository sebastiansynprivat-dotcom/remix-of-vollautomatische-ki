# Auto-Pilot-Chats: Creator antwortet vollautomatisch

Neue Chat-Sorte zum Testen: Du schreibst als Fan ganz normal ins Eingabefeld, der Creator (die KI) antwortet komplett von selbst — keine Smart Replies mehr, kein Klick. Dieselbe Fan-Brain-Logik wie heute, nur ohne Zwischenschritt.

## Was entsteht

- **4 Auto-Pilot-Chats**, oben in der Konversationsliste angepinnt mit einem eigenen Badge ("Auto"), pro Model-Profil verfügbar.
- **Kein Testmodus-Schalter** — diese Chats sind dauerhaft Auto-Pilot, alle anderen Chats bleiben exakt wie bisher (Smart Replies unverändert).
- **Eingabefeld schreibt als Fan.** Deine Nachricht erscheint als Fan-Nachricht rechts/links wie gehabt, der Creator antwortet automatisch.
- **Voller Funktionsumfang der KI:** einzelne Nachricht, Multi-Reply (2–3 Nachrichten nacheinander), sowie PPV vollautomatisch mit Caption und Preis. Tip-Anfragen ebenso.
- **Realistisches Tempo:** Tipp-Indikator, 1–3 Sekunden Pause vor der ersten Antwort, Folge-Nachrichten in natürlichem Abstand.
- **Alles in der Cloud gespeichert:** Verlauf und Fan-Brain bleiben nach Reload erhalten; pro Chat gibt es weiterhin den Reset.

## Ablauf pro Turn

```text
Du tippst als Fan  ->  Nachricht wird gespeichert
                   ->  Fan-Brain + Model-Persona werden geladen
                   ->  KI-Brief wird erzeugt (gleiche Engine wie Smart Reply)
                   ->  Creator "tippt"...
                   ->  Nachricht 1  (Pause)  Nachricht 2  (Pause)  ggf. PPV
                   ->  Fan-Brain wird aktualisiert
```

## Technische Umsetzung

1. **Datenbank-Migration**
   - Spalte `is_autopilot boolean not null default false` auf `conversations`.
   - Seed: 4 Demo-Fans (`fans`) plus 4 zugehörige `conversations` mit `is_autopilot = true`, verteilt auf vorhandene `model_profiles`, inkl. Start-Fan-Brain-Zeilen. Rows werden als literale INSERTs in der Migration angelegt.
   - Bestehende Grants/RLS-Muster der Tabellen werden für die neue Spalte mitgenutzt (keine neue Tabelle).

2. **`src/lib/cloudChat.tsx`** — `is_autopilot` mitladen und in die `Conversation`-Struktur (`isAutopilot`) mappen.

3. **`src/data/mockData.ts`** — optionales Feld `isAutopilot?: boolean` im `Conversation`-Typ.

4. **`src/lib/chatStore.tsx`** — neue Funktion `runAutopilotTurn(convId)`:
   - nutzt die vorhandene `chat-copilot`-Anbindung (gleicher Body: `messages`, `fanMeta`, `modelPersona`, `knownFacts`, `fanId`, `fanBrain`),
   - nimmt aus dem Brief die beste Suggestion und sendet sie über die bestehenden `sendText` / `sendChain`-Pfade als Model-Nachricht (inkl. Persistenz),
   - sendet bei `ppvHint.ready` zusätzlich Caption + `sendPPV` mit vorgeschlagenem Preis,
   - setzt `setTyping` für den Tipp-Indikator und staffelt die Nachrichten mit Delay,
   - Guard gegen Doppel-Läufe pro Conversation, Fehlerfall schreibt eine dezente Hinweisnachricht statt zu blockieren.
   - `sendAsFan` persistiert künftig ebenfalls (bisher nur lokal), damit Fan-Nachrichten in Autopilot-Chats in der DB landen, und triggert danach `runAutopilotTurn`.

5. **`src/components/layout/ChatArea.tsx`**
   - Bei `conv.isAutopilot`: `SmartReplyRail` ausblenden, `refreshCopilot` nicht mehr automatisch aufrufen.
   - `MessageInput` mit `asFan` rendern (Anhang-/PPV-Buttons bleiben aus, da du als Fan schreibst).
   - Schmaler Statusstreifen über dem Eingabefeld: "Auto-Pilot aktiv — Creator antwortet automatisch".

6. **`src/components/layout/ConversationList.tsx`** — Autopilot-Chats vor allen anderen sortieren (wie bisher der AI-Demo-Chat) und mit "Auto"-Badge kennzeichnen.

7. **`src/components/chat/ChatHeader.tsx`** — Auto-Pilot-Indikator neben dem Namen.

Nicht angefasst: bestehende Smart-Reply-Chats, `chat-copilot`-Edge-Function-Logik, Fan-Brain-Merge, Time-Travel/Reengage.
