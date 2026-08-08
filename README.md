# Vollautomatische KI

# Master-Prompt — Chat Interface Visual Prototype

## Kontext & Ziel

Baue einen **vollständigen visuellen Prototyp** eines Creator-Chat-Interfaces. Kein echtes Backend, keine API-Calls. Alle Daten kommen aus lokalen Mock-Objekten (`src/data/mockData.ts`). Das Design ist das Produkt — jede Komponente, jeder State, jede Interaktion muss klar erkennbar sein. Ein Programmierer soll danach genau wissen was er wo anbinden muss.

**Stack:** React + TypeScript + Vite. Kein Tailwind. Kein UI-Framework. Nur CSS Custom Properties und eigene Komponenten.

---

## Projekt-Struktur

```
src/
├── data/
│   └── mockData.ts          ← alle Mock-Daten zentral hier
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── ConversationList.tsx
│   │   └── ChatArea.tsx
│   ├── chat/
│   │   ├── MessageBubble.tsx
│   │   ├── PPVMessageBubble.tsx
│   │   ├── TipMessageBubble.tsx
│   │   ├── TypingIndicator.tsx
│   │   ├── MessageInput.tsx
│   │   └── ChatHeader.tsx
│   ├── monetization/
│   │   ├── TipButton.tsx
│   │   ├── TipPanel.tsx
│   │   ├── SubscriptionLockOverlay.tsx
│   │   ├── PPVSendModal.tsx
│   │   └── EarningsDashboard.tsx
│   ├── profile/
│   │   ├── CreatorProfile.tsx
│   │   ├── PostFeed.tsx
│   │   ├── PostCard.tsx
│   │   └── ProductShop.tsx
│   ├── discover/
│   │   ├── DiscoverFeed.tsx
│   │   └── CreatorCard.tsx
│   └── ui/
│       ├── Avatar.tsx
│       ├── Badge.tsx
│       ├── PremiumCard.tsx
│       └── Toast.tsx
├── styles/
│   └── tokens.css           ← alle CSS Custom Properties
├── App.tsx
└── main.tsx
```

---

## Design-System — tokens.css (Pflicht, keine Abweichungen)

```css
:root {
  /* Hintergründe */
  --background:      hsl(240, 6%, 4%);
  --surface-1:       hsl(240, 6%, 5%);
  --surface-2:       hsl(0, 0%, 100%, 0.02);
  --surface-3:       hsl(0, 0%, 100%, 0.04);

  /* Champagner-Gold */
  --gold:            hsl(40, 45%, 55%);
  --gold-light:      hsl(40, 50%, 65%);
  --gold-dark:       hsl(40, 40%, 42%);

  /* Text */
  --text-strong:     hsl(0, 0%, 96%);
  --text:            hsl(0, 0%, 84%);
  --text-muted:      hsl(0, 0%, 64%);
  --text-subtle:     hsl(0, 0%, 46%);

  /* Status */
  --status-success:  hsl(155, 60%, 50%);
  --status-warning:  hsl(45, 85%, 55%);
  --status-critical: hsl(0, 75%, 58%);

  /* Loyalty Tiers */
  --bronze:          hsl(25, 60%, 45%);
  --silver:          hsl(0, 0%, 65%);

  --radius:          0.75rem;
  --easing:          cubic-bezier(0.16, 1, 0.3, 1);
}

body {
  background: var(--background);
  background-image: radial-gradient(
    ellipse 80% 40% at 50% 0%,
    hsl(40, 30%, 8%) 0%,
    transparent 70%
  );
  font-family: 'Inter', sans-serif;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  color: var(--text);
  min-height: 100dvh;
  overflow: hidden;
  scrollbar-width: none;
}

/* Premium Glass Card — auf allen Containern verwenden */
.premium-card {
  background: linear-gradient(160deg, hsl(0,0%,100%,0.05) 0%, hsl(0,0%,0%,0.22) 100%);
  backdrop-filter: blur(40px) saturate(160%);
  border: 1px solid hsl(0,0%,100%,0.07);
  border-radius: var(--radius);
  box-shadow:
    inset 0 1px 0 hsl(0,0%,100%,0.08),
    0 0 0 1px hsl(0,0%,0%,0.3),
    0 4px 16px hsl(0,0%,0%,0.4),
    0 16px 40px hsl(0,0%,0%,0.25);
  position: relative;
}
.premium-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, hsl(0,0%,100%,0.05) 0%, transparent 40%);
  pointer-events: none;
}
.premium-card:hover {
  transform: translateY(-2px);
  border-color: hsl(0,0%,100%,0.12);
  box-shadow:
    inset 0 1px 0 hsl(0,0%,100%,0.08),
    0 0 0 1px hsl(0,0%,0%,0.3),
    0 4px 16px hsl(0,0%,0%,0.4),
    0 16px 40px hsl(0,0%,0%,0.25),
    0 0 32px hsl(40,45%,55%,0.06);
  transition: all 320ms var(--easing);
}

/* Alle Zahlen immer tabular */
.tabular { font-variant-numeric: tabular-nums; }

/* Reveal-Animation beim Mount */
@keyframes reveal {
  from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0);   filter: blur(0); }
}
.reveal { animation: reveal 500ms var(--easing) both; }

/* Kein sichtbarer Scrollbar nirgends */
* { scrollbar-width: none; }
*::-webkit-scrollbar { display: none; }

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

---

## Mock-Daten — src/data/mockData.ts

Alle Mock-Daten hier zentral. Jeder Kommentar markiert wo der Programmierer später die echte API-Anbindung macht.

```typescript
// TODO: API-Call → GET /api/me
export const mockCurrentUser = {
  id: "user-001",
  displayName: "Sofia M.",
  avatarUrl: null, // Initialen-Fallback
  isCreator: true,
  walletBalance: 1284_50, // in Cent
  subscriberCount: 342,
};

// TODO: API-Call → GET /api/conversations
export const mockConversations = [
  {
    id: "conv-001",
    participant: { id: "fan-001", displayName: "Alex R.", avatarUrl: null, status: "online", loyaltyTier: "gold" },
    lastMessage: { content: "Kannst du mir noch eins schicken? 🔥", createdAt: "2026-05-09T14:32:00Z" },
    unreadCount: 3,
    tipVolume: 12500, // in Cent — bestimmt Inbox-Priorität
  },
  {
    id: "conv-002",
    participant: { id: "fan-002", displayName: "Marc T.", avatarUrl: null, status: "away", loyaltyTier: "silver" },
    lastMessage: { content: "Danke ❤️", createdAt: "2026-05-09T13:10:00Z" },
    unreadCount: 0,
    tipVolume: 4500,
  },
  {
    id: "conv-003",
    participant: { id: "fan-003", displayName: "Jonas K.", avatarUrl: null, status: "offline", loyaltyTier: null },
    lastMessage: { content: "Wann ist das nächste Abo fällig?", createdAt: "2026-05-09T11:00:00Z" },
    unreadCount: 1,
    tipVolume: 0,
  },
];

// TODO: API-Call → GET /api/conversations/:id
export const mockMessages = [
  { id: "msg-001", senderId: "fan-001", contentType: "text", content: "Hey, hast du heute noch was geplant? 👀", createdAt: "2026-05-09T14:20:00Z", status: "read" },
  { id: "msg-002", senderId: "user-001", contentType: "text", content: "Ja, kommt gleich was Neues 😉", createdAt: "2026-05-09T14:21:00Z", status: "read" },
  {
    id: "msg-003", senderId: "user-001", contentType: "ppv",
    ppv: { price: 1499, currency: "EUR", mediaType: "photo", mediaCount: 6, previewUrl: null, isPurchased: false },
    createdAt: "2026-05-09T14:25:00Z", status: "delivered"
  },
  {
    id: "msg-004", senderId: "fan-001", contentType: "tip",
    tip: { amount: 2500, currency: "EUR", message: "Du bist die Beste 🔥" },
    createdAt: "2026-05-09T14:28:00Z", status: "read"
  },
  {
    id: "msg-005", senderId: "user-001", contentType: "ppv",
    ppv: { price: 999, currency: "EUR", mediaType: "video", mediaCount: 1, previewUrl: null, isPurchased: true },
    createdAt: "2026-05-09T14:30:00Z", status: "read"
  },
  { id: "msg-006", senderId: "fan-001", contentType: "text", content: "Kannst du mir noch eins schicken? 🔥", createdAt: "2026-05-09T14:32:00Z", status: "delivered" },
];

// TODO: API-Call → GET /api/me/wallet + GET /api/me/transactions
export const mockEarnings = {
  balance: 1284_50,
  pendingBalance: 320_00,
  monthlyTotal: 4820_00,
  allTimeTotal: 28_450_00,
  transactions: [
    { id: "tx-001", type: "subscription", amount: 2053, description: "Abo — Alex R.", createdAt: "2026-05-09T10:00:00Z" },
    { id: "tx-002", type: "tip", amount: 2500, description: "Trinkgeld — Alex R.", createdAt: "2026-05-09T14:28:00Z" },
    { id: "tx-003", type: "ppv", amount: 1499, description: "PPV-Kauf — Marc T.", createdAt: "2026-05-08T18:00:00Z" },
    { id: "tx-004", type: "product", amount: 3900, description: "Produkt — Jonas K.", createdAt: "2026-05-07T12:00:00Z" },
  ],
};

// TODO: API-Call → GET /api/creators/:id/products
export const mockProducts = [
  { id: "prod-001", title: "Signiertes Polaroid", price: 3900, currency: "EUR", stock: 5, category: "signed", isAvailable: true },
  { id: "prod-002", title: "Fan-Box Mai", price: 4900, currency: "EUR", stock: 2, category: "fanbox", isAvailable: true },
  { id: "prod-003", title: "Limitiertes Set", price: 6900, currency: "EUR", stock: 0, category: "merchandise", isAvailable: false },
];

// TODO: API-Call → GET /api/discover/trending
export const mockTopCreators = [
  { id: "creator-001", displayName: "Lena V.", subscriberCount: 1240, price: 1999, category: "Lifestyle" },
  { id: "creator-002", displayName: "Mia K.", subscriberCount: 890, price: 1499, category: "Fitness" },
  { id: "creator-003", displayName: "Sara J.", subscriberCount: 2100, price: 2499, category: "Fashion" },
];
```

---

## Screens & Komponenten

### App.tsx — Navigation zwischen Views
```
Views: "chat" | "discover" | "profile" | "earnings" | "shop"
```
State lokal in App.tsx halten. Sidebar navigiert zwischen Views. Kein React Router nötig.

---

### Sidebar.tsx

```
[Logo — "SX" in gold]
──────────────────
[Chat-Icon]      Nachrichten       ← active wenn view === "chat"
[Compass-Icon]   Entdecken
[User-Icon]      Profil
[Shop-Icon]      Shop
[Chart-Icon]     Einnahmen
──────────────────
[Avatar + Name]  Sofia M.
[Dot grün]       Online
```

- Hintergrund: `var(--surface-1)` + radiales Gold-Gradient oben links
- Border rechts: `1px solid hsl(0,0%,100%,0.05)`
- Jedes Nav-Item: linker 2px Indikator-Strich, bei Hover 50% Höhe, bei Active 65% + Gold-Glow
- Active Item: Icon-Color `var(--gold)`, leichter Gradient-Hintergrund
- Unread-Badge an Chat-Icon: kleine Gold-Pill mit Zahl

---

### ConversationList.tsx

- Header: "Nachrichten" + Filter-Icon
- Suchfeld: `premium-card`-Stil, Placeholder "Suchen..."
- Liste sortiert nach `tipVolume` absteigend (höchstes Trinkgeld = oben)
- Jede Row:
  - Avatar (Initialen-Circle, Farbe aus User-ID deterministisch)
  - Loyalty-Badge wenn vorhanden (`--gold` für Gold, `--silver` für Silver, `--bronze` für Bronze) — atmender Glow
  - Online-Dot: grün breathing bei "online", gedämpft grau bei "offline"
  - Letzter Nachrichtentext: eine Zeile, ellipsis
  - Timestamp: relativ ("gerade eben", "vor 2 Min", "vor 1 Std")
  - Unread-Badge: Gold-Pill rechts
  - Hover: 2px Gold-Strich links, `scaleY(0)` → `scaleY(1)` von Mitte
- Aktive Conversation: leichter Gold-Gradient-Hintergrund

---

### ChatHeader.tsx

```
[Avatar]  Alex R.               [Suche] [Info] [···]
          Gold-Tier ✦ · Online
```

- Online-Dot: breathing `var(--status-success)`, 3s ease-in-out infinite
- Loyalty-Badge als kleiner Chip neben dem Namen
- Action-Icons rechts: auf Hover Gold-Glow

---

### MessageBubble.tsx

Zwei Varianten — eigene Nachrichten (rechts) und fremde (links):

**Eigene (rechts):**
- Hintergrund: `var(--surface-3)`
- Linker Border: `2px solid var(--gold-dark)`
- Gelesen-Status-Icon unten rechts: einfacher Haken (sent) → Doppelhaken weiß (delivered) → Doppelhaken gold (read)

**Fremde (links):**
- Hintergrund: `var(--surface-2)`
- Kein Border-Akzent
- Avatar klein links daneben (bei Gruppen)

**Gemeinsam:**
- Timestamp erscheint bei Hover
- Reaction-Pills darunter: `premium-chip`-Stil

---

### PPVMessageBubble.tsx

```
┌──────────────────────────────────────┐
│  [Blur-Thumbnail / Placeholder]      │
│  ████████████████                    │
│  6 Fotos  ·  14,99 €         [Kaufen]│
└──────────────────────────────────────┘
```

- `premium-card`-Wrapper mit Gold-Border
- Wenn `isPurchased: false`: Blur-Overlay über Preview (`filter: blur(16px)`), Lock-Icon in der Mitte
- Preis: `var(--gold)`, tabular-nums
- "Kaufen"-Button: Gold-Gradient, `scale(0.992)` Active
- Wenn `isPurchased: true`: kein Blur, grüner Checkmark-Badge oben rechts "Gekauft"
- Reveal-Animation nach Kauf: blur 16 → 0, 480ms

```typescript
// TODO: API-Call → POST /api/messages/:id/ppv/purchase
const handlePurchase = () => { /* Programmierer bindet hier an */ };
```

---

### TipMessageBubble.tsx

Spezielle System-Bubble für eingehende Trinkgelder:

```
        ✦  Alex R. hat 25,00 € Trinkgeld geschickt
           "Du bist die Beste 🔥"
```

- Zentriert im Chat
- Gold-Shimmer-Animation beim Einblenden (2.4s, wandernder Highlight)
- Betrag in `var(--gold)`, fett, tabular-nums

---

### TipButton.tsx + TipPanel.tsx

**TipButton:** Münz-Icon im Eingabebereich, bei Hover Gold-Glow, öffnet TipPanel.

**TipPanel** (Floating über Input):
```
┌─────────────────────────────┐
│  Trinkgeld senden           │
│  [1 €] [5 €] [10 €] [25 €] │
│  Eigener Betrag: [_____€]   │
│  Nachricht (optional): [__] │
│               [Senden ✦]   │
└─────────────────────────────┘
```
- `premium-card`, `reveal`-Animation beim Öffnen
- Schnellbeträge: Chips, bei Auswahl Gold-Border + Glow
- Senden-Button: Gold-Gradient

```typescript
// TODO: API-Call → POST /api/tips
const handleTipSend = (amount: number, message?: string) => { /* Programmierer bindet hier an */ };
```

---

### MessageInput.tsx

```
┌────────────────────────────────────────────────┐
│ [+Anhang] [PPV-Icon]  Schreibe...  [Tip✦] [→] │
└────────────────────────────────────────────────┘
```

- `premium-card`-Wrapper, backdrop-blur
- Textarea: auto-resize 1–6 Zeilen, `Enter` = Senden, `Shift+Enter` = Zeilenumbruch
- PPV-Icon: Kamera-Icon, öffnet PPVSendModal
- Tip-Button: öffnet TipPanel
- Senden-Button: nur aktiv wenn Input nicht leer, bei Hover Gold-Glow

---

### PPVSendModal.tsx

Modal um PPV-Inhalt zu konfigurieren und zu senden:

```
┌──────────────────────────────────┐
│  PPV-Inhalt senden               │
│  [Dateien hochladen / Vorschau]  │
│  Preis: [_____] €                │
│  [Foto] [Video] [Galerie]        │
│                  [Senden]        │
└──────────────────────────────────┘
```

- Overlay-Hintergrund: `hsl(0,0%,0%,0.7)`
- Modal selbst: `premium-card`, 480px max-width
- Datei-Dropzone: gestrichelte Gold-Border, Drag-over Highlight

```typescript
// TODO: API-Call → POST /api/messages + Datei-Upload zu Storage
const handlePPVSend = (files: File[], price: number) => { /* Programmierer bindet hier an */ };
```

---

### SubscriptionLockOverlay.tsx

Über gesperrten Posts/Inhalten:

```
┌──────────────────────────────────┐
│  [Blur-Content dahinter]         │
│  ┌──────────────────────────┐    │
│  │ 🔒  Exklusiver Inhalt    │    │
│  │  Ab 9,99 € / Monat       │    │
│  │  [Jetzt abonnieren ✦]    │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

```typescript
// TODO: API-Call → POST /api/subscriptions
const handleSubscribe = (tierId: string) => { /* Programmierer bindet hier an */ };
```

---

### EarningsDashboard.tsx

View "Einnahmen" — Creator-Übersicht:

```
┌──────────────────────────────────────────────────────┐
│  Einnahmen                            [Auszahlen ✦]  │
├────────────┬────────────┬────────────┬───────────────┤
│ Verfügbar  │ Ausstehend │ Diesen Mo. │ Abonnenten    │
│ 1.284,50 € │   320,00 € │ 4.820,00 € │ 342           │
├────────────┴────────────┴────────────┴───────────────┤
│  Transaktionen                                        │
│  [Abo] Alex R.          +20,53 €     09.05. 10:00    │
│  [Tip] Alex R.          +25,00 €     09.05. 14:28    │
│  [PPV] Marc T.          +14,99 €     08.05. 18:00    │
│  [Shop] Jonas K.        +39,00 €     07.05. 12:00    │
└──────────────────────────────────────────────────────┘
```

- KPI-Tiles: `premium-card`, Zahl in `--text-strong` + `clamp(1.75rem, 2vw+1rem, 2.5rem)`, Label in 10px uppercase `--text-subtle`
- Transaktionstyp-Badge: Chip-Stil, farblich je Typ (Abo=Gold, Tip=Gold, PPV=Gold-dim, Shop=muted)
- Auszahlen-Button: nur aktiv wenn `balance > 0`

```typescript
// TODO: API-Call → GET /api/me/wallet
// TODO: API-Call → GET /api/me/transactions
// TODO: API-Call → POST /api/me/withdraw
```

---

### CreatorProfile.tsx

View "Profil":

```
[Cover-Bild 16:4]
        [Avatar — goldener Ring] Sofia M. ✓
        342 Abonnenten · 48 Posts
        [Tab: Posts] [Tab: Shop] [Tab: Abos]
```

- Cover: Gradient-Placeholder in Gold-Tönen
- Avatar: runder Ring `2px solid var(--gold)` bei Verified
- Verified-Checkmark: Gold, Tooltip "Verifizierter Creator"
- Tab-Navigation: aktiver Tab mit Gold-Underline (scaleX 0.4→1, 320ms)

---

### PostCard.tsx

```
┌──────────────────────────┐
│  [Media-Preview 4:3]     │
│  Caption-Text            │
│  ♥ 142   💬 23          │
└──────────────────────────┘
```

Wenn `visibility !== "public"` und User nicht abonniert:
- Media komplett geblumt (`blur(16px)`)
- `SubscriptionLockOverlay` drüber

```typescript
// TODO: API-Call → POST /api/posts/:id/like
```

---

### ProductShop.tsx

Grid 2 Spalten, jede Produktkarte:

```
┌──────────────────────────┐
│  [Produkt-Bild]          │
│  Signiertes Polaroid     │
│  39,00 €    Noch 5 da    │
│           [Kaufen]       │
└──────────────────────────┘
```

- Ausverkauft: `opacity: 0.5`, Button disabled + "Ausverkauft"
- Kaufen-Button: Gold-Gradient

```typescript
// TODO: API-Call → POST /api/orders
```

---

### DiscoverFeed.tsx

View "Entdecken":

```
Top Creator der Woche 👑
[←  Lena V.  |  Mia K.  |  Sara J.  →]  (horizontal scroll)

Alle Creator
[Creator-Card] [Creator-Card] [Creator-Card]
[Creator-Card] [Creator-Card] [Creator-Card]
```

**CreatorCard.tsx:**
```
┌──────────────────────────┐
│  [Avatar groß]           │
│  Lena V.  ✓              │
│  Lifestyle               │
│  1.240 Abonnenten        │
│  Ab 19,99 € / Monat      │
│  [Abonnieren ✦]         │
└──────────────────────────┘
```

- `premium-card`, Hover-Lift
- #1 Creator: Gold-Crown-Icon, stärkerer Gold-Glow

---

### TypingIndicator.tsx

Drei Punkte, Gold, 1.2s Pulse, 150ms Stagger:

```
●  ●  ●
```

```css
@keyframes typingPulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50%       { opacity: 1;   transform: scale(1); }
}
```

---

## Wichtige UI-Regeln (Zusammenfassung für den Coder)

- Alle Zahlen/Beträge: `font-variant-numeric: tabular-nums`, Währung immer rechtsbündig
- Alle Container: `premium-card`-Klasse oder dessen CSS direkt
- Keine sichtbaren Scrollbars (`scrollbar-width: none` überall)
- Keine harten `#000` oder `#fff` — immer CSS-Variablen
- Alle Animationen: `cubic-bezier(0.16, 1, 0.3, 1)` als Easing
- `prefers-reduced-motion` respektieren — alle Animationen dort deaktivieren
- Mobile: `100dvh`, Safe-Area-Insets (`env(safe-area-inset-*)`)
- Kein Emoji in der UI außer als Nutzercontent

---

## Was der Programmierer macht

Alle Stellen mit `// TODO: API-Call →` sind die Anbindungspunkte. Sonst nichts anfassen — Design und Komponenten-Struktur bleiben. Mock-Daten in `mockData.ts` werden 1:1 durch echte API-Responses ersetzt.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5a7fd765-21c3-4676-b929-65b2e62ced17).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
