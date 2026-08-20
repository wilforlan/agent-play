import { MAIN_WORLD_ORIGIN } from "@/lib/main-world";

import {
  AGENT_PLAY_HELP_ARTICLES,
  AGENT_PLAY_HELP_HUB,
} from "./agent-play-help-content";

export type AgentPlayNavItem = {
  readonly href: string;
  readonly label: string;
};

export type AgentPlayNavSection = {
  readonly id: "marketplace" | "worlds";
  readonly label: string;
  readonly items: readonly AgentPlayNavItem[];
};

export type AgentPlayWorldSurface = {
  readonly href: string;
  readonly label: string;
  readonly title: string;
  readonly body: string;
};

export type AgentPlayFooterColumn = {
  readonly title: string;
  readonly links: readonly AgentPlayNavItem[];
};

export type AgentPlayMetric = {
  readonly label: string;
  readonly value: string;
};

export type AgentPlayAgent = {
  readonly name: string;
  readonly publisher: string;
  readonly verified: boolean;
  readonly category: string;
  readonly summary: string;
  readonly rating: string;
  readonly reviewCount: number;
  readonly featured: boolean;
};

export type AgentPlayTopAgent = {
  readonly name: string;
  readonly engagement: number;
};

export type AgentPlayPillar = {
  readonly title: string;
  readonly body: string;
};

export type AgentPlayStep = {
  readonly step: string;
  readonly title: string;
  readonly body: string;
};

export type AgentPlayCliLine = {
  readonly kind: "prompt" | "output";
  readonly text: string;
};

export type AgentPlayCliShot = {
  readonly title: string;
  readonly caption: string;
  readonly lines: readonly AgentPlayCliLine[];
};

export type AgentPlayArticleSection = {
  readonly title: string;
  readonly body: string;
  readonly bullets?: readonly string[];
};

export type AgentPlaySitePageKind =
  | "marketplace"
  | "agents"
  | "categories"
  | "analytics"
  | "how-it-works"
  | "help"
  | "article"
  | "form";

export type AgentPlayFormKind = "login" | "register" | "contact";

export type AgentPlaySitePage = {
  readonly path: readonly string[];
  readonly title: string;
  readonly kicker: string;
  readonly lead: string;
  readonly kind: AgentPlaySitePageKind;
  readonly formKind?: AgentPlayFormKind;
  readonly sections?: readonly AgentPlayArticleSection[];
};

export const AGENT_PLAY_BRAND = {
  name: "Agent Play",
  tagline:
    "The enterprise marketplace for AI agents. Discover, publish, and grow with trusted organizations.",
  copyright:
    "© 2026 Viroke Technologies Inc (a Delaware US corporation). All rights reserved.",
} as const;

export const AGENT_PLAY_HERO = {
  kicker: "Enterprise AI Agent Marketplace",
  title: "The Enterprise Marketplace for AI Agents",
  subtitle:
    "Discover, evaluate, and connect with AI agents from trusted organizations. Explore demos, compare solutions, and generate qualified interest — all in one professional marketplace.",
  ctaPrimary: "Explore Agents",
  ctaSecondary: "Become a Publisher",
} as const;

export const AGENT_PLAY_NAV: readonly AgentPlayNavItem[] = [
  { href: "/agent-play/marketplace", label: "Marketplace" },
  { href: "/agent-play/categories", label: "Categories" },
  { href: "/agent-play/agents", label: "Browse Agents" },
  { href: "/agent-play/about", label: "About" },
  { href: "/agent-play/contact", label: "Contact" },
  { href: "/agent-play/login", label: "Login" },
  { href: "/agent-play/register", label: "Register Organization" },
];

export const AGENT_PLAY_WORLD_SURFACES: readonly AgentPlayWorldSurface[] = [
  {
    href: "/playground",
    label: "Playground",
    title: "AQL Playground",
    body: "Connect a main node and query the live session with AQL from the browser console.",
  },
  {
    href: "/agent-playground",
    label: "Agent Playground",
    title: "Operator surface",
    body: "Docs, REST examples, and onboarding for agents joining the live Main World map.",
  },
  {
    href: "/games",
    label: "Agent Play Games",
    title: "Maple Ave arcade",
    body: "Play cabinets on Maple Ave, earn Power-Ups, and feed the same wallet the world uses.",
  },
  {
    href: MAIN_WORLD_ORIGIN,
    label: "Main World",
    title: "world1.v0peer.org",
    body: "The live map where humans and agents walk, talk, trade, and collaborate in one snapshot.",
  },
];

export const AGENT_PLAY_WORLD_NAV: readonly AgentPlayNavItem[] =
  AGENT_PLAY_WORLD_SURFACES.map((surface) => ({
    href: surface.href,
    label: surface.label,
  }));

export const AGENT_PLAY_NAV_SECTIONS: readonly [
  AgentPlayNavSection,
  AgentPlayNavSection,
] = [
  { id: "marketplace", label: "Marketplace", items: AGENT_PLAY_NAV },
  { id: "worlds", label: "Worlds", items: AGENT_PLAY_WORLD_NAV },
];

export const AGENT_PLAY_FOOTER_COLUMNS: readonly AgentPlayFooterColumn[] = [
  {
    title: "Product",
    links: [
      { href: "/agent-play/marketplace", label: "Marketplace" },
      { href: "/agent-play/categories", label: "Categories" },
      { href: "/agent-play/analytics", label: "Analytics" },
      { href: "/agent-play/how-it-works", label: "How It Works" },
      { href: "/agent-play/pricing", label: "Pricing" },
    ],
  },
  {
    title: "For Publishers",
    links: [
      { href: "/agent-play/publish", label: "Publish Your Agents" },
      { href: "/agent-play/publishers/benefits", label: "Publisher Benefits" },
      {
        href: "/agent-play/publishers/insights",
        label: "Analytics & Insights",
      },
      { href: "/agent-play/publishers/success", label: "Success Stories" },
      { href: "/agent-play/publishers/resources", label: "Publisher Resources" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/games", label: "Agent Play Games" },
      { href: "/doc", label: "Documentation" },
      { href: "/agent-playground", label: "Agent Playground" },
      { href: "/agent-playground/aql", label: "AQL Docs" },
      { href: "/agent-play/help", label: "Help Center" },
      { href: "/agent-play/webinars", label: "Webinars" },
      { href: "/agent-play/guides", label: "Guides" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/agent-play/about", label: "About Agent Play" },
      { href: "/agent-play/careers", label: "Careers" },
      { href: "/agent-play/contact", label: "Contact Us" },
      { href: "/agent-play/privacy", label: "Privacy Policy" },
      { href: "/agent-play/terms", label: "Terms of Service" },
    ],
  },
];

export const AGENT_PLAY_FEATURED_AGENT: AgentPlayAgent = {
  name: "IT Helpdesk Agent",
  publisher: "Agent Play",
  verified: true,
  category: "IT & Operations",
  summary:
    "Automates IT support with intelligent query resolution, ticket management, and knowledge retrieval.",
  rating: "4.8",
  reviewCount: 125,
  featured: true,
};

export const AGENT_PLAY_CATALOG: readonly AgentPlayAgent[] = [
  AGENT_PLAY_FEATURED_AGENT,
  {
    name: "Healthcare Navigation Assistant",
    publisher: "Agent Play",
    verified: true,
    category: "Healthcare",
    summary:
      "Helps employees and patients find the right care pathway, benefits answer, or next appointment.",
    rating: "4.7",
    reviewCount: 64,
    featured: false,
  },
  {
    name: "Meeting Scheduler Agent",
    publisher: "Agent Play",
    verified: true,
    category: "Productivity",
    summary:
      "Coordinates calendars, proposes times, and confirms meetings across teams without extra email loops.",
    rating: "4.6",
    reviewCount: 41,
    featured: false,
  },
  {
    name: "Employee Onboarding Assistant",
    publisher: "Agent Play",
    verified: true,
    category: "HR",
    summary:
      "Guides new hires through policy, equipment, and first-week checklists with tracked completion.",
    rating: "4.5",
    reviewCount: 38,
    featured: false,
  },
];

export const AGENT_PLAY_MARKETPLACE_STATS: readonly AgentPlayMetric[] = [
  { label: "Publishers", value: "2" },
  { label: "Agents", value: "38" },
  { label: "Profile Views", value: "52" },
  { label: "Demo Clicks", value: "0" },
];

export const AGENT_PLAY_ANALYTICS = {
  period: "This Month",
  leadTrend: "+0%",
  metrics: [
    { label: "Profile Views", value: "52" },
    { label: "Demo Clicks", value: "0" },
    { label: "Contact Views", value: "0" },
  ],
  insights: [
    "Track key engagement metrics in real time",
    "Identify top-performing agents and channels",
    "Understand buyer behavior and intent",
    "Drive better conversions with data-driven insights",
  ],
} as const;

export const AGENT_PLAY_TOP_AGENTS: readonly AgentPlayTopAgent[] = [
  { name: "Healthcare Navigation Assistant", engagement: 13 },
  { name: "Meeting Scheduler Agent", engagement: 10 },
  { name: "Employee Onboarding Assistant", engagement: 7 },
];

export const AGENT_PLAY_PILLARS: readonly AgentPlayPillar[] = [
  {
    title: "Public Agent Discovery",
    body: "Browse agent catalogs, view detailed information, compare use cases, and explore demos.",
  },
  {
    title: "Organization Registration",
    body: "Onboard your company, create publisher profiles, and build credibility in minutes.",
  },
  {
    title: "Demo & Conversion Tracking",
    body: "Track demo clicks, website visits, contact detail views, and enquiries in real time.",
  },
  {
    title: "Publisher Analytics",
    body: "Measure engagement, analyze lead quality, and optimize your go-to-market strategy.",
  },
];

export const AGENT_PLAY_HOW_IT_WORKS: readonly AgentPlayStep[] = [
  {
    step: "1",
    title: "Register Organization",
    body: "Create your organization profile. Agent Play stores it in Redis and issues a unique main-node credential for you to download.",
  },
  {
    step: "2",
    title: "Initialize with the CLI",
    body: "Install the agent-play CLI, run initialize, and create agent nodes under your organization credential.",
  },
  {
    step: "3",
    title: "Host agents in the world",
    body: "Players walk up to your agents to talk, chat, and run human-in-the-loop actions, including background tasks.",
  },
];

export const AGENT_PLAY_CLI_ONBOARDING = {
  cliDocHref: "/doc/cli",
  initializeDocHref: "/doc/initialize-agent-server-and-template",
  installCommand: "npx agent-play initialize",
  createAgentCommand: "npx agent-play create-agent-node",
  inspectCommand: "npx agent-play inspect-node",
  installTitle: "Install and initialize",
  hostingTitle: "Host your agents",
} as const;

export const AGENT_PLAY_LOGIN_WORKSPACE = {
  uploadLabel: "credentials.json",
  uploadHelp:
    "Use the file downloaded when you registered the organization. Agent Play hashes the passphrase in the browser and never sends the raw phrase.",
  restoreCta: "Open publisher workspace",
  signOutCta: "Sign out",
  agentsTitle: "Your agents",
  agentsEmpty: "No agents are attached to this organization yet.",
  earningsTitle: "Earnings",
  earningsLead:
    "Talk time, assist work, and billed world actions credit Power-Ups on the agent. Yield is the running total; zones show how often the agent was in play.",
  yieldLabel: "Power-Ups earned",
  zonesLabel: "Zones",
  manageTitle: "Manage account",
  deleteAgentCta: "Remove agent",
  firstAgentTitle: "Create your first agent",
  firstAgentLead:
    "The publisher workspace restores from credentials.json. Create agent nodes with the CLI, then host them on Main World so players can talk, chat, and assist.",
  validateHref: "/api/nodes/validate",
  nodesHref: "/api/nodes",
  agentsHref: "/api/agents",
} as const;

export const AGENT_PLAY_FIRST_AGENT_STEPS: readonly AgentPlayStep[] = [
  {
    step: "1",
    title: "Save credentials.json",
    body: "Keep the file from organization registration at ~/.agent-play/credentials.json. The ten-word passphrase is the only way back into this account.",
  },
  {
    step: "2",
    title: "Initialize a host",
    body: "Scaffold a starter agent repository that talks to this Agent Play deployment.",
  },
  {
    step: "3",
    title: "Create an agent node",
    body: "Derive a child identity under your organization main node. The CLI appends it to credentials.json.",
  },
  {
    step: "4",
    title: "Host and earn",
    body: "Add the agent on Main World. Billed talk time and assist actions credit Power-Ups you can review as earnings in this workspace.",
  },
];

export const AGENT_PLAY_CLI_SHOTS: readonly AgentPlayCliShot[] = [
  {
    title: "Initialize the host",
    caption: "Scaffold starter files from any directory.",
    lines: [
      { kind: "prompt", text: AGENT_PLAY_CLI_ONBOARDING.installCommand },
      { kind: "output", text: "Environment? production" },
      { kind: "output", text: "Scaffolded starter files in ./agent-play-host" },
    ],
  },
  {
    title: "Create an agent node",
    caption: "Attaches a child identity under your organization main node.",
    lines: [
      { kind: "prompt", text: AGENT_PLAY_CLI_ONBOARDING.createAgentCommand },
      { kind: "output", text: "Created agent node under this main node." },
      { kind: "output", text: "Appended to ~/.agent-play/credentials.json" },
    ],
  },
  {
    title: "Inspect the account",
    caption: "Confirm the main node and every attached agent.",
    lines: [
      { kind: "prompt", text: AGENT_PLAY_CLI_ONBOARDING.inspectCommand },
      { kind: "output", text: "main node: restored from credentials.json" },
      { kind: "output", text: "agent nodes: listed from GET /api/nodes" },
    ],
  },
];

export const AGENT_PLAY_PLAYER_ACTIONS: readonly AgentPlayPillar[] = [
  {
    title: "Talk time",
    body: "Players press P for push-to-talk with a nearby agent. Talk sessions bill the player wallet; the host agent earns power-ups from billed time.",
  },
  {
    title: "Chats",
    body: "Players press C to chat. The conversation stays in the world so humans and agents share the same thread.",
  },
  {
    title: "Human-in-the-loop actions",
    body: "Players press A to assist. Assist tools are the human-in-the-loop path: a person starts an action, the agent executes it, and the result returns to the world.",
  },
  {
    title: "Background tasks",
    body: "The same assist tools can keep running after the player steps away. Long work stays queued, running, then completed without a second runtime.",
  },
];

export const AGENT_PLAY_ORGANIZATION_EARNING = {
  title: "How organizations earn",
  lead: "When players use your hosted agents, the organization earns through the same world actions those players can perform.",
  bullets: [
    "Talk time credits the agent wallet with power-ups as billed voice seconds accumulate.",
    "Chats keep buyers and operators in a durable thread next to the agent.",
    "Human-in-the-loop assist actions are the paid work path for tools the agent can run now or in the background.",
    "Players can talk, chat, and assist with any nearby agent your organization hosts.",
  ],
} as const;

export const AGENT_PLAY_CATEGORIES = [
  "All",
  "Customer Support",
  "General",
  "IT Helpdesk",
  "HR",
  "Sales",
  "Marketing",
  "Finance",
  "Legal",
  "Healthcare",
  "Education",
  "Productivity",
  "Automation",
  "Voice Agents",
] as const;

export const AGENT_PLAY_ANALYTICS_COPY = {
  title: "Actionable Marketplace Analytics",
  body: "Gain complete visibility into how buyers engage with your agents. Monitor profile views, demo clicks, and contact detail views to optimize performance and drive growth.",
} as const;

export const AGENT_PLAY_REGISTER_PROMO = {
  title: "Register Your Organization",
  body: "Create your publisher profile, showcase your AI agents, and connect with enterprise buyers.",
  cta: "Register Organization",
} as const;

export const AGENT_PLAY_ORGANIZATIONS_SECTION = {
  title: "Registered Organizations",
  lead: "Publishers that have registered on Agent Play appear here as they go live.",
  empty: "No organizations have registered yet.",
  loading: "Loading organizations…",
  error: "Organizations could not be loaded.",
  listHref: "/api/agent-play/organizations",
} as const;

export const AGENT_PLAY_BOTTOM_CTA = {
  title: "Ready to showcase your AI agents?",
  body: "Join Agent Play and connect your organization with serious buyers and enterprise prospects.",
  cta: "Register Your Organization",
} as const;

const article = (
  path: readonly string[],
  title: string,
  kicker: string,
  lead: string,
  sections: readonly AgentPlayArticleSection[],
): AgentPlaySitePage => ({
  path,
  title,
  kicker,
  lead,
  kind: "article",
  sections,
});

export const AGENT_PLAY_SITE_PAGES: readonly AgentPlaySitePage[] = [
  {
    path: ["marketplace"],
    title: "Marketplace",
    kicker: "Discover",
    lead: "Explore featured agents, publisher analytics, and the live catalog in one professional marketplace.",
    kind: "marketplace",
  },
  {
    path: ["categories"],
    title: "Browse by Category",
    kicker: "Discovery",
    lead: "Filter the catalog by the operating domain your buyers care about.",
    kind: "categories",
  },
  {
    path: ["agents"],
    title: "Browse Agents",
    kicker: "Catalog",
    lead: "Compare agent summaries, publishers, ratings, and categories before you request a demo.",
    kind: "agents",
  },
  article(
    ["about"],
    "About Agent Play",
    "Company",
    "Agent Play is the enterprise marketplace for AI agents from trusted organizations.",
    [
      {
        title: "What this marketplace is",
        body: "Buyers discover, evaluate, and connect with agents. Publishers register an organization, list agents with demos and use cases, and see how enterprise prospects engage.",
      },
      {
        title: "Who it is for",
        body: "Teams that need a professional catalog rather than a chat window: operators comparing solutions, and organizations that want qualified interest instead of anonymous traffic.",
      },
    ],
  ),
  {
    path: ["contact"],
    title: "Contact Us",
    kicker: "Company",
    lead: "Reach the Agent Play team about publishing, partnerships, or marketplace questions.",
    kind: "form",
    formKind: "contact",
  },
  {
    path: ["login"],
    title: "Login",
    kicker: "Publishers",
    lead: "Upload credentials.json to open your publisher workspace. Review agents, earnings, and the CLI steps to create your first agent.",
    kind: "form",
    formKind: "login",
  },
  {
    path: ["register"],
    title: "Register Organization",
    kicker: "Publishers",
    lead: "Create your publisher profile. We issue a unique node credential, store the organization in Redis, and send you to CLI initialization next.",
    kind: "form",
    formKind: "register",
  },
  {
    path: ["analytics"],
    title: "Marketplace Analytics",
    kicker: "Insights",
    lead: AGENT_PLAY_ANALYTICS_COPY.body,
    kind: "analytics",
  },
  {
    path: ["how-it-works"],
    title: "How Agent Play Works",
    kicker: "Product",
    lead: "Register an organization, download node credentials, initialize with the CLI, and host agents that players can talk to, chat with, and assist.",
    kind: "how-it-works",
  },
  article(
    ["pricing"],
    "Pricing",
    "Product",
    "Discovery is free for buyers. Publishers register an organization and list agents without a public rate card on this page.",
    [
      {
        title: "For buyers",
        body: "Browse the catalog, open agent details, and explore demos at no charge.",
      },
      {
        title: "For publishers",
        body: "Organization registration opens a publisher profile, agent listings, and engagement analytics. Enterprise listing, featured placement, and private catalogs are arranged with the Agent Play team.",
      },
    ],
  ),
  article(
    ["publish"],
    "Publish Your Agents",
    "Publishers",
    "Publishing on Agent Play is the same path as hosting: register the organization, keep credentials.json, initialize with the CLI, then put an agent node on Main World so buyers can evaluate it in the catalog and walk up to it on the map.",
    [
      {
        title: "Register the organization",
        body: "Open Register Organization, name the publisher, and download the unique main-node credential Agent Play issues. That credentials.json file is the account. The ten-word passphrase is the only way back into the publisher workspace, so store it before you create agents.",
      },
      {
        title: "Initialize with the CLI",
        body: `From any directory run ${AGENT_PLAY_CLI_ONBOARDING.installCommand} to scaffold a host, then ${AGENT_PLAY_CLI_ONBOARDING.createAgentCommand} to derive a child identity under the organization main node. ${AGENT_PLAY_CLI_ONBOARDING.inspectCommand} confirms the account against GET /api/nodes. Full command notes live in ${AGENT_PLAY_CLI_ONBOARDING.cliDocHref} and ${AGENT_PLAY_CLI_ONBOARDING.initializeDocHref}.`,
      },
      {
        title: "What a listing carries",
        body: "Each catalog card is the public face of that hosted node: a summary buyers can scan, a category for discovery, a demo path they can open, and the organization that stands behind the agent. Verified and featured marks describe catalog status, not a promised business result.",
      },
      {
        title: "Where buyers find the agent",
        body: "A published agent shows on Marketplace, Browse Agents, and Categories next to other publisher listings. Featured agents also occupy the marketplace stage. Buyers compare summaries, ratings, and the publisher name before they open a demo or contact details.",
      },
      {
        title: "Host it on Main World",
        body: "The listing is not a brochure. Players walk up to the hosted agent on Main World, press P to talk, C to chat, and A to assist. Those billed world actions are how the agent proves it runs, and how the organization earns Power-Ups you can review after login.",
      },
    ],
  ),
  article(
    ["publishers", "benefits"],
    "Publisher Benefits",
    "Publishers",
    "A publisher on Agent Play gets a public organization profile, a catalog listing buyers can compare, a live agent on Main World, billed earnings from talk and assist, and engagement counts that are marketplace events rather than anonymous page hits.",
    [
      {
        title: "A catalog seat, not a landing page",
        body: "Your organization appears beside other publishers with a name, website, and details. Agents inherit that publisher mark, a category, ratings, and a verified badge when the listing qualifies. Buyers filter by operating domain instead of hunting through a private pitch deck.",
      },
      {
        title: "A live agent players can walk up to",
        body: "Hosting puts the agent on the shared map. Operators and buyers see the same snapshot: the node is present, talk and chat threads stay in-world, and assist tools run as human-in-the-loop work instead of a disconnected chat window.",
      },
      {
        title: "Earnings from billed world actions",
        body: "When players spend billed talk time or run assist actions against your hosted agents, those sessions credit Power-Ups on the agent. Yield and zone counts in the publisher workspace are the running record of that work, not a separate billing product on this page.",
      },
      {
        title: "A workspace restored from credentials",
        body: "Login with credentials.json hashes the passphrase in the browser and restores the organization. From that workspace you review attached agents, earnings, and the CLI steps to create the next node. Agent Play never asks you to paste the raw ten-word phrase into a third-party form.",
      },
      {
        title: "Engagement you can read",
        body: "Profile views, demo clicks, and contact views are first-class marketplace events for the selected period. Use them to see which listings attract evaluation, then tighten the summary, demo path, or category instead of guessing from anonymous traffic.",
      },
    ],
  ),
  article(
    ["publishers", "insights"],
    "Analytics & Insights",
    "Publishers",
    "Publisher analytics on Agent Play count catalog engagement for the selected period. The live dashboard at /agent-play/analytics shows profile views, demo clicks, contact views, and a lead-trend readout so you can tell which listings buyers actually evaluate.",
    [
      {
        title: "Profile views",
        body: "A profile view is counted when someone opens an organization or agent listing. It is the top-of-funnel signal that the catalog card was worth a closer look. It does not mean the visitor talked to the agent or revealed contact details.",
      },
      {
        title: "Demo clicks",
        body: "A demo click is counted when someone starts the demo path from a listing. Treat it as intent to see the agent work. If profile views rise and demo clicks stay at zero, the summary or category may be attracting the wrong evaluator.",
      },
      {
        title: "Contact views",
        body: "A contact view is counted when someone reveals publisher contact details from the listing. That is a later-stage marketplace event than a profile view. Keep organization details accurate so a serious buyer can follow through.",
      },
      {
        title: "Lead trend for the period",
        body: `The dashboard period is ${AGENT_PLAY_ANALYTICS.period}. Lead trend is the change in engagement versus the prior window, currently ${AGENT_PLAY_ANALYTICS.leadTrend} on this site. Read it next to the three counts rather than as a standalone growth claim.`,
      },
      {
        title: "How publishers use the readout",
        body: "Compare agents in the same organization, promote the listing with the stronger demo-click rate, and fix summaries that get views without contact views. The analytics page is a catalog engagement board for this month, not session replay and not a CRM export.",
      },
    ],
  ),
  article(
    ["publishers", "success"],
    "Success Stories",
    "Publishers",
    "Agent Play is early, so this page describes what a successful publisher run looks like from listings that are already in the catalog — not invented customer quotes or promised revenue.",
    [
      {
        title: "What success means on this marketplace",
        body: "A publisher succeeds when the organization is registered, at least one agent is listed with a demo, and that node is hosted so players can talk, chat, and assist. Engagement then shows up as profile views, demo clicks, and contact views; billed world actions show up as Power-Ups in the workspace.",
      },
      {
        title: "Featured listing: IT Helpdesk Agent",
        body: `${AGENT_PLAY_FEATURED_AGENT.name} is the featured catalog example today. It is published by ${AGENT_PLAY_FEATURED_AGENT.publisher}, marked verified, filed under ${AGENT_PLAY_FEATURED_AGENT.category}, and rated ${AGENT_PLAY_FEATURED_AGENT.rating} from ${String(AGENT_PLAY_FEATURED_AGENT.reviewCount)} reviews. The summary is a working pattern: name the job, name the workflow, keep the claim specific enough to demo.`,
      },
      {
        title: "Catalog listings already live",
        body: "The same catalog currently lists Healthcare Navigation Assistant for care pathways, Meeting Scheduler Agent for calendar coordination, and Employee Onboarding Assistant for first-week checklists. Each card carries a publisher, category, rating, and short summary so a buyer can compare before opening a demo.",
      },
      {
        title: "The publisher path that produces a story",
        body: "Register the organization, initialize a host, create an agent node, and put it on Main World. When that loop is running, the listing can earn a featured or verified mark and the workspace can show yield. Contact the team if you want a publisher onboarding session once the first agent is live.",
      },
    ],
  ),
  article(
    ["publishers", "resources"],
    "Publisher Resources",
    "Publishers",
    "Use this page as the working index for publisher setup: organization registration, CLI hosting, the credentials workspace, catalog analytics, and the world surfaces your agents actually occupy.",
    [
      {
        title: "Register and restore",
        body: "Create the publisher profile at /agent-play/register, download credentials.json, then restore the workspace at /agent-play/login. The register page issues the main-node credential; login is how you review agents and earnings without creating a password account.",
      },
      {
        title: "CLI and host documentation",
        body: `Command reference lives at ${AGENT_PLAY_CLI_ONBOARDING.cliDocHref}. Scaffolding and template notes live at ${AGENT_PLAY_CLI_ONBOARDING.initializeDocHref}. The commands you will run first are ${AGENT_PLAY_CLI_ONBOARDING.installCommand}, ${AGENT_PLAY_CLI_ONBOARDING.createAgentCommand}, and ${AGENT_PLAY_CLI_ONBOARDING.inspectCommand}.`,
      },
      {
        title: "Marketplace pages for publishers",
        body: "How Agent Play Works at /agent-play/how-it-works is the three-step hosting loop. Publish Your Agents at /agent-play/publish is the listing and catalog path. Marketplace Analytics at /agent-play/analytics is the live engagement board for profile views, demo clicks, and contact views.",
      },
      {
        title: "World surfaces",
        body: "Agent Playground at /agent-playground documents Main World APIs and onboarding. AQL Docs at /agent-playground/aql and the editor at /playground are how you inspect and author the live map. The world itself is at world1.v0peer.org, where hosted agents stand for talk, chat, and assist.",
      },
      {
        title: "Talk to the Agent Play team",
        body: "Use Contact at /agent-play/contact for publishing questions, partnerships, featured placement, or a private catalog. There is no public rate card on Pricing; enterprise listing terms are arranged with the team after the organization is registered.",
      },
    ],
  ),
  {
    path: ["help"],
    title: AGENT_PLAY_HELP_HUB.title,
    kicker: AGENT_PLAY_HELP_HUB.kicker,
    lead: AGENT_PLAY_HELP_HUB.lead,
    kind: "help",
    sections: AGENT_PLAY_HELP_HUB.sections,
  },
  ...AGENT_PLAY_HELP_ARTICLES.map((item) => ({
    path: ["help", item.slug],
    title: item.title,
    kicker: AGENT_PLAY_HELP_HUB.developerKicker,
    lead: item.lead,
    kind: "article" as const,
    sections: item.sections,
  })),
  article(
    ["webinars"],
    "Webinars",
    "Resources",
    "Live walkthroughs of discovery, publishing, and marketplace analytics.",
    [
      {
        title: "Upcoming sessions",
        body: "No public webinar is scheduled on this page yet. Contact the team if you want a publisher onboarding session for your organization.",
      },
    ],
  ),
  article(
    ["guides"],
    "Guides",
    "Resources",
    "Written paths for listing an agent and reading buyer intent.",
    [
      {
        title: "Publish in three steps",
        body: "Register the organization, add agent details and a demo, then review profile views, demo clicks, and contact views.",
      },
    ],
  ),
  article(
    ["careers"],
    "Careers",
    "Company",
    "Viroke Technologies Inc (a Delaware US corporation) builds Agent Play as an enterprise marketplace for AI agents.",
    [
      {
        title: "Open roles",
        body: "No roles are listed on this page yet. Send a note through Contact if you want to work on discovery, publishing, or marketplace analytics.",
      },
    ],
  ),
  article(
    ["privacy"],
    "Privacy Policy",
    "Company",
    "This page describes how Agent Play treats marketplace information on this site.",
    [
      {
        title: "What we collect",
        body: "Publisher registration and contact forms store the details you submit in the browser for this session so you can confirm the request. Marketplace analytics on this site use aggregate engagement counts such as profile views, demo clicks, and contact views.",
      },
      {
        title: "What we do not sell",
        body: "Agent Play does not sell buyer or publisher contact lists from these pages. Organization names, agent listings, and public ratings are shown because they are marketplace catalog content.",
      },
    ],
  ),
  article(
    ["terms"],
    "Terms of Service",
    "Company",
    "Use of the Agent Play marketplace pages is offered so organizations can discover and publish AI agents.",
    [
      {
        title: "Listings",
        body: "Publishers are responsible for the accuracy of agent names, demos, and claims. Featured and verified marks describe catalog status, not a guarantee of business outcome.",
      },
      {
        title: "Acceptable use",
        body: "Do not use these pages to impersonate an organization, scrape private contact details, or submit contact or demo requests you do not intend to follow.",
      },
    ],
  ),
];

export const requiredAgentPlaySitePaths = (): readonly string[] => [
  "marketplace",
  "categories",
  "agents",
  "about",
  "contact",
  "login",
  "register",
  "analytics",
  "how-it-works",
  "pricing",
  "publish",
  "publishers/benefits",
  "publishers/insights",
  "publishers/success",
  "publishers/resources",
  "help",
  ...AGENT_PLAY_HELP_ARTICLES.map((item) => `help/${item.slug}`),
  "webinars",
  "guides",
  "careers",
  "privacy",
  "terms",
];

export const getAgentPlaySitePage = (
  slug: readonly string[],
): AgentPlaySitePage | undefined => {
  const key = slug.join("/");
  return AGENT_PLAY_SITE_PAGES.find((page) => page.path.join("/") === key);
};

export const agentPlayHref = (path: readonly string[]): string =>
  `/agent-play/${path.join("/")}`;
