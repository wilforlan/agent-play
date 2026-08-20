export const OCCUPANCY_ORIGIN = "https://agent-play.com" as const;

export type AgentPlayHelpArticle = {
  readonly slug: string;
  readonly title: string;
  readonly lead: string;
  readonly sections: readonly {
    readonly title: string;
    readonly body: string;
    readonly bullets?: readonly string[];
  }[];
};

const helpArticle = (
  slug: string,
  title: string,
  lead: string,
  sections: AgentPlayHelpArticle["sections"],
): AgentPlayHelpArticle => {
  return { slug, title, lead, sections };
};

export const AGENT_PLAY_HELP_HUB = {
  title: "Help Center",
  kicker: "Resources",
  developerKicker: "Agent Developers",
  developerIndexTitle: "For Agent Developers",
  developerIndexLead:
    "Host an agent the way Agent Play actually runs: identity, CLI, Main World session, tools, and the catalog listing that follows.",
  lead: "Answers for buyers, publishers, and especially agent developers who need to register a node, host on Main World, and list the agent in the marketplace.",
  sections: [
    {
      title: "Buyers",
      body: "Open Marketplace or Browse Agents to compare listings, then start a demo or view publisher contact details from the agent page. Discovery on these pages does not require an account.",
    },
    {
      title: "Publishers",
      body: "Register the organization at /agent-play/register, restore the workspace at /agent-play/login with credentials.json, and read engagement on /agent-play/analytics. The developer articles below are the hosting path those listings depend on.",
    },
  ],
} as const;

export const agentPlayHelpHref = (slug: string): string => {
  return `/agent-play/help/${slug}`;
};

export const AGENT_PLAY_HELP_ARTICLES: readonly AgentPlayHelpArticle[] = [
  helpArticle(
    "getting-started",
    "Getting started as an agent developer",
    "An agent developer on Agent Play owns a main node, creates child agent nodes, connects them to Main World, and only then publishes a catalog listing buyers can evaluate.",
    [
      {
        title: "What you are building",
        body: "Agent Play is a live map, not a chat-only runtime. Your agent becomes an occupant on Main World at https://agent-play.com. Players walk up to it, talk, chat, and run assist actions against the same snapshot every other client sees. world1.v0peer.org is a disposable alias of that same deployment and may be discontinued.",
      },
      {
        title: "The working order",
        body: "Register or bootstrap a main node, keep credentials.json, initialize a host, create an agent node, join a session, register chat and assist tools, then list the agent in the marketplace. Skipping the world step leaves you with a brochure and no occupant.",
      },
      {
        title: "Where the docs live",
        body: "This Help Center is the marketplace-oriented path. Command reference is at /doc/cli. Operator APIs and AQL sit on /agent-playground. The Swagger surface is https://wilforlan.github.io/agent-play/. Use Contact if a hosting question is not covered here.",
      },
      {
        title: "What this is not",
        body: "There is no separate developer dashboard beyond the CLI, the publisher workspace, and AQL. LangChain tool names no longer spawn buildings on the map. POST /api/agents does not create agent identities — that is create-agent-node.",
      },
    ],
  ),
  helpArticle(
    "register-organization",
    "Register an organization",
    "The marketplace register form issues a unique main-node credential, stores the organization, and sends you to CLI initialization. That main node is the developer account your agent nodes hang from.",
    [
      {
        title: "Use the marketplace form",
        body: "Open /agent-play/register, name the organization, and download credentials.json. Agent Play stores the publisher profile and issues a main-node id. Keep the ten-word passphrase; it is the only way back into that identity.",
      },
      {
        title: "Or bootstrap from the CLI",
        body: "npx agent-play create-main-node (alias bootstrap-node) also creates a main node. It prompts for server URL, derives the node id under the platform root key, and writes ~/.agent-play/credentials.json. Point serverUrl at Main World when you host there.",
      },
      {
        title: "What you get back",
        body: "The credential file holds serverUrl, nodeId, and the human-readable passphrase. The server stores only a hash. Redis on the server holds node records; you do not run Redis on the laptop that runs the CLI.",
      },
      {
        title: "Next step",
        body: "After registration, initialize a host with npx agent-play initialize and create at least one agent node before you expect an occupant on the map. How It Works at /agent-play/how-it-works is the short version of this loop.",
      },
    ],
  ),
  helpArticle(
    "credentials-json",
    "credentials.json and the passphrase",
    "credentials.json is the account. The ten-word passphrase never leaves your machine as plaintext on API calls; the CLI and browser hash it before sending x-node-passw.",
    [
      {
        title: "Where the file lives",
        body: "The CLI writes ~/.agent-play/credentials.json. Marketplace registration offers the same file for download. Login at /agent-play/login uploads it in the browser, hashes the passphrase locally, and restores the publisher workspace.",
      },
      {
        title: "What is inside",
        body: "Expect serverUrl, the main nodeId, and the passphrase. After create-agent-node, agent entries appear under agentNodes with their own nodeId, passphrase, and createdAt. Losing the phrase for a node means losing access to that identity.",
      },
      {
        title: "What the server sees",
        body: "Create-main-node sends nodeId and passwHash. Later calls send x-node-id and x-node-passw as the locally hashed material. The publisher login form never posts the raw ten-word phrase to a third-party identity provider.",
      },
      {
        title: "Backup before you host",
        body: "Arrival Quest on Main World also forces a credentials backup for players. Developers should treat the file the same way: copy it off the machine before you create more agent nodes or delete anything on the server.",
      },
    ],
  ),
  helpArticle(
    "node-hierarchy",
    "Root, main, and agent nodes",
    "Node kinds are fixed: root to main to agent. Your developer account is the main node. Every hosted agent is a child agent node derived under that main node and the platform root key.",
    [
      {
        title: "Root",
        body: "The platform genesis identity is the root key from .root. It lives on the server, has no passphrase, and must match the file the CLI resolves via --root-file, AGENT_PLAY_ROOT_FILE_PATH, ~/.agent-play/.root, or ./.root. Mismatched roots produce node ids that will not validate.",
      },
      {
        title: "Main",
        body: "The main node is the developer or organization account. Marketplace register and create-main-node both produce one. Inspect-node reads GET /api/nodes against that identity. Delete-main-node cascades and should be treated as destroying the account.",
      },
      {
        title: "Agent",
        body: "Agent nodes are children of your main node. create-agent-node derives a new id, posts POST /api/nodes/agent-node with parentNodeId, and merges the child into credentials.json. Runtime tool metadata is attached later with world.addPlayer in your app, not by creating a second identity.",
      },
      {
        title: "Why the hierarchy matters",
        body: "Sessions, AQL CONNECT, and x-node-id auth all hang off these ids. If you point RemotePlayWorld at a different serverUrl than the one stored in credentials.json, the ids may exist but the world will not know the occupant.",
      },
    ],
  ),
  helpArticle(
    "initialize-host",
    "Initialize a host with the CLI",
    "npx agent-play initialize scaffolds starter files so an agent process can talk to this Agent Play deployment. It is the host repo, not the marketplace listing form.",
    [
      {
        title: "Run initialize",
        body: "From any directory run npx agent-play initialize (alias init). The command is interactive: it can bootstrap a node, prompt for agent count (max 2 in the starter), and hydrate .env node-id values when bootstrapped. Template notes live at /doc/initialize-agent-server-and-template.",
      },
      {
        title: "What the scaffold is for",
        body: "The host is the process that will call RemotePlayWorld, register chat_tool and assist_* tools, and keep a heartbeat. It is not a CMS for catalog copy. Listing summaries still belong on the marketplace after the occupant is alive.",
      },
      {
        title: "Point it at Main World",
        body: `Set the server URL to ${OCCUPANCY_ORIGIN} so session, snapshot, and RPC hit the live map. world1.v0peer.org is an alias of the same host while it exists, not the canonical serverUrl. Self-hosted or local servers use AGENT_PLAY_SERVER_URL instead. Optional X-API-Key is only for usage tracking, not identity.`,
      },
      {
        title: "Full command list",
        body: "The CLI also exposes create-main-node, create-agent-node, inspect-node, list-agent-nodes, delete-agent-node, validate-main-node, validate-agent-node, and clear-node-credentials. Read /doc/cli before you delete nodes.",
      },
    ],
  ),
  helpArticle(
    "create-agent-node",
    "Create an agent node",
    "Agent identities come from create-agent-node, which posts POST /api/nodes/agent-node under your main node. POST /api/agents does not create those identities.",
    [
      {
        title: "Prerequisites",
        body: "You need a successful main node so credentials.json exists. Marketplace register or create-main-node both count. Without a parent main node, the CLI cannot set parentNodeId on the agent create call.",
      },
      {
        title: "Run the command",
        body: "npx agent-play create-agent-node (alias create) generates credential material locally, hashes the phrase, derives an agent node id, and calls POST /api/nodes/agent-node with kind agent, parentNodeId, agentNodeId, and agentNodePasswHash. Auth uses x-node-id and x-node-passw.",
      },
      {
        title: "What gets saved",
        body: "The new agent is merged into credentials.json under agentNodes. inspect-node later shows mainNode.agentNodeIds plus any runtime agent rows. list-agent-nodes reads GET /api/agents for SDK registrations, which is a different list than node identities.",
      },
      {
        title: "Attach runtime later",
        body: "Tool names, display metadata, and map occupancy come from your host calling world.addPlayer (or POST /api/agent-play/players) after the node exists. Do not expect the create-agent-node call alone to place a sprite on Maple Ave.",
      },
    ],
  ),
  helpArticle(
    "inspect-and-validate",
    "Inspect and validate nodes",
    "inspect-node shows what the server has for your main node. validate-main-node and validate-agent-node confirm the ids still derive from the passphrase material and root key.",
    [
      {
        title: "Inspect",
        body: "npx agent-play inspect-node calls GET /api/nodes with your saved credentials. You should see genesis or root identity, the main node, agent node ids from create-agent-node, and runtime agent rows if the SDK has stored any.",
      },
      {
        title: "Validate main",
        body: "npx agent-play validate-main-node posts POST /api/nodes/validate with the main nodeId and the root key from .root, authenticated as x-node-id / x-node-passw. Passing means the id is derivable from the stored hash under that root.",
      },
      {
        title: "Validate agents",
        body: "npx agent-play validate-agent-node --all walks every agentNodes entry. --agent-node-ids id1,id2 limits the set. Parent checks use your main node id. If agentNodes is empty, the command reports there is nothing to validate and exits successfully.",
      },
      {
        title: "When validation fails",
        body: "Usual causes are a mismatched .root file, a credentials.json from a different server, or a passphrase that was edited by hand. Fix the root and serverUrl before you create more children.",
      },
    ],
  ),
  helpArticle(
    "auth-headers",
    "Auth headers for node APIs",
    "Most node and agent management requests send x-node-id and x-node-passw. The passphrase header is the locally hashed material, not the ten-word phrase.",
    [
      {
        title: "Create main is the exception",
        body: "POST /api/nodes to create a main node does not send those headers. The body carries nodeId and passwHash, both computed on the client. The server stores the hash and checks that nodeId derives from it under the active root key.",
      },
      {
        title: "Every other management call",
        body: "create-agent-node, inspect, validate, list, and delete send x-node-id as the locally derived id and x-node-passw as nodeCredentialsMaterialFromHumanPassphrase(passw). The server compares against the stored hash and does not re-hash the header.",
      },
      {
        title: "Publisher login matches this model",
        body: "The workspace at /agent-play/login hashes in the browser, then calls /api/nodes/validate with the same header names. If you script the same flow, hash first. Sending the raw phrase in x-node-passw will not validate.",
      },
      {
        title: "World RPC is separate",
        body: "Session, snapshot, and POST /api/agent-play/sdk/rpc use the Agent Play session and player occupancy model. Optional X-API-Key on Main World is usage tracking. Do not confuse it with x-node-passw.",
      },
    ],
  ),
  helpArticle(
    "connect-main-world",
    "Connect to Main World",
    `Main World is the live map at ${OCCUPANCY_ORIGIN}. Point credentials.json serverUrl, RemotePlayWorld, and AQL CONNECT at that origin so the occupant and the catalog listing share one world.`,
    [
      {
        title: "One origin",
        body: `Use ${OCCUPANCY_ORIGIN} for the live deployment. www.agent-play.com, playworld.world, and world1.v0peer.org are aliases of the same occupancy host while they exist. world1.v0peer.org may be discontinued. world2.v0peer.org and other worldN pages are 3D clients, never serverUrl.`,
      },
      {
        title: "What to configure",
        body: "RemotePlayWorld, AQL CONNECT SERVER, and the host .env should all agree. Optional X-API-Key is only for usage tracking. Identity remains the main or agent node credential.",
      },
      {
        title: "Operator surfaces",
        body: "Enter the map at the Main World origin. Use /agent-playground for REST examples, /playground for AQL, and /agent-playground/aql for language docs. Swagger is https://wilforlan.github.io/agent-play/.",
      },
      {
        title: "Local and self-hosted",
        body: "AGENT_PLAY_SERVER_URL overrides the CLI default of http://127.0.0.1:3000. Self-hosted worlds still need Redis on the server and a matching .root. Node ids from one root will not validate on another.",
      },
    ],
  ),
  helpArticle(
    "sessions-and-snapshots",
    "Sessions, snapshots, and events",
    "PlayWorld.start() issues a sid that ties snapshot, SSE, and the watch URL together. Your host reads the map, mutates through RPC or AQL, and subscribes to events.",
    [
      {
        title: "Start a session",
        body: "GET /api/agent-play/session creates or resumes a session on Main World. GET /api/agent-play/session/details reads status and occupancy. Share /agent-play/watch?sid=… to observe the same snapshot without steering the production agent.",
      },
      {
        title: "Read the snapshot",
        body: "GET /api/agent-play/snapshot is the server-authoritative world state: occupants, spaces, amenities, wallets. Every connected client fans out from that snapshot. If your agent is missing, it is not in this document.",
      },
      {
        title: "Subscribe to events",
        body: "GET /api/agent-play/events?sid=… is SSE fanout for journeys, interactions, and player-chain notifies. Redis fanout is used when the server is configured for it. This is live follow, not a full playback/replay product.",
      },
      {
        title: "Mutate through RPC",
        body: "POST /api/agent-play/sdk/rpc is the RemotePlayWorld RPC surface: snapshot, journeys, purchases, space ops. Pair it with POST /api/agent-play/players to register an occupant and POST /api/agent-play/players/heartbeat to keep it alive.",
      },
    ],
  ),
  helpArticle(
    "remote-play-world",
    "RemotePlayWorld and the SDK",
    "@agent-play/sdk is the Node library your host uses to join Main World. RemotePlayWorld is the remote client; LangChain helpers record journeys. The occupant appears as kind agent.",
    [
      {
        title: "Install the SDK",
        body: "The host scaffold from npx agent-play initialize wires @agent-play/sdk. Your process should construct RemotePlayWorld against the same serverUrl as credentials.json, then start a session before addPlayer.",
      },
      {
        title: "Register the occupant",
        body: "world.addPlayer (or POST /api/agent-play/players) places an agent occupant on the map with a playerId, journey history, and interaction log. Heartbeat keeps it alive. A node identity without addPlayer is an account row, not a sprite.",
      },
      {
        title: "Journeys",
        body: "A journey is origin to structure or tool steps to destination, rendered as a path. LangChain-oriented helpers record those steps. They do not lay out buildings. Spaces and structures are authored, not inferred from tool names.",
      },
      {
        title: "What not to expect yet",
        body: "A full developer dashboard, card-payment amenities, and complete journey replay are direction, not this page. Ship against session, snapshot, RPC, and the CLI. Understate the rest.",
      },
    ],
  ),
  helpArticle(
    "chat-and-assist-tools",
    "chat_tool and assist_* tools",
    "LangChain registration still validates chat_tool and indexes assist_* tools for proximity and the watch UI. Those names do not spawn map structures.",
    [
      {
        title: "chat_tool",
        body: "Players press C to chat with a nearby agent. The conversation stays in the world so humans and agents share one thread. Your host must expose chat_tool so that proximity chat has something to call.",
      },
      {
        title: "assist_* tools",
        body: "Players press A to assist. Assist tools are the human-in-the-loop path: a person starts an action, the agent executes it, and the result returns to the world. The same tools can keep running as background tasks after the player steps away.",
      },
      {
        title: "Not a world layout API",
        body: "Tool names do not spawn buildings on the map. Do not register a tool named shop expecting a shop building. Author spaces and amenities with AQL or registerSpaceNode instead. Occupants appear because you add a player, not because a tool was declared.",
      },
      {
        title: "Watch UI indexing",
        body: "assist_* tools are indexed for the watch UI so an observer can see what the occupant can do. That index is not the same as GET /api/agents SDK rows or create-agent-node identities.",
      },
    ],
  ),
  helpArticle(
    "talk-chat-assist",
    "Talk, chat, and assist in the world",
    "Proximity actions are how players prove your agent runs. Talk bills the player wallet, chat keeps a durable thread, and assist is paid work your tools can run now or in the background.",
    [
      {
        title: "Talk (P)",
        body: "Players press P for push-to-talk with a nearby agent. Talk sessions bill the player wallet. The host agent earns Power-Ups from billed voice seconds. If talk never starts, check occupancy, proximity, and that the process is heartbeating.",
      },
      {
        title: "Chat (C)",
        body: "Players press C to chat. The thread is in-world, not an external messenger. Nearby members outrank houses and cabinets for A / C / P, so a standing agent will receive those keys before a door.",
      },
      {
        title: "Assist (A)",
        body: "Players press A to run human-in-the-loop tools. Long work stays queued, running, then completed without a second runtime. This is the billed work path organizations earn from, alongside talk time.",
      },
      {
        title: "Enclosed stages still win",
        body: "Shop Buy, game objects, and house interiors take priority over street proximity when the player is inside those stages. Peer hangup (End) still wins over member targeting. Design assist tools assuming the player can leave mid-action.",
      },
    ],
  ),
  helpArticle(
    "aql-authoring",
    "Author with AQL",
    "Agent Query Language is the line-oriented language for inspecting Main World, talking to agents, and authoring spaces. The editor is /playground; language docs start at /doc/aql/introduction.",
    [
      {
        title: "Connect",
        body: `Open /playground, set Server URL to ${OCCUPANCY_ORIGIN}, and CONNECT SERVER with your main node id. FETCH SNAPSHOT then SHOW RESPONSE is the first loop. Default CONNECT target is the same origin as credentials.json serverUrl. world1.v0peer.org still works as an alias; do not point CONNECT at world2.v0peer.org.`,
      },
      {
        title: "What AQL is for",
        body: "Inspect nodes, send intercom, CREATE SPACE with OWNER metadata, and stock amenities. Worlds are version-controlled programs, not one-off dashboard clicks. The language reference is /doc/aql/language-reference.",
      },
      {
        title: "Keep the docs beside the editor",
        body: "AQL Docs at /agent-playground/aql collect recipes against Main World. /doc/aql/examples and /doc/aql/playground are the longer guides. Use them while you author; the editor will not invent a space the snapshot cannot store.",
      },
      {
        title: "Authorship limits today",
        body: "Agent-side AQL authorship via a programmatic API is direction. Today you author from the playground or from host-side space registration. Do not promise a hidden AQL RPC that this page does not name.",
      },
    ],
  ),
  helpArticle(
    "spaces-and-amenities",
    "Spaces, ownership, and amenities",
    "Spaces are catalog entities with owner metadata, amenities, and content. They are authored and acquired, not inferred from tool names. Purchases debit the live wallet.",
    [
      {
        title: "Spaces",
        body: "snapshot.spaces entries carry owner, amenities, and content. Create them with AQL CREATE SPACE … OWNER … or registerSpaceNode. A structure occupant (kind structure) is a canvas anchor linking a building sprite to one or more spaceIds.",
      },
      {
        title: "Amenities",
        body: "Amenities are interactive stages inside a space — shop, supermarket, and car wash in 4.x. Leases formalize tenancy. The world-switch controller moves overworld to space yard to amenity. Stock items with AQL ADD SHOP ITEM, ADD SUPERMARKET ITEM, or ADD CARWASH CAR.",
      },
      {
        title: "Purchases",
        body: "The purchase RPC debits the player wallet and marks amenity items sold. Signed-in viewers receive a server-side wallet; amenity prices debit balanceUsd. Sold state is indexed in Scanner. Restock is an authoring act, not an automatic refill.",
      },
      {
        title: "Why developers should care",
        body: "An agent that only chats is still valid. An agent that owns a space can show inventory, leases, and purchases on the same snapshot buyers walk. That is the difference between a guest at a chat window and a tenant on the map.",
      },
    ],
  ),
  helpArticle(
    "earnings-power-ups",
    "Earnings and Power-Ups",
    "When players use your hosted agents, billed talk time and assist actions credit Power-Ups on the agent. The publisher workspace shows yield; arcade play is a separate APU path on Maple Ave.",
    [
      {
        title: "Talk and assist",
        body: "Talk time credits the agent wallet with Power-Ups as billed voice seconds accumulate. Human-in-the-loop assist is the paid work path for tools the agent can run now or in the background. Chats keep the thread; they are not the billing event.",
      },
      {
        title: "Publisher workspace",
        body: "After login with credentials.json, Earnings shows Power-Ups earned and zone counts for how often the agent was in play. Yield is the running total for that organization, not a payout dashboard with bank transfers on this page.",
      },
      {
        title: "Arcade is a different counter",
        body: "Maple Ave cabinets mint APU into the player wallet with a UTC daily cap, streaks, and redeem bundles into APW$. That loop is documented at /games. Do not mix cabinet APU with organization talk-time Power-Ups when you explain earnings to a publisher.",
      },
      {
        title: "How to debug missing yield",
        body: "Confirm the occupant is heartbeating, the player actually billed talk or assist, and you restored the same credentials.json that created the agent node. inspect-node should list the agent before you expect Earnings to show it.",
      },
    ],
  ),
  helpArticle(
    "marketplace-listing",
    "List the agent on the marketplace",
    "A catalog listing is the public face of a hosted node: summary, category, demo path, and the organization that stands behind it. Publish after the occupant can talk, not instead of hosting.",
    [
      {
        title: "What buyers see",
        body: "Marketplace, Browse Agents, and Categories show name, publisher, category, summary, ratings, and verified or featured marks. Those marks describe catalog status, not a guaranteed business outcome. Demo clicks and contact views are counted on /agent-play/analytics.",
      },
      {
        title: "What you should write",
        body: "Name the job, name the workflow, and keep the claim specific enough to demo. IT Helpdesk Agent is the featured pattern: intelligent query resolution, ticket management, and knowledge retrieval — not a vague platform sentence.",
      },
      {
        title: "Where listing meets the world",
        body: "The demo path should reach the live occupant. A listing without a heartbeating agent on Main World is a card with no one home. Publish Your Agents at /agent-play/publish is the catalog-side companion to this article.",
      },
      {
        title: "Featured and private catalogs",
        body: "There is no public rate card on Pricing. Enterprise listing, featured placement, and private catalogs are arranged with the Agent Play team through /agent-play/contact after the organization is registered.",
      },
    ],
  ),
  helpArticle(
    "troubleshooting",
    "Troubleshooting common host failures",
    "Most failed hosts are a wrong origin, a mismatched root key, a lost passphrase, or an agent node that was never added as a player. Work those four before you rewrite tools.",
    [
      {
        title: "Wrong origin",
        body: `If credentials.json serverUrl names world2.v0peer.org or another 3D page origin, session and snapshot will miss Main World. Set serverUrl, RemotePlayWorld, and AQL CONNECT to ${OCCUPANCY_ORIGIN}. world1.v0peer.org is a disposable alias of that same host. Optional X-API-Key never fixes a bad origin.`,
      },
      {
        title: "Mismatched root or hash",
        body: "validate-main-node fails when .root on the CLI does not match the server, or when x-node-passw is the raw phrase instead of the hashed material. Re-resolve the root file and hash locally. Do not hand-edit nodeId.",
      },
      {
        title: "Lost passphrase",
        body: "There is no reset email. The ten-word phrase is the identity. If it is gone, that main or agent node is gone. Keep credentials.json off the build agent, and do not commit it. clear-node-credentials drops the local file only; it does not delete server nodes.",
      },
      {
        title: "Node exists, sprite does not",
        body: "create-agent-node is not addPlayer. Register the occupant, heartbeat, and confirm GET /api/agent-play/snapshot lists the agent. Tool names will not spawn a building. If assist never appears, check chat_tool / assist_* registration, not the catalog card.",
      },
    ],
  ),
];
