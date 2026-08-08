import sofiaImg from "@/assets/model-sofia.jpg";
import lenaImg from "@/assets/model-lena.jpg";
import miaImg from "@/assets/model-mia.jpg";
import ninaImg from "@/assets/model-nina.jpg";
import emmaImg from "@/assets/model-emma.jpg";
import hannahImg from "@/assets/model-hannah.jpg";

// TODO: API-Call → GET /api/me
export const mockCurrentUser = {
  id: "user-001",
  displayName: "Marie K.",
  avatarUrl: null as string | null,
  role: "chatter" as const,
  walletBalance: 128450,
};

export type OnlineStatus = "online" | "away" | "offline";

// === Profile / Model accounts the chatter is assigned to ===
// TODO: API-Call → GET /api/me/assigned-profiles
export interface ModelProfile {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string;
  subscribers: number;
  unread: number;        // open conversations to read
  isFlex?: boolean;      // accounts in the Flex-Pool aren't fixed
}

export const mockProfiles: ModelProfile[] = [
  { id: "prof-sofia", displayName: "Sofia M.",   handle: "@sofiam",  avatarUrl: sofiaImg, subscribers: 342,  unread: 4 },
  { id: "prof-lena",  displayName: "Lena V.",    handle: "@lenav",   avatarUrl: lenaImg,  subscribers: 1240, unread: 1 },
  { id: "prof-mia",   displayName: "Mia K.",     handle: "@miak",    avatarUrl: miaImg,   subscribers: 890,  unread: 0 },
];

// Profiles currently floating in the Flex-Pool (open shifts).
// HARD RULE: Only profiles the chatter has NEVER worked on before.
// → must not contain any id present in mockProfiles.
// TODO: API-Call → GET /api/flex-pool/profiles?excludeAssignedTo=me
const _assignedIds = new Set(mockProfiles.map(p => p.id));
export const mockFlexProfiles: ModelProfile[] = ([
  { id: "prof-nina",   displayName: "Nina W.",   handle: "@ninaw",   avatarUrl: ninaImg,   subscribers: 540, unread: 7,  isFlex: true },
  { id: "prof-emma",   displayName: "Emma L.",   handle: "@emmal",   avatarUrl: emmaImg,   subscribers: 780, unread: 12, isFlex: true },
  { id: "prof-hannah", displayName: "Hannah R.", handle: "@hannahr", avatarUrl: hannahImg, subscribers: 410, unread: 3,  isFlex: true },
] as ModelProfile[]).filter(p => !_assignedIds.has(p.id));

export interface Conversation {
  id: string;
  profileId: string;     // which model profile this chat belongs to
  participant: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    status: OnlineStatus;
  };
  lastMessage: { content: string; createdAt: string; fromMe: boolean };
  unreadCount: number;
  tipVolume: number;
  totalSpent: number;
  /** Auto-Pilot: der Creator antwortet in diesem Chat vollautomatisch. */
  isAutopilot?: boolean;
}

export const AI_CONV_ID = "conv-ai-mia";
export const AI_FAN_ID = "fan-ai-mia";

// TODO: API-Call → GET /api/conversations?profileId=...
export const mockConversations: Conversation[] = [
  // --- AI DEMO (always pinned to top) ---
  { id: AI_CONV_ID, profileId: "prof-sofia",
    participant: { id: AI_FAN_ID, displayName: "Mia · AI", avatarUrl: null, status: "online" },
    lastMessage: { content: "Hey 👋 schreib mir was, ich antworte live ✨", createdAt: new Date().toISOString(), fromMe: false },
    unreadCount: 1, tipVolume: 0, totalSpent: 0 },
  // --- Sofia M. ---
  { id: "conv-001", profileId: "prof-sofia",
    participant: { id: "fan-001", displayName: "Alex R.", avatarUrl: null, status: "online" },
    lastMessage: { content: "Kannst du mir noch eins schicken? 🔥", createdAt: "2026-05-09T14:32:00Z", fromMe: false },
    unreadCount: 3, tipVolume: 12500, totalSpent: 84200 },
  { id: "conv-002", profileId: "prof-sofia",
    participant: { id: "fan-002", displayName: "Marc T.", avatarUrl: null, status: "away" },
    lastMessage: { content: "Danke ❤️", createdAt: "2026-05-09T13:10:00Z", fromMe: false },
    unreadCount: 0, tipVolume: 4500, totalSpent: 41900 },
  { id: "conv-003", profileId: "prof-sofia",
    participant: { id: "fan-003", displayName: "Jonas K.", avatarUrl: null, status: "offline" },
    lastMessage: { content: "Wann ist das nächste Abo fällig?", createdAt: "2026-05-09T11:00:00Z", fromMe: false },
    unreadCount: 1, tipVolume: 0, totalSpent: 9900 },
  { id: "conv-004", profileId: "prof-sofia",
    participant: { id: "fan-004", displayName: "Tobias B.", avatarUrl: null, status: "online" },
    lastMessage: { content: "Tolles neues Set!", createdAt: "2026-05-09T09:00:00Z", fromMe: true },
    unreadCount: 0, tipVolume: 1500, totalSpent: 18400 },

  // --- Lena V. ---
  { id: "conv-101", profileId: "prof-lena",
    participant: { id: "fan-101", displayName: "Daniel S.", avatarUrl: null, status: "online" },
    lastMessage: { content: "Wann gibts neue Inhalte?", createdAt: "2026-05-09T13:50:00Z", fromMe: false },
    unreadCount: 1, tipVolume: 8000, totalSpent: 56300 },
  { id: "conv-102", profileId: "prof-lena",
    participant: { id: "fan-102", displayName: "Felix M.", avatarUrl: null, status: "offline" },
    lastMessage: { content: "Hab dir grad ein Tip geschickt 💸", createdAt: "2026-05-09T12:20:00Z", fromMe: false },
    unreadCount: 0, tipVolume: 5000, totalSpent: 27500 },

  // --- Mia K. ---
  { id: "conv-201", profileId: "prof-mia",
    participant: { id: "fan-201", displayName: "Patrick V.", avatarUrl: null, status: "online" },
    lastMessage: { content: "Du bist mein Favorit ✨", createdAt: "2026-05-09T10:10:00Z", fromMe: true },
    unreadCount: 0, tipVolume: 3500, totalSpent: 32100 },
];

// Conversations from Flex-Pool profiles (chatter can pick these up ad-hoc)
// TODO: API-Call → GET /api/flex-pool/conversations
export const mockFlexConversations: Conversation[] = [
  { id: "flex-001", profileId: "prof-nina",
    participant: { id: "fan-301", displayName: "Kevin P.", avatarUrl: null, status: "online" },
    lastMessage: { content: "Hallo, bist du noch da?", createdAt: "2026-05-09T14:36:00Z", fromMe: false },
    unreadCount: 4, tipVolume: 0, totalSpent: 12300 },
  { id: "flex-002", profileId: "prof-emma",
    participant: { id: "fan-302", displayName: "Robin H.", avatarUrl: null, status: "online" },
    lastMessage: { content: "Wow, danke für die Antwort 🙌", createdAt: "2026-05-09T14:31:00Z", fromMe: false },
    unreadCount: 2, tipVolume: 1500, totalSpent: 24800 },
  { id: "flex-003", profileId: "prof-emma",
    participant: { id: "fan-303", displayName: "Lars D.", avatarUrl: null, status: "away" },
    lastMessage: { content: "Schick mir was Süßes 😘", createdAt: "2026-05-09T14:10:00Z", fromMe: false },
    unreadCount: 1, tipVolume: 500, totalSpent: 6900 },
  { id: "flex-004", profileId: "prof-hannah",
    participant: { id: "fan-304", displayName: "Tim B.", avatarUrl: null, status: "offline" },
    lastMessage: { content: "Magst du chatten?", createdAt: "2026-05-09T13:42:00Z", fromMe: false },
    unreadCount: 1, tipVolume: 0, totalSpent: 0 },
  { id: "flex-005", profileId: "prof-nina",
    participant: { id: "fan-305", displayName: "Joris K.", avatarUrl: null, status: "online" },
    lastMessage: { content: "Bekomme ich noch ein Foto?", createdAt: "2026-05-09T13:15:00Z", fromMe: false },
    unreadCount: 1, tipVolume: 2000, totalSpent: 31200 },
];

export type MessageStatus = "sent" | "delivered" | "read";
export type ContentType = "text" | "ppv" | "tip";

export interface Message {
  id: string;
  senderId: string;
  contentType: ContentType;
  content?: string;
  ppv?: { price: number; currency: string; mediaType: "photo" | "video"; mediaCount: number; previewUrl: string | null; isPurchased: boolean; caption?: string };
  tip?: { amount: number; currency: string; message: string };
  createdAt: string;
  status: MessageStatus;
}

// TODO: API-Call → GET /api/conversations/:id
export const mockMessages: Message[] = [
  { id: "msg-001", senderId: "fan-001", contentType: "text", content: "Hey, hast du heute noch was geplant? 👀", createdAt: "2026-05-09T14:20:00Z", status: "read" },
  { id: "msg-002", senderId: "user-001", contentType: "text", content: "Ja, kommt gleich was Neues 😉", createdAt: "2026-05-09T14:21:00Z", status: "read" },
  { id: "msg-003", senderId: "user-001", contentType: "ppv", ppv: { price: 1499, currency: "EUR", mediaType: "photo", mediaCount: 6, previewUrl: null, isPurchased: false }, createdAt: "2026-05-09T14:25:00Z", status: "delivered" },
  { id: "msg-004", senderId: "fan-001", contentType: "tip", tip: { amount: 2500, currency: "EUR", message: "Du bist die Beste 🔥" }, createdAt: "2026-05-09T14:28:00Z", status: "read" },
  { id: "msg-005", senderId: "user-001", contentType: "ppv", ppv: { price: 999, currency: "EUR", mediaType: "video", mediaCount: 1, previewUrl: null, isPurchased: true }, createdAt: "2026-05-09T14:30:00Z", status: "read" },
  { id: "msg-006", senderId: "fan-001", contentType: "text", content: "Kannst du mir noch eins schicken? 🔥", createdAt: "2026-05-09T14:32:00Z", status: "delivered" },
];

// TODO: API-Call → GET /api/me/wallet + GET /api/me/transactions
export const mockEarnings = {
  balance: 128450,
  pendingBalance: 32000,
  monthlyTotal: 482000,
  allTimeTotal: 2845000,
  transactions: [
    { id: "tx-001", type: "subscription" as const, amount: 2053, description: "Abo — Alex R.", createdAt: "2026-05-09T10:00:00Z" },
    { id: "tx-002", type: "tip" as const, amount: 2500, description: "Trinkgeld — Alex R.", createdAt: "2026-05-09T14:28:00Z" },
    { id: "tx-003", type: "ppv" as const, amount: 1499, description: "PPV-Kauf — Marc T.", createdAt: "2026-05-08T18:00:00Z" },
    { id: "tx-004", type: "product" as const, amount: 3900, description: "Produkt — Jonas K.", createdAt: "2026-05-07T12:00:00Z" },
  ],
};

// TODO: API-Call → GET /api/creators/:id/products
export const mockProducts = [
  { id: "prod-001", title: "Signiertes Polaroid", price: 3900, currency: "EUR", stock: 5, category: "signed", isAvailable: true },
  { id: "prod-002", title: "Fan-Box Mai", price: 4900, currency: "EUR", stock: 2, category: "fanbox", isAvailable: true },
  { id: "prod-003", title: "Limitiertes Set", price: 6900, currency: "EUR", stock: 0, category: "merchandise", isAvailable: false },
  { id: "prod-004", title: "Custom Video", price: 9900, currency: "EUR", stock: 3, category: "custom", isAvailable: true },
];

// TODO: API-Call → GET /api/discover/trending
export const mockTopCreators = [
  { id: "creator-001", displayName: "Lena V.", subscriberCount: 1240, price: 1999, category: "Lifestyle", verified: true },
  { id: "creator-002", displayName: "Mia K.", subscriberCount: 890, price: 1499, category: "Fitness", verified: true },
  { id: "creator-003", displayName: "Sara J.", subscriberCount: 2100, price: 2499, category: "Fashion", verified: true },
  { id: "creator-004", displayName: "Nina W.", subscriberCount: 540, price: 1299, category: "Travel", verified: false },
  { id: "creator-005", displayName: "Emma L.", subscriberCount: 780, price: 1799, category: "Beauty", verified: true },
  { id: "creator-006", displayName: "Hannah R.", subscriberCount: 410, price: 999, category: "Art", verified: false },
];

// TODO: API-Call → GET /api/posts
export const mockPosts = [
  { id: "post-001", caption: "Sonntagsstimmung ✨", visibility: "public", likes: 142, comments: 23, mediaType: "photo" },
  { id: "post-002", caption: "Behind the scenes...", visibility: "subscriber", likes: 89, comments: 12, mediaType: "video" },
  { id: "post-003", caption: "Neues Shooting 🔥", visibility: "subscriber", likes: 234, comments: 41, mediaType: "photo" },
  { id: "post-004", caption: "Coffee morning", visibility: "public", likes: 67, comments: 8, mediaType: "photo" },
];

export const formatCurrency = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);

export const formatRelativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `vor ${hr} Std`;
  const d = Math.floor(hr / 24);
  return `vor ${d} Tg`;
};

// Deterministic color from id
export const colorFromId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h}, 35%, 30%)`;
};
