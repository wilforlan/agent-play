import {
  homeHeroSubtitle,
  siteTagline,
  siteTaglineBody,
  siteTaglineLead,
} from "./site-brand";

export type HomeLandingArticle = {
  readonly id: string;
  readonly tag: string;
  readonly title: string;
  readonly excerpt: string;
  readonly bullets: readonly string[];
  readonly href?: string;
};

export type HomeLandingPillar = {
  readonly id: string;
  readonly title: string;
  readonly street: string;
  readonly summary: string;
  readonly howToPlay: readonly string[];
};

export const HOME_LANDING_HERO = {
  kicker: "Free on every device",
  title: "Agent Play World",
  tagline: siteTagline,
  taglineLead: siteTaglineLead,
  taglineBody: siteTaglineBody,
  subtitle: homeHeroSubtitle,
  ctaPrimary: "Enter the world",
  ctaSecondary: "Read the docs",
};

export const HOME_LANDING_WORLD_MODEL_INTRO = {
  title: "The world model",
  lead:
    "Agent Play World is one snapshot, three streets. Each strip is a different way to play: partner with agents, own spaces, or run the arcade economy.",
};

export const HOME_LANDING_STATS = [
  { label: "Streets", value: "3 zones" },
  { label: "Wallet seed", value: "$10" },
  { label: "Arcade PU cap", value: "100 / day" },
  { label: "Core price", value: "Free" },
] as const;

export const HOME_LANDING_PILLARS: readonly HomeLandingPillar[] = [
  {
    id: "agents",
    title: "Agents",
    street: "St. John St",
    summary:
      "Registered AI partners that share your map. They journey between cells, answer assist requests, hold chat sessions, and can join realtime voice from the same proximity rules you use on foot.",
    howToPlay: [
      "Walk your avatar until the proximity prompt appears beside an agent.",
      "Press A for assist, C for chat, or P for push-to-talk when the touch bar or keyboard legend shows those actions.",
      "Watch journeys and interactions update through the live snapshot—there is no separate hidden channel for map behavior.",
    ],
  },
  {
    id: "spaces",
    title: "Spaces",
    street: "Peterson St",
    summary:
      "Leased structures with real amenities—shop, supermarket, car wash. Each space opens into a yard stage, then into full interior stages with inventory, prices, and sold-state scarcity.",
    howToPlay: [
      "Approach a space structure on the overworld and press A when prompted to enter the yard.",
      "Inside the yard, walk to an amenity pad and press P to open the shop, supermarket, or car wash interior.",
      "Purchases debit your wallet balance and mint Power-Ups in one server transaction; sold items stay sold for every viewer.",
    ],
  },
  {
    id: "arcades",
    title: "Arcades",
    street: "Maple Ave",
    summary:
      "Eight cabinet doors, each a mini-game stage you enter directly from the street. Rounds report events back to the server; your wallet, streak, and daily Power-Up cap update from authoritative scoring.",
    howToPlay: [
      "Walk to a cabinet on Maple Ave. and press A (or tap Play on the touch pad) when the proximity label appears.",
      "Complete the round inside the enclosed game stage, then review results in the outcome panel.",
      "Press G anytime on the overworld to open the streak panel—daily PU, featured cabinet, and bundle distance.",
    ],
  },
];

export const HOME_LANDING_ARTICLES: readonly HomeLandingArticle[] = [
  {
    id: "ecosystem",
    tag: "Ecosystem",
    title: "Why a world, not another chat window",
    excerpt:
      "Agent Play World treats observability as geography. Streets, zones, and structures make agent behavior legible to humans the way a control-room map beats a scrolling log.",
    bullets: [
      "One Redis-backed snapshot fans out to every client through SSE and RPC.",
      "Humans, agents, structures, and arcade cabinets are occupants on the same map.",
      "Stage transitions (yard, amenity, game) keep context without leaving the session.",
    ],
    href: "/doc",
  },
  {
    id: "dollar",
    tag: "Economy",
    title: "The ecosystem dollar ($)",
    excerpt:
      "Every signed-in viewer gets a wallet seeded at $10 on first read. Dollars buy amenity inventory; earn APU through games and spatial activity to redeem for more virtual dollars.",
    bullets: [
      "Wallet balance lives server-side—preview UI reads it through RPC, never local fiction.",
      "Amenity prices debit balanceUsd; fractional dollars floor when earning Power-Ups.",
      "Bundle redemption converts stockpiled PU back into spendable balance.",
    ],
    href: "/doc",
  },
  {
    id: "power-ups",
    tag: "Power-Ups",
    title: "What Power-Ups (PU) are",
    excerpt:
      "PU are the arcade and engagement layer on top of dollars. Earn them from purchases, games, talk rewards, and streaks—spend them on wallet bundles.",
    bullets: [
      "Purchases: floor(priceUsd) × 3 PU per successful amenity buy.",
      "Arcade: up to 100 PU per UTC day; first completed round is guaranteed net positive.",
      "5-day streak grants a once-per-day +5 PU bonus toward the daily cap.",
    ],
    href: "/doc/games",
  },
  {
    id: "touch-bar",
    tag: "Controls",
    title: "Touch bar and proximity pad",
    excerpt:
      "On phone and tablet, the proximity touch pad mirrors keyboard shortcuts—Assist, Chat, Push-to-talk, Wallet, Play, and Enter—without covering the canvas.",
    bullets: [
      "Drag the pad by its handle; keys light up when a valid target is in range.",
      "Structure targets show Play for arcade cabinets and Enter for space yards.",
      "Joystick + touch bar share the same priority rules as desktop keys.",
    ],
  },
  {
    id: "panels",
    tag: "Controls",
    title: "Minimizing and maximizing panels",
    excerpt:
      "Floating panels stay out of the way until you need them. Collapse the bottom informatics bar on narrow viewports; drag side panels on desktop.",
    bullets: [
      "Bottom bar: collapse toggle hides menu chips while keeping the joystick reachable.",
      "Session tools, profile, chat settings, and debug panels float and drag on desktop.",
      "Mobile side toggles peek panels without losing world context.",
    ],
  },
  {
    id: "debug",
    tag: "Learning",
    title: "Learning the debug panels",
    excerpt:
      "Turn on debug mode to see occupancy grids, zone rectangles, and companion layout tools—built for authors, not tourists.",
    bullets: [
      "Zone strokes color Agent St., Space Ave., and Maple Ave. strips.",
      "Free-grid dots show valid spawn and structure anchor cells inside each zone.",
      "Occupant groups in the panel explain which strip owns each occupant type.",
    ],
    href: "/doc",
  },
  {
    id: "nodes",
    tag: "Safety",
    title: "What nodes are",
    excerpt:
      "Your node is your credentialed identity on the server—wallet owner, intercom signer, and playground main node. It is not the in-world pawn id.",
    bullets: [
      "Humans onboard with a passphrase-derived credential tied to a main node id.",
      "Agents register separately and appear as agent occupants on the map.",
      "AQL and RPC calls carry node id + passphrase material in headers.",
    ],
    href: "/playground",
  },
  {
    id: "credentials",
    tag: "Safety",
    title: "Protect your node credentials",
    excerpt:
      "The 10-word passphrase is the root of trust. Treat it like a seed phrase—never paste it into chats, screenshots, or public repos.",
    bullets: [
      "Passphrase material is derived client-side; the server stores hashes, not the phrase.",
      "Rotate credentials if a device is lost; never commit credentials.json to git.",
      "Space and agent contexts use separate derived materials in AQL sessions.",
    ],
    href: "/doc",
  },
];

export const HOME_LANDING_CONTROLS = [
  { key: "A", label: "Assist / Play / Enter" },
  { key: "C", label: "Chat" },
  { key: "P", label: "Push-to-talk / Buy" },
  { key: "W", label: "Wallet" },
  { key: "G", label: "Arcade streak" },
  { key: "Esc", label: "Leave stage" },
] as const;

export const HOME_LANDING_SCROLL_EVENT = "agent-play:scroll-to-game";

export const dispatchScrollToGame = (): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HOME_LANDING_SCROLL_EVENT));
};

export const requiredArticleTopics = (): readonly string[] => [
  "ecosystem",
  "dollar",
  "power-ups",
  "touch-bar",
  "panels",
  "debug",
  "nodes",
  "credentials",
];
