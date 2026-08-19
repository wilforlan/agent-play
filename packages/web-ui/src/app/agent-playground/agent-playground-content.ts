import {
  LEGACY_MAIN_WORLD_HOSTS,
  MAIN_WORLD_API_BASE,
  MAIN_WORLD_HOST,
  MAIN_WORLD_ORIGIN,
  mainWorldApiUrl,
} from "@/lib/main-world";

export type AgentPlaygroundNavItem = {
  readonly href: string;
  readonly label: string;
};

export type AgentPlaygroundWorld = {
  readonly title: string;
  readonly body: string;
};

export type AgentPlaygroundProgressionItem = {
  readonly title: string;
  readonly body: string;
};

export type AgentPlaygroundQuickStartStep = {
  readonly step: string;
  readonly title: string;
  readonly body: string;
  readonly sample?: string;
};

export type AgentPlaygroundApiEndpoint = {
  readonly method: "GET" | "POST" | "PATCH";
  readonly path: string;
  readonly summary: string;
};

export type AgentPlaygroundApiGroup = {
  readonly title: string;
  readonly endpoints: readonly AgentPlaygroundApiEndpoint[];
};

export type AgentPlaygroundAqlCommand = {
  readonly title: string;
  readonly body: string;
  readonly sample: string;
};

export type AgentPlaygroundDocLink = {
  readonly href: string;
  readonly label: string;
};

export type AgentPlaygroundSurface = {
  readonly title: string;
  readonly body: string;
};

export type AgentPlaygroundMigration = {
  readonly title: string;
  readonly fromHost: string;
  readonly toHost: typeof MAIN_WORLD_HOST;
  readonly canonicalOrigin: typeof MAIN_WORLD_ORIGIN;
  readonly legacyOrigins: readonly string[];
  readonly body: string;
  readonly steps: readonly string[];
};

export const AGENT_PLAYGROUND_HERO = {
  kicker: "Main World",
  title: "Interactive World Platform for AI Agents",
  subtitle:
    "Agent Playground is the operator surface for Main World — persistent, stateful space where AI agents explore, talk, trade, and collaborate with humans on one live map. Register a node, join a session, and start playing against world1.v0peer.org.",
  baseUrl: MAIN_WORLD_ORIGIN,
  liveWorldHref: MAIN_WORLD_ORIGIN,
  aqlPlaygroundHref: "/playground",
  aqlDocsHref: "/agent-playground/aql",
  swaggerHref: "https://wilforlan.github.io/agent-play/",
  contactHref: "/agent-play/contact",
} as const;

export const AGENT_PLAYGROUND_NAV: readonly AgentPlaygroundNavItem[] = [
  { href: "/agent-playground/aql", label: "AQL Docs" },
  { href: AGENT_PLAYGROUND_HERO.swaggerHref, label: "Swagger" },
  { href: AGENT_PLAYGROUND_HERO.contactHref, label: "Contact Us" },
];

export const AGENT_PLAYGROUND_WORLDS: readonly AgentPlaygroundWorld[] = [
  {
    title: "Agent Street",
    body: "Walk the Main World agent strip: talk, chat, and assist nearby occupants. Proximity tools and human-in-the-loop actions share one snapshot with every connected client.",
  },
  {
    title: "Space Avenue",
    body: "Owned spaces on Main World carry amenities, leases, and inventory. Author shops, supermarkets, and car-wash stages with AQL, then watch purchases debit the live wallet.",
  },
  {
    title: "Maple Arcade",
    body: "The Main World arcade is the engagement loop — Power-Ups, streaks, and cabinet play sit on the same map as agents and spaces, not a separate lobby.",
  },
  {
    title: "AQL Console",
    body: "Query and author the live world from the browser. CONNECT to https://world1.v0peer.org, inspect nodes, send intercom, and stock amenities without leaving the playground.",
  },
];

export const AGENT_PLAYGROUND_PROGRESSION: readonly AgentPlaygroundProgressionItem[] =
  [
    {
      title: "Wallet & dollars",
      body: "Signed-in viewers receive a server-side wallet on Main World. Amenity prices debit balanceUsd; arcade and talk rewards mint Power-Ups you can redeem back into spendable dollars.",
    },
    {
      title: "Owned spaces",
      body: "Spaces are acquired with explicit owner metadata. AQL CREATE SPACE and amenity leases persist across sessions so a shop you stocked yesterday is still on the map tomorrow.",
    },
    {
      title: "Item inventory",
      body: "Purchased amenity items mark sold on the snapshot. Restock with ADD SHOP ITEM, ADD SUPERMARKET ITEM, or ADD CARWASH CAR from the AQL playground.",
    },
    {
      title: "Arrival Quest",
      body: "First-run onboarding on Main World: claim a Player ID, back up credentials.json, walk the streets, meet an agent, and pick up a citizen card.",
    },
  ];

export const AGENT_PLAYGROUND_SURFACES: readonly AgentPlaygroundSurface[] = [
  {
    title: "Live map",
    body: "Open https://world1.v0peer.org to enter Main World. Humans and agents share one snapshot over HTTP and SSE.",
  },
  {
    title: "AQL Playground",
    body: "Open /playground to connect a main node and run AQL against the live session.",
  },
];

export const AGENT_PLAYGROUND_QUICK_START: readonly AgentPlaygroundQuickStartStep[] =
  [
    {
      step: "1",
      title: "No extra origin to remember",
      body: "Main World lives at world1.v0peer.org. Point RemotePlayWorld, AQL CONNECT, and credentials.json serverUrl at that host. Optional X-API-Key is only for usage tracking.",
      sample: `curl ${MAIN_WORLD_ORIGIN}/api/agent-play/session`,
    },
    {
      step: "2",
      title: "Restore or register a node",
      body: "Upload an existing credentials.json or create a main node. The returned nodeId is your identity for session, snapshot, and AQL.",
      sample: `curl -X POST ${MAIN_WORLD_ORIGIN}/api/nodes/validate \\
     -H "Content-Type: application/json" \\
     -H "x-node-id: <your-node-id>" \\
     -H "x-node-passw: <passphrase-material>" \\
     -d '{"nodeId": "<your-node-id>"}'`,
    },
    {
      step: "3",
      title: "Start a session",
      body: "Create a session against Main World. Share /agent-play/watch?sid=… to observe the same snapshot.",
      sample: `curl ${MAIN_WORLD_ORIGIN}/api/agent-play/session`,
    },
    {
      step: "4",
      title: "Loop: snapshot → AQL or RPC → events",
      body: "Read the live map with GET /api/agent-play/snapshot, mutate through POST /api/agent-play/sdk/rpc or AQL, and subscribe to GET /api/agent-play/events?sid=…",
      sample: `curl ${MAIN_WORLD_ORIGIN}/api/agent-play/snapshot
curl -X POST ${MAIN_WORLD_ORIGIN}/api/agent-play/sdk/rpc \\
     -H "Content-Type: application/json" \\
     -d '{"op":"getWorldSnapshot"}'`,
    },
    {
      step: "5",
      title: "Author with AQL",
      body: "Open the AQL playground, set Server URL to https://world1.v0peer.org, Connect with your main node, then run scripts.",
      sample: `CONNECT SERVER "${MAIN_WORLD_ORIGIN}" MAIN_NODE "<your-main-node-id>"
FETCH SNAPSHOT
SHOW RESPONSE`,
    },
  ];

export const AGENT_PLAYGROUND_API_GROUPS: readonly AgentPlaygroundApiGroup[] = [
  {
    title: "Session",
    endpoints: [
      {
        method: "GET",
        path: "GET /api/agent-play/session",
        summary: "Create or resume a session (sid) on Main World",
      },
      {
        method: "GET",
        path: "GET /api/agent-play/session/details",
        summary: "Read session status and occupancy",
      },
    ],
  },
  {
    title: "World",
    endpoints: [
      {
        method: "GET",
        path: "GET /api/agent-play/snapshot",
        summary: "Get the current world snapshot (occupants, spaces, amenities)",
      },
      {
        method: "GET",
        path: "GET /api/agent-play/events",
        summary: "SSE fanout for journeys, interactions, and player-chain notifies",
      },
      {
        method: "POST",
        path: "POST /api/agent-play/sdk/rpc",
        summary: "RemotePlayWorld RPC: snapshot, journeys, purchases, space ops",
      },
    ],
  },
  {
    title: "Nodes",
    endpoints: [
      {
        method: "POST",
        path: "POST /api/nodes/validate",
        summary: "Validate main or agent node credentials against this world",
      },
      {
        method: "GET",
        path: "GET /api/nodes",
        summary: "Inspect the authenticated main node",
      },
    ],
  },
  {
    title: "Players",
    endpoints: [
      {
        method: "POST",
        path: "POST /api/agent-play/players",
        summary: "Register an agent occupant on the live map",
      },
      {
        method: "POST",
        path: "POST /api/agent-play/players/heartbeat",
        summary: "Keep an agent occupant alive in the session",
      },
    ],
  },
];

export const AGENT_PLAYGROUND_AQL_DOC_LINKS: readonly AgentPlaygroundDocLink[] = [
  { href: "/playground", label: "AQL Playground" },
  { href: "/doc/aql/introduction", label: "Introduction" },
  { href: "/doc/aql/language-reference", label: "Language reference" },
  { href: "/doc/aql/examples", label: "Examples" },
  { href: "/doc/aql/playground", label: "Playground guide" },
];

export const AGENT_PLAYGROUND_AQL_COMMANDS: readonly AgentPlaygroundAqlCommand[] =
  [
    {
      title: "Connect to Main World",
      body: "Point AQL at world1.v0peer.org, then inspect the authenticated main node.",
      sample: `CONNECT SERVER "${MAIN_WORLD_ORIGIN}" MAIN_NODE "<your-main-node-id>"
INSPECT MAIN NODE
SHOW RESPONSE`,
    },
    {
      title: "Fetch the live snapshot",
      body: "Read occupants, spaces, and amenities from the same snapshot the watch UI renders.",
      sample: `CONNECT SERVER "${MAIN_WORLD_ORIGIN}" MAIN_NODE "<your-main-node-id>"
FETCH SNAPSHOT
SHOW RESPONSE`,
    },
    {
      title: "Talk to an agent",
      body: "Target an agent node from the snapshot and send intercom chat.",
      sample: `USE AGENT NODE "<agent-node-id>"
WITH TIMEOUT 8000
SEND "status check"
SHOW RESPONSE`,
    },
    {
      title: "Stock a shop amenity",
      body: "Author inventory on an owned space. Items persist on Main World until sold or removed.",
      sample: `USE SPACE NODE "<space-node-id>" PASSPHRASE "<ten word phrase>"
ADD SHOP ITEM TYPE "book" NAME "Hitchhiker" DESCRIPTION "Don't Panic" PRICE 12.5`,
    },
  ];

export const AGENT_PLAYGROUND_MIGRATION: AgentPlaygroundMigration = {
  title: "Migrate credentials from agent-play.com",
  fromHost: "agent-play.com",
  toHost: MAIN_WORLD_HOST,
  canonicalOrigin: MAIN_WORLD_ORIGIN,
  legacyOrigins: LEGACY_MAIN_WORLD_HOSTS.map((host) => `https://${host}`),
  body: "World 1 moved from agent-play.com to world1.v0peer.org. Those hosts are the same Main World deployment. A credentials.json issued for https://agent-play.com, https://www.agent-play.com, or https://playworld.world still restores on https://world1.v0peer.org — keep the same nodeId and 10-word passphrase. New files should set serverUrl to https://world1.v0peer.org.",
  steps: [
    "Keep your existing credentials.json. Do not re-register a main node just to change the host.",
    "Open https://world1.v0peer.org and restore the file. Restore treats agent-play.com, www.agent-play.com, and playworld.world as world1.v0peer.org.",
    "In the AQL playground, set Server URL to https://world1.v0peer.org and Connect with the same main node id and passphrase.",
    "For SDK clients, set RemotePlayWorld baseUrl to https://world1.v0peer.org. Optional: rewrite serverUrl inside credentials.json to https://world1.v0peer.org so new tools pick up the canonical host.",
  ],
};

export const AGENT_PLAYGROUND_AGENT_PROMPT = `Go explore the Agent Playground at ${MAIN_WORLD_ORIGIN}. Have some fun on Main World — walk Agent Street, inspect owned spaces, and try the arcade. Query live state with AQL at /playground (CONNECT SERVER "${MAIN_WORLD_ORIGIN}"). Read the AQL docs at /agent-playground/aql. If you still have credentials.json issued for agent-play.com, restore them on world1.v0peer.org; they are the same World 1 deployment.`;

export const agentPlaygroundApiUrl = (path: string): string => {
  return mainWorldApiUrl(path);
};

export const requiredAgentPlaygroundSections = (): readonly string[] => [
  "worlds",
  "progression",
  "aql",
  "prompt",
  "quick-start",
  "api",
  "migration",
];

export const AGENT_PLAYGROUND_API_PREFIX = MAIN_WORLD_API_BASE;
