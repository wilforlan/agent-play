import { MAIN_WORLD_ORIGIN } from "@/lib/main-world";

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
  { label: "Interest Requests", value: "0" },
];

export const AGENT_PLAY_ANALYTICS = {
  period: "This Month",
  leadTrend: "+0%",
  metrics: [
    { label: "Profile Views", value: "52" },
    { label: "Demo Clicks", value: "0" },
    { label: "Contact Views", value: "0" },
    { label: "Interest Requests", value: "0" },
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
  installTitle: "Install and initialize",
  hostingTitle: "Host your agents",
} as const;

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
  body: "Gain complete visibility into how buyers engage with your agents. Monitor profile views, demo clicks, contact detail views, and interest requests to optimize performance and drive growth.",
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
    lead: "Sign in to your publisher workspace to manage agents, demos, and interest requests.",
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
    "Add your AI agents, demos, details, and use cases so enterprise buyers can evaluate them in one place.",
    [
      {
        title: "What you publish",
        body: "Each listing carries a summary, category, demo path, and the organization that stands behind it.",
      },
      {
        title: "What buyers see",
        body: "Ratings, reviews, and verified publisher marks help buyers compare solutions before they request a conversation.",
      },
    ],
  ),
  article(
    ["publishers", "benefits"],
    "Publisher Benefits",
    "Publishers",
    "A professional profile, a shared catalog, and conversion tracking that is built for enterprise buyers.",
    [
      {
        title: "Credibility in minutes",
        body: "Onboard your company, publish agents, and appear beside other trusted organizations.",
      },
      {
        title: "Qualified interest",
        body: "Interest requests, contact views, and demo clicks are first-class marketplace events — not anonymous page hits.",
      },
    ],
  ),
  article(
    ["publishers", "insights"],
    "Analytics & Insights",
    "Publishers",
    AGENT_PLAY_ANALYTICS_COPY.body,
    [
      {
        title: "What you can measure",
        body: "Profile views, demo clicks, contact detail views, and interest requests, with a lead-trend readout for the selected period.",
        bullets: [...AGENT_PLAY_ANALYTICS.insights],
      },
    ],
  ),
  article(
    ["publishers", "success"],
    "Success Stories",
    "Publishers",
    "Publisher stories appear here as organizations go live on the marketplace.",
    [
      {
        title: "Early catalog",
        body: "The catalog currently lists agents such as IT Helpdesk Agent, Healthcare Navigation Assistant, Meeting Scheduler Agent, and Employee Onboarding Assistant.",
      },
    ],
  ),
  article(
    ["publishers", "resources"],
    "Publisher Resources",
    "Publishers",
    "Practical material for teams that want to list agents and read marketplace engagement.",
    [
      {
        title: "Start here",
        body: "Register the organization, publish at least one agent with a demo, then watch profile views and interest requests in analytics.",
      },
    ],
  ),
  article(
    ["help"],
    "Help Center",
    "Resources",
    "Short answers for buyers and publishers using the Agent Play marketplace.",
    [
      {
        title: "Buyers",
        body: "Use Marketplace or Browse Agents to open a listing, then request a demo or contact the publisher from the agent page.",
      },
      {
        title: "Publishers",
        body: "Register an organization, sign in, and add agents with category, summary, and demo details. Analytics report engagement for the current month.",
      },
    ],
  ),
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
        body: "Register the organization, add agent details and a demo, then review profile views, demo clicks, and interest requests.",
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
        body: "Publisher registration and contact forms store the details you submit in the browser for this session so you can confirm the request. Marketplace analytics on this site use aggregate engagement counts such as profile views, demo clicks, contact views, and interest requests.",
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
        body: "Do not use these pages to impersonate an organization, scrape private contact details, or submit interest requests you do not intend to follow.",
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
