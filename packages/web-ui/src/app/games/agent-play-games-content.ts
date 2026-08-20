import { z } from "zod";

import {
  DAILY_GAME_PU_CAP,
  DEFAULT_PLAYER_WALLET_BALANCE_USD,
  GAME_CABINET_CATALOG,
  GameEventSchema,
  STREAK_BONUS_PU,
  STREAK_BONUS_THRESHOLD_DAYS,
  TALK_AGENT_PU_BILLED_SECONDS_PER_UNIT,
  TALK_AGENT_PU_MAX_PER_LEG,
  WALLET_BUNDLE_OFFERS,
} from "@agent-play/sdk";

export type AgentPlayGamesNavItem = {
  readonly href: string;
  readonly label: string;
};

const GameIdSchema = z.enum([
  "hidden-gems",
  "map-recall",
  "price-check",
  "signal-hunt",
  "delivery-dash",
  "lease-locker",
  "talk-timer",
  "daily-rotator",
]);

export type AgentPlayGamePuRate = {
  readonly label: string;
  readonly pu: number;
  readonly event: z.infer<typeof GameEventSchema>;
};

export type AgentPlayGamePage = {
  readonly gameId: z.infer<typeof GameIdSchema>;
  readonly slug: z.infer<typeof GameIdSchema>;
  readonly title: string;
  readonly cabinetName: string;
  readonly kicker: string;
  readonly lead: string;
  readonly seoDescription: string;
  readonly playLoop: readonly string[];
  readonly worldAdvantage: readonly string[];
  readonly puRates: readonly AgentPlayGamePuRate[];
};

export type AgentPlayGamesEarningRate = {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
};

export type AgentPlayGamesBundle = {
  readonly id: string;
  readonly apuCost: number;
  readonly creditUsd: number;
};

export type AgentPlayGamesFaqItem = {
  readonly question: string;
  readonly answer: string;
};

const AgentPlayGamePuRateSchema = z.object({
  label: z.string().min(1),
  pu: z.number().int(),
  event: z.unknown(),
});

const AgentPlayGamePageSchema = z.object({
  gameId: GameIdSchema,
  slug: GameIdSchema,
  title: z.string().min(1),
  cabinetName: z.string().min(1),
  kicker: z.string().min(1),
  lead: z.string().min(20),
  seoDescription: z.string().min(110).max(160),
  playLoop: z.array(z.string().min(1)).min(3),
  worldAdvantage: z.array(z.string().min(1)).min(2),
  puRates: z.array(AgentPlayGamePuRateSchema),
});

const AgentPlayGamesBundleSchema = z.object({
  id: z.string().min(1),
  apuCost: z.number().int().positive(),
  creditUsd: z.number().positive(),
});

const AgentPlayGamesEarningRateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(20),
});

const AgentPlayGamesFaqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(40),
});

export const amenityPurchaseApu = (priceUsd: number): number => {
  return Math.floor(priceUsd) * 3;
};

export const formatSignedApu = (pu: number): string => {
  if (pu > 0) return `+${String(pu)} APU`;
  if (pu < 0) return `${String(pu)} APU`;
  return "0 APU";
};

export const AGENT_PLAY_GAMES_HERO = {
  kicker: "Maple Ave Arcade",
  title: "Agent Play Games",
  subtitle:
    "Eight cabinets on Maple Ave. teach the live map, pay Agent Play Units, and turn arcade skill into spendable Agent Play World dollars.",
  seoTitle: "Agent Play Games — Maple Ave Arcade and World Units",
  seoDescription:
    "Play every Maple Ave arcade cabinet in Agent Play World. Learn scoring, APU earning rates, APW$ wallets, and how arcade wins fund amenities.",
  liveWorldHref: "/",
  unitsHref: "/games/units",
  docsHref: "/doc/games",
} as const;

export const AGENT_PLAY_GAMES_NAV: readonly AgentPlayGamesNavItem[] = [
  { href: "/games", label: "Arcade" },
  { href: "/games/units", label: "World Units" },
  { href: "/", label: "Enter World" },
  { href: "/doc/games", label: "Arcade Specs" },
];

const gamePage = (
  page: Omit<AgentPlayGamePage, "slug"> & { slug?: AgentPlayGamePage["slug"] },
): AgentPlayGamePage => {
  const parsed = AgentPlayGamePageSchema.parse({
    ...page,
    slug: page.slug ?? page.gameId,
  });
  return {
    ...parsed,
    puRates: parsed.puRates.map((rate) => ({
      label: rate.label,
      pu: rate.pu,
      event: GameEventSchema.parse(rate.event),
    })),
  };
};

export const AGENT_PLAY_GAMES_PAGES: readonly AgentPlayGamePage[] = [
  gamePage({
    gameId: "hidden-gems",
    title: "Hidden Gems",
    cabinetName: "Gem Chest",
    kicker: "Gem Chest",
    lead:
      "Six chests in a row. Open them left to right. The first visit is a tutorial; later visits pay more for correct picks and fine misses.",
    seoDescription:
      "Hidden Gems is the Gem Chest cabinet on Maple Ave. Open six chests in order, earn APU on correct picks, and learn the arcade scoring loop.",
    playLoop: [
      "Walk to Gem Chest on Maple Ave. and press A (or Play on the touch pad) when the cabinet is in range.",
      "Inside the stage, open the six chests from left to right. Correct picks light the gem; misses still advance the row.",
      "Tutorial chests never subtract APU. After that, wrong opens cost APU and correct opens pay more.",
      "Walk to the exit door or press Esc to return to Maple Ave. Review net APU on the result panel.",
    ],
    worldAdvantage: [
      "Hidden Gems is the fastest way to learn that the server scores events, not a number you type in.",
      "A clean six-chest run stocks APU you can later redeem for APW$ and spend in shop, supermarket, or car wash interiors.",
      "The first completed arcade round of a new wallet is guaranteed at least +5 net APU, even if the raw chest math is lower.",
    ],
    puRates: [
      {
        label: "Correct chest (tutorial)",
        pu: 5,
        event: { type: "chest_open", correct: true, tutorial: true },
      },
      {
        label: "Wrong chest (tutorial)",
        pu: 0,
        event: { type: "chest_open", correct: false, tutorial: true },
      },
      {
        label: "Correct chest",
        pu: 8,
        event: { type: "chest_open", correct: true },
      },
      {
        label: "Wrong chest",
        pu: -2,
        event: { type: "chest_open", correct: false },
      },
    ],
  }),
  gamePage({
    gameId: "map-recall",
    title: "Map Recall",
    cabinetName: "Map Room",
    kicker: "Map Room",
    lead:
      "Watch a three-step structure sequence, then tap the matching buttons in order. Perfect recall pays every step; a miss still leaves a small remainder.",
    seoDescription:
      "Map Recall is the Map Room cabinet. Repeat live structure names in order to earn APU and memorize Agent Play World landmarks.",
    playLoop: [
      "Enter Map Room from Maple Ave. with A when the Play prompt appears.",
      "Watch the structure sequence. Names come from the live snapshot when the world has structures to show.",
      "Tap the three buttons in the same order. Each correct step pays APU; a wrong step costs APU after the tutorial.",
      "Use the joystick to reach the exit door when the round is done.",
    ],
    worldAdvantage: [
      "Map Recall drills the same structure labels you will see on Peterson St. and in proximity prompts.",
      "Players who know the map spend less time hunting cabinets, yards, and agents, so more of the UTC day stays under the 100 APU arcade cap.",
      "A perfect three-step run is +12 APU after the tutorial (three correct steps at +4). One miss is still net positive if the other steps land.",
    ],
    puRates: [
      {
        label: "Correct step (tutorial)",
        pu: 4,
        event: { type: "sequence_step", correct: true, tutorial: true },
      },
      {
        label: "Wrong step (tutorial)",
        pu: 0,
        event: { type: "sequence_step", correct: false, tutorial: true },
      },
      {
        label: "Correct step",
        pu: 4,
        event: { type: "sequence_step", correct: true },
      },
      {
        label: "Wrong step",
        pu: -2,
        event: { type: "sequence_step", correct: false },
      },
    ],
  }),
  gamePage({
    gameId: "price-check",
    title: "Price Check",
    cabinetName: "Price Tag",
    kicker: "Price Tag",
    lead:
      "Three higher-or-lower rounds against amenity catalog prices. Round one is a free miss; later misses chip APU.",
    seoDescription:
      "Price Check is the Price Tag cabinet. Guess higher or lower on live amenity prices to earn APU and learn what world goods cost.",
    playLoop: [
      "Enter Price Tag and read the current item price from the catalog the world already uses in shops.",
      "Guess whether the next item costs higher or lower. You get three rounds per visit.",
      "A wrong guess on round one pays 0 APU. Later wrong guesses cost −1; every correct guess pays +4.",
      "Leave through the exit door when the three rounds finish.",
    ],
    worldAdvantage: [
      "Price Check is practice for amenity interiors, where APW$ actually leaves your wallet.",
      "Knowing typical catalog bands keeps you from spending a $10 seed on the first shelf item you see.",
      "A perfect visit is +12 APU (three correct guesses). That is 8% of the daily arcade cap in one cabinet stop.",
    ],
    puRates: [
      {
        label: "Correct guess",
        pu: 4,
        event: { type: "price_guess", correct: true, round: 1 },
      },
      {
        label: "Wrong guess (round 1)",
        pu: 0,
        event: { type: "price_guess", correct: false, round: 1 },
      },
      {
        label: "Wrong guess (later rounds)",
        pu: -1,
        event: { type: "price_guess", correct: false, round: 2 },
      },
    ],
  }),
  gamePage({
    gameId: "signal-hunt",
    title: "Signal Hunt",
    cabinetName: "Signal Tower",
    kicker: "Signal Tower",
    lead:
      "Read the callout, then pick the matching structure label from four choices. Correct picks pay well; misses sting.",
    seoDescription:
      "Signal Hunt is the Signal Tower cabinet. Match live structure callouts to earn APU and read Agent Play World occupancy faster.",
    playLoop: [
      "Enter Signal Tower from Maple Ave. when the cabinet is in proximity range.",
      "Read the callout, then pick the matching structure label from the four choices on stage.",
      "Correct picks pay +8 APU. Wrong picks cost −3 APU.",
      "Walk to the exit door to return to Maple Ave.",
    ],
    worldAdvantage: [
      "Signal Hunt trains the same occupancy reading you need when several agents, spaces, and cabinets share a street.",
      "High payout per correct pick makes it a strong featured-day cabinet when you still have cap remaining.",
      "Wrong picks are expensive. Walk the overworld first so the labels already feel familiar.",
    ],
    puRates: [
      {
        label: "Correct pick",
        pu: 8,
        event: { type: "signal_pick", correct: true },
      },
      {
        label: "Wrong pick",
        pu: -3,
        event: { type: "signal_pick", correct: false },
      },
    ],
  }),
  gamePage({
    gameId: "delivery-dash",
    title: "Delivery Dash",
    cabinetName: "Courier Lane",
    kicker: "Courier Lane",
    lead:
      "Move a courier across a grid to the green goal. Fewer moves and fewer wall hits earn more APU.",
    seoDescription:
      "Delivery Dash is the Courier Lane cabinet. Route a courier across the grid, bank APU for clean runs, and practice world movement.",
    playLoop: [
      "Enter Courier Lane and use arrow keys to move the courier from start to the green goal.",
      "Fast finishes (eight moves or fewer) pay +15 APU. OK finishes (fourteen or fewer) pay +8. Slow finishes pay +3.",
      "Each obstacle hit subtracts 2 APU from that finish band.",
      "Your avatar can still roam the stage with the joystick so you can reach the exit door after the run.",
    ],
    worldAdvantage: [
      "Delivery Dash is movement practice for the same joystick and arrow keys you use on Agent St., Peterson St., and Maple Ave.",
      "A clean fast run is the highest single arcade event in the catalog (+15), so it is the best way to close a daily cap.",
      "Hits are avoidable. Treat walls like overworld structures: path around them instead of charging the prompt.",
    ],
    puRates: [
      {
        label: "Fast finish, no hits",
        pu: 15,
        event: { type: "delivery_finish", band: "fast", hits: 0 },
      },
      {
        label: "OK finish, no hits",
        pu: 8,
        event: { type: "delivery_finish", band: "ok", hits: 0 },
      },
      {
        label: "Slow finish, no hits",
        pu: 3,
        event: { type: "delivery_finish", band: "slow", hits: 0 },
      },
      {
        label: "Fast finish with one hit",
        pu: 13,
        event: { type: "delivery_finish", band: "fast", hits: 1 },
      },
    ],
  }),
  gamePage({
    gameId: "lease-locker",
    title: "Lease Locker",
    cabinetName: "Locker Hall",
    kicker: "Locker Hall",
    lead:
      "Read the riddle and pick the amenity door that matches. No yard entry required — just the labels you will see on space pads.",
    seoDescription:
      "Lease Locker is the Locker Hall cabinet. Match amenity riddles to doors, earn APU, and learn shop, supermarket, and car wash labels.",
    playLoop: [
      "Enter Locker Hall from Maple Ave. with A when Play is shown.",
      "Read the riddle and pick one of the three amenity doors.",
      "Correct doors pay +6 APU. Wrong doors cost −4 APU.",
      "Walk to the exit door when the pick is resolved.",
    ],
    worldAdvantage: [
      "Lease Locker is a dry run for space yards, where P enters shop, supermarket, or car wash interiors that debit APW$.",
      "Getting the amenity names right in the arcade means fewer wasted walks once you are spending real wallet dollars.",
      "Wrong doors are the steepest flat miss in the catalog. If you are unsure, inspect a real yard on Peterson St. first.",
    ],
    puRates: [
      {
        label: "Correct door",
        pu: 6,
        event: { type: "door_pick", correct: true },
      },
      {
        label: "Wrong door",
        pu: -4,
        event: { type: "door_pick", correct: false },
      },
    ],
  }),
  gamePage({
    gameId: "talk-timer",
    title: "Talk Timer",
    cabinetName: "Comms Booth",
    kicker: "Comms Booth",
    lead:
      "Hold Space or the transmit control and release inside the green window. Three rounds, shrinking targets, no talk billing.",
    seoDescription:
      "Talk Timer is the Comms Booth cabinet. Land the needle in the green zone to earn APU and rehearse push-to-talk without talk fees.",
    playLoop: [
      "Enter Comms Booth from Maple Ave. when the cabinet is in range.",
      "Hold Space or the on-screen transmit control to move the needle. Release inside the green window.",
      "You get three rounds. Windows shrink. Success pays +5 APU; a miss costs −2 APU.",
      "Walk to the exit door when the run is complete. This cabinet does not bill talk time.",
    ],
    worldAdvantage: [
      "Talk Timer is rehearsal for P (push-to-talk) with nearby agents, where billed voice can mint APU and debit APW$.",
      "A perfect three-round visit is +15 APU with zero talk cost — useful before you open a real agent conversation.",
      "Nearby members still outrank cabinets on the overworld. Finish or skip the booth if an agent is in range and you came to talk.",
    ],
    puRates: [
      {
        label: "Successful release",
        pu: 5,
        event: { type: "talk_release", success: true, round: 1 },
      },
      {
        label: "Missed window",
        pu: -2,
        event: { type: "talk_release", success: false, round: 1 },
      },
    ],
  }),
  gamePage({
    gameId: "daily-rotator",
    title: "Daily Rotator",
    cabinetName: "Featured",
    kicker: "Featured",
    lead:
      "The Featured cabinet glows on Maple Ave. and routes into today's title by UTC weekday. Same scoring as the destination game.",
    seoDescription:
      "The Featured cabinet on Maple Ave. rotates Agent Play Games by UTC weekday. Play today's title, then redeem APU into APW$ bundles.",
    playLoop: [
      "Find the glowing Featured cabinet on Maple Ave. The streak panel (G) also names today's title.",
      "Press A to enter. The door routes to the playable game for the current UTC weekday.",
      "Monday is Hidden Gems, then Map Recall, Price Check, Signal Hunt, Delivery Dash, Lease Locker, and Talk Timer on Sunday.",
      "Scoring is the destination game's event table. The server still applies the 100 APU UTC daily arcade cap and streak bonus.",
    ],
    worldAdvantage: [
      "The rotator is a daily appointment. Playing it is the simplest way to keep a 5-day streak alive for the +5 APU bonus.",
      "You do not need to memorize seven doors. Walk to Featured, play, then spend remaining cap on the title you are best at.",
      "Featured play still counts toward the same wallet.powerUps balance that bundle redemption reads.",
    ],
    puRates: [],
  }),
];

export const getAgentPlayGamePage = (
  slug: string,
): AgentPlayGamePage | undefined => {
  return AGENT_PLAY_GAMES_PAGES.find((page) => page.slug === slug);
};

export const listAgentPlayGameSlugs = (): readonly AgentPlayGamePage["slug"][] => {
  return GAME_CABINET_CATALOG.map((cabinet) => cabinet.gameId);
};

export const requiredAgentPlayGamesPaths = (): readonly string[] => {
  return [
    "/games",
    "/games/units",
    ...listAgentPlayGameSlugs().map((slug) => `/games/${slug}`),
  ];
};

export const AGENT_PLAY_GAMES_UNITS = {
  title: "Agent Play World units",
  kicker: "APW$ and APU",
  seoTitle: "Agent Play World Units — APW$ and APU",
  seoDescription:
    "How Agent Play World dollars (APW$) and Agent Play Units (APU) count, what earns them, daily arcade caps, and how to spend both.",
  lead:
    "The play world has two counters on every signed-in wallet: Agent Play World dollars (APW$) and Agent Play Units (APU, also called Power-Ups). Dollars buy amenities. Units are the engagement layer you earn from arcade, purchases, talk, streaks, and referrals — then redeem back into dollars.",
  apw: {
    name: "Agent Play World dollars",
    symbol: "APW$",
    field: "balanceUsd",
    seedUsd: DEFAULT_PLAYER_WALLET_BALANCE_USD,
    howCounted:
      "APW$ is a non-negative USD balance stored server-side as balanceUsd. The HUD formats it with grouping and two decimal places. Clients never invent this number.",
  },
  apu: {
    name: "Agent Play Units",
    symbol: "APU",
    field: "powerUps",
    dailyArcadeCap: DAILY_GAME_PU_CAP,
    streakBonus: STREAK_BONUS_PU,
    streakThresholdDays: STREAK_BONUS_THRESHOLD_DAYS,
    howCounted:
      "APU is a non-negative integer stored as wallet.powerUps. Displays floor fractional values. Arcade rounds send events; the server computes the delta, clamps it to the 100 APU UTC daily arcade cap, then may add a streak bonus.",
  },
  howTheyCount: [
    "Wallets are keyed by your signed-in node id, not the shared in-world pawn. Unsigned viewers cannot earn or spend.",
    "The first wallet read seeds APW$ at $10.00. APU starts at 0 unless a round, purchase, talk leg, or referral writes it.",
    "Arcade scoring is event-based. Hidden Gems sends chest_open, Map Recall sends sequence_step, and so on. The client never submits an APU amount.",
    "Positive arcade earnings stop at 100 APU per UTC day. Losses can still apply. Wallet APU never goes below 0.",
    "Amenity purchases, billed agent talk, and referral rewards mint APU on their own paths. They do not share the arcade daily cap.",
    "The streak panel (G) shows PU today, cap remaining, featured cabinet, and distance to the next $10 bundle.",
  ],
  howToSpend: [
    "Spend APW$ in amenity interiors (shop, supermarket, car wash) and other wallet-priced world actions. Prices debit balanceUsd in one server transaction.",
    "A successful amenity buy also mints floor(priceUsd) × 3 APU, so spending dollars can refill units.",
    "Spend APU on wallet bundles from the wallet panel (W). Bundles credit APW$ immediately and burn the listed APU cost.",
    "Larger bundles are more efficient: 150 APU → $10, 300 → $20, 500 → $50, 900 → $100. The $100 bundle costs 9 APU per dollar; the $10 bundle costs 15.",
    "Press W anytime on the overworld to open inventory, review APU, and redeem a bundle you can afford.",
  ],
  earningRates: [
    {
      id: "arcade",
      title: "Arcade cabinets",
      detail:
        "Up to 100 APU per UTC day from Maple Ave. rounds. Each title has its own event table. Featured routes to today's game; scoring is unchanged.",
    },
    {
      id: "first-round",
      title: "First completed round",
      detail:
        "The first arcade round a wallet ever finishes is raised to at least +5 net APU when the raw event math would pay less.",
    },
    {
      id: "streak",
      title: "Day streak",
      detail:
        "A 5-day arcade streak grants +5 APU once on the day you cross the threshold, still subject to the daily arcade cap.",
    },
    {
      id: "amenity",
      title: "Amenity purchases",
      detail:
        "Every successful amenity buy mints floor(priceUsd) × 3 APU. A $4.99 item yields 12 APU. This earn path does not use the arcade cap.",
    },
    {
      id: "talk",
      title: "Agent talk",
      detail: `Billed talk grants 1 APU per ${String(TALK_AGENT_PU_BILLED_SECONDS_PER_UNIT)} whole billed seconds, capped at ${String(TALK_AGENT_PU_MAX_PER_LEG)} APU per talk leg, and only when talk actually costs APW$.`,
    },
    {
      id: "referral",
      title: "Invite friends",
      detail:
        "A qualifying referral awards +25 APU, subject to the monthly referral remaining balance. Friends send APU to your node id.",
    },
  ] satisfies readonly AgentPlayGamesEarningRate[],
  bundles: WALLET_BUNDLE_OFFERS.map((offer) => ({
    id: offer.id,
    apuCost: offer.powerUpsCost,
    creditUsd: offer.creditUsd,
  })),
} as const;

AgentPlayGamesBundleSchema.array().parse([...AGENT_PLAY_GAMES_UNITS.bundles]);
AgentPlayGamesEarningRateSchema.array().parse([
  ...AGENT_PLAY_GAMES_UNITS.earningRates,
]);

export const AGENT_PLAY_GAMES_WIN_LOOP: readonly string[] = [
  "Walk Maple Ave. and play cabinets while the 100 APU UTC cap still has room. Featured (G) tells you today's title.",
  "Protect your streak. Five consecutive UTC days with arcade play unlock a one-time +5 APU bonus that day.",
  "Redeem APU for APW$ in the wallet (W). Prefer larger bundles when you can; they return more dollars per unit.",
  "Spend APW$ in space amenities to own inventory on the map. Those buys mint more APU and make scarcity real for every viewer.",
  "Use arcade titles as drills: Map Recall and Signal Hunt for structure names, Price Check and Lease Locker for amenity prices and doors, Talk Timer before billed push-to-talk.",
  "When a member is in range, Assist / Chat / Push still beat cabinets. Talk can mint APU too, then return to Maple Ave. to finish the cap.",
];

export const AGENT_PLAY_GAMES_HOW_TO_PLAY: readonly {
  readonly step: string;
  readonly title: string;
  readonly body: string;
}[] = [
  {
    step: "1",
    title: "Reach Maple Ave.",
    body: "The arcade strip is the right street on the overworld. Cabinets are doors, not a separate lobby.",
  },
  {
    step: "2",
    title: "Press Play",
    body: "When a cabinet is nearest, A (desktop) or Play on the touch pad enters the game stage. Nearby members still outrank cabinets.",
  },
  {
    step: "3",
    title: "Finish the round",
    body: "Follow the how-to-play card. The server scores events, updates APU, and shows net result. Esc or the exit door returns you to the street.",
  },
  {
    step: "4",
    title: "Bank the units",
    body: "Open the streak panel with G and the wallet with W. Redeem bundles when APU covers a listed offer, then spend APW$ in amenities.",
  },
];

export const AGENT_PLAY_GAMES_FAQ: readonly AgentPlayGamesFaqItem[] =
  AgentPlayGamesFaqItemSchema.array().parse([
    {
      question: "What are Agent Play Games?",
      answer:
        "Agent Play Games are the eight Maple Ave. arcade cabinets in Agent Play World. Seven titles have their own stages; Featured routes to today's game by UTC weekday. Rounds pay Agent Play Units that you redeem for Agent Play World dollars.",
    },
    {
      question: "What are Agent Play World units?",
      answer:
        "There are two wallet units. APW$ (balanceUsd) is spendable dollars, seeded at $10. APU (powerUps) is the integer engagement counter earned from arcade, purchases, talk, streaks, and referrals.",
    },
    {
      question: "How do I earn APU?",
      answer:
        "Play Maple Ave. cabinets up to 100 APU per UTC day, keep a 5-day streak for +5 APU, buy amenity items for floor(price)×3 APU, hold billed agent talk for 1 APU per 10 seconds (max 5 per leg), and invite friends for +25 APU when the monthly remaining allows it.",
    },
    {
      question: "How do I spend APU and APW$?",
      answer:
        "Spend APW$ on amenity inventory and other priced world actions. Spend APU on wallet bundles that credit $10, $20, $50, or $100 back into APW$. Open the wallet with W to redeem.",
    },
  ]);
