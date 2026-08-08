# 10 vollautomatische Test-Chats (Fan + Model automatisiert, serverseitig)

Heute läuft der Autopilot nur im Browser: `runAutopilotTurn` in `src/lib/chatStore.tsx` treibt die Model-Seite, der Fan bist du. Es gibt 4 Autopilot-Chats (Migration vom 31.07.) und schon eine Fan-Simulation als Edge Function (`supabase/functions/fan-sim-bot`), die aktuell nur von `src/routes/voice-sim.tsx` benutzt wird. Live-Updates gibt es bisher nur für `conversations`, nicht für `messages`.

Ziel: 10 Chats, in denen Fan **und** Model automatisch schreiben, gesteuert von einem Server-Loop, der auch läuft, wenn kein Browser offen ist — über Tage, endlos, pausierbar, und mit Wiedereinstieg an der letzten gelesenen Stelle.

## 1. Kundentypen (10 Personas)

Neue Datei `src/lib/simPersonas.ts` als zentrale Persona-Definition. Jede Persona hat: Anzeigename, Verhaltens-Prompt (Ton, Länge, Burst-Neigung), Kaufneigung (0–100 %), Preisgrenze, Antwort-Tempo und Aktiv-Zeiten.

1. Nie-Käufer — reagiert freundlich, kauft nie
2. Alles-Käufer (Whale) — kauft jedes Angebot sofort
3. Dirty-Talker — bleibt dauerhaft im anzüglichen Register, kauft selten
4. Bindungs-Typ — viel Alltag, Nähe, Emotion, kauft langsam aber sicher
5. Schnäppchenjäger — kauft nur nach Rabatt (testet die Rabatt-Logik)
6. Skeptiker — hinterfragt Preise, braucht lange
7. Schüchterner — sehr kurze Nachrichten, wenig Initiative
8. Chaos-Burster — 2–3 Nachrichten am Stück, testet Multi-Reply-Gruppierung
9. Ghoster — antwortet tagelang nicht, kommt dann zurück
10. Einsteiger-Käufer — kauft die günstigen Stufen, blockt ab 20 €

Die Personas erweitern die bestehenden Prompts in `fan-sim-bot` (neue Keys ergänzen, alte bleiben für `voice-sim` erhalten).

## 2. Server-Loop (läuft ohne offene Seite)

Neue Tabelle `sim_runs`: eine Zeile pro simuliertem Chat mit `conversation_id`, `persona`, `state` (`running` / `paused`), `next_run_at`, `sim_day`, `turn_count`, `last_error`.

Neue öffentliche Route `src/routes/api/public/sim-tick.ts`, abgesichert mit einem Shared Secret im Header (`SIM_TICK_SECRET`). pg_cron ruft sie jede Minute auf. Pro Aufruf:

1. Alle fälligen Läufe holen (`state = 'running'`, `next_run_at <= now()`), pro Tick begrenzt.
2. Fan-Turn: `fan-sim-bot` mit der Persona + Verlauf → 1–3 Fan-Nachrichten in `messages` schreiben.
3. Funnel-Stand mit der bestehenden Logik aus `src/lib/salesFunnel.ts` berechnen (die Route kann diese Datei direkt importieren — kein Duplizieren der Verkaufstreppe).
4. Model-Turn: `chat-copilot` mit `autopilot: true` und identischem Payload wie heute im Store → Nachrichten und ggf. PPV mit Caption schreiben.
5. Kauf-Entscheidung: die Persona entscheidet anhand ihrer Kaufneigung, Preisgrenze und des Rabatts, ob `ppv_is_purchased` gesetzt wird — damit greifen Wiederholung, Bypass-Zähler und Rabatt-Stufen automatisch.
6. `next_run_at` neu setzen: realistische Pausen (Minuten innerhalb einer Session, Nachtruhe, gelegentlich ein ganzer Tag Funkstille) → der Verlauf zieht sich über mehrere Tage und endet nie.

Fan-Brain und Notizen werden wie bisher über `fan_brain` fortgeschrieben.

## 3. Live mitlesen + Wiedereinstieg

- Realtime-Abo auf `messages` für den offenen Chat, damit neue Server-Nachrichten sofort erscheinen, ohne Reload.
- Neue Tabelle `conversation_reads` (Nutzer + Chat + letzter gelesener Zeitstempel). Beim Öffnen springt die Ansicht auf die erste ungelesene Nachricht, mit Trennlinie „Neu ab hier". Beim Verlassen/Lesen wird der Stand gespeichert.
- Ungelesen-Zähler in der Chat-Liste anhand dieses Stands.

## 4. Pause-Steuerung

- Pause/Weiter-Button im Chat-Header (schaltet `sim_runs.state`).
- „Alle pausieren / Alle starten" in der Chat-Liste.
- Gelöschte Nachrichten pausieren weiterhin, der bestehende „Weiter & neu generieren"-Button setzt den Lauf serverseitig fort.

## 5. Seeding

Migration: 10 Fans + 10 Konversationen (`is_autopilot = true`) + 10 `sim_runs` mit je einer Persona, `fan_brain`-Startzeilen, plus `GRANT`s und RLS-Policies für die neuen Tabellen (Lesen für angemeldete Nutzer, Schreiben nur über den Server).

## Technische Details

- Der Tick nutzt den privilegierten Server-Client (`@/integrations/supabase/client.server`), erst nach Prüfung des Shared Secrets.
- Ein Lauf wird während der Bearbeitung gesperrt (`next_run_at` vorziehen + Statusfeld), damit ein zweiter Tick denselben Chat nicht doppelt bespielt.
- Der Client-Autopilot in `chatStore.tsx` wird für Chats mit `sim_runs`-Zeile deaktiviert, damit Browser und Server nicht gegeneinander schreiben. Die 4 bestehenden Autopilot-Chats bleiben als manuelle Test-Chats erhalten.
- Verkaufstreppe, Rabatte, Wiederholung, Bypass-Zähler und PPV-Caption-Layout bleiben unverändert — sie werden nur vom Server statt vom Browser aufgerufen.
- Kosten: die 10 Chats laufen dauerhaft und verbrauchen fortlaufend KI-Credits. Ich setze die Standard-Taktung bewusst ruhig (wenige Turns pro Stunde pro Chat), regelbar über `sim_runs`.
