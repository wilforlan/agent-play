import type { Metadata, MetadataRoute } from "next";
import { z } from "zod";

import {
  AGENT_PLAY_BRAND,
  AGENT_PLAY_HERO,
  AGENT_PLAY_SITE_PAGES,
  agentPlayHref,
  getAgentPlaySitePage,
} from "@/app/agent-play/(site)/agent-play-content";
import { ogImageSize } from "@/app/og-image-meta";
import { relativeMdToUrlSlugSegments } from "@/lib/docs/slug-url";

const DEFAULT_ORIGIN = "https://agent-play.com";
const GITHUB_URL = "https://github.com/wilforlan/agent-play";
const TITLE_TEMPLATE = "%s | Agent Play";

const AgentPlaySeoFaqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(40),
});

const AgentPlaySeoSchema = z.object({
  brandName: z.literal("Agent Play"),
  legalName: z.string().min(1),
  defaultTitle: z.string().min(40).max(65),
  defaultDescription: z.string().min(110).max(160),
  keywords: z.array(z.string().min(1)).min(8),
  githubUrl: z.literal(GITHUB_URL),
  logoPath: z.literal("/agent-play-logo.png"),
  ogImagePath: z.literal("/opengraph-image"),
});

export const AGENT_PLAY_SEO = AgentPlaySeoSchema.parse({
  brandName: "Agent Play",
  legalName: "Viroke Technologies Inc (a Delaware US corporation)",
  defaultTitle: "Agent Play — Spatial AI Playground and Agent Marketplace",
  defaultDescription:
    "Discover, host, and play with AI agents in Agent Play — a spatial playground and enterprise marketplace where humans and agents share one live world.",
  keywords: [
    "Agent Play",
    "Agent Play World",
    "AI agent marketplace",
    "spatial AI",
    "AI agents",
    "host AI agents",
    "spatial AI playground",
    "enterprise AI agents",
    "human in the loop agents",
    "Viroke Technologies",
  ],
  githubUrl: GITHUB_URL,
  logoPath: "/agent-play-logo.png",
  ogImagePath: "/opengraph-image",
});

export const AGENT_PLAY_SEO_FAQ = z.array(AgentPlaySeoFaqItemSchema).parse([
  {
    question: "What is Agent Play?",
    answer:
      "Agent Play is a spatial AI playground and enterprise marketplace where humans and AI agents share one live world. Discover, host, and play with agents from trusted organizations.",
  },
  {
    question: "How do I host AI agents on Agent Play?",
    answer:
      "Register an organization to receive a unique node credential, initialize with the agent-play CLI, then host agents that players can talk to, chat with, and assist.",
  },
  {
    question: "How do organizations earn on Agent Play?",
    answer:
      "When players use hosted agents, organizations earn through talk time that credits agent wallets, chats, and human-in-the-loop assist actions that can continue as background tasks.",
  },
  {
    question: "How do players interact with agents?",
    answer:
      "Players walk up to nearby agents to talk with push-to-talk, chat in a shared thread, and assist with human-in-the-loop tools that can keep running in the background.",
  },
]);

const SEARCH_CRAWLERS = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot",
  "DuckDuckBot",
] as const;

const PRIVATE_PATH_PREFIXES = [
  "/api/",
  "/platform/",
  "/sanity/",
  "/agent-play/watch",
] as const;

type ResolveAgentPlayOriginOptions = {
  envValue?: string;
};

export const resolveAgentPlayOrigin = (
  options: ResolveAgentPlayOriginOptions = {},
): string => {
  const trimmed = options.envValue?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed.replace(/\/$/, "");
  }
  return DEFAULT_ORIGIN;
};

const ogImage = {
  url: AGENT_PLAY_SEO.ogImagePath,
  width: ogImageSize.width,
  height: ogImageSize.height,
  alt: AGENT_PLAY_SEO.defaultTitle,
};

type BuildAgentPlayRootMetadataOptions = {
  origin: string;
  googleSiteVerification?: string;
};

export const buildAgentPlayRootMetadata = (
  options: BuildAgentPlayRootMetadataOptions,
): Metadata => {
  const verificationToken = options.googleSiteVerification?.trim();

  return {
    metadataBase: new URL(options.origin),
    title: {
      default: AGENT_PLAY_SEO.defaultTitle,
      template: TITLE_TEMPLATE,
    },
    description: AGENT_PLAY_SEO.defaultDescription,
    applicationName: AGENT_PLAY_SEO.brandName,
    keywords: AGENT_PLAY_SEO.keywords,
    authors: [{ name: AGENT_PLAY_SEO.legalName }],
    creator: AGENT_PLAY_SEO.brandName,
    publisher: AGENT_PLAY_SEO.legalName,
    category: "technology",
    alternates: {
      canonical: "/",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "/",
      siteName: AGENT_PLAY_SEO.brandName,
      title: AGENT_PLAY_SEO.defaultTitle,
      description: AGENT_PLAY_SEO.defaultDescription,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: AGENT_PLAY_SEO.defaultTitle,
      description: AGENT_PLAY_SEO.defaultDescription,
      images: [AGENT_PLAY_SEO.ogImagePath],
    },
    icons: {
      icon: [{ url: AGENT_PLAY_SEO.logoPath, type: "image/png" }],
      apple: [{ url: AGENT_PLAY_SEO.logoPath, type: "image/png" }],
    },
    ...(verificationToken
      ? { verification: { google: verificationToken } }
      : {}),
  };
};

type BuildPublicPageMetadataOptions = {
  title: string;
  description: string;
  path: string;
};

export const buildPublicPageMetadata = (
  options: BuildPublicPageMetadataOptions,
): Metadata => {
  const { title, description, path } = options;
  const absoluteTitle = title.includes(AGENT_PLAY_SEO.brandName)
    ? title
    : `${title} | ${AGENT_PLAY_SEO.brandName}`;

  return {
    title: {
      absolute: absoluteTitle,
    },
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: path,
      siteName: AGENT_PLAY_SEO.brandName,
      title: absoluteTitle,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: absoluteTitle,
      description,
      images: [AGENT_PLAY_SEO.ogImagePath],
    },
  };
};

type BuildAgentPlayMarketplaceMetadataOptions = {
  path: readonly string[];
};

export const buildAgentPlayMarketplaceMetadata = (
  options: BuildAgentPlayMarketplaceMetadataOptions,
): Metadata => {
  if (options.path.length === 0) {
    return buildPublicPageMetadata({
      title: `${AGENT_PLAY_BRAND.name} — ${AGENT_PLAY_HERO.kicker}`,
      description: AGENT_PLAY_SEO.defaultDescription,
      path: "/agent-play",
    });
  }

  const page = getAgentPlaySitePage([...options.path]);
  if (page === undefined) {
    return { title: AGENT_PLAY_BRAND.name };
  }

  return buildPublicPageMetadata({
    title: `${page.title} — ${AGENT_PLAY_BRAND.name}`,
    description: page.lead,
    path: agentPlayHref(page.path),
  });
};

type SitemapEntry = MetadataRoute.Sitemap[number];

type BuildAgentPlaySitemapOptions = {
  origin: string;
  now?: Date;
  blogSlugs?: readonly string[];
  docRelativePaths?: readonly string[];
};

const sitemapEntry = (options: {
  origin: string;
  path: string;
  lastModified: Date;
  changeFrequency: NonNullable<SitemapEntry["changeFrequency"]>;
  priority: number;
}): SitemapEntry => {
  const { origin, path, lastModified, changeFrequency, priority } = options;
  return {
    url: `${origin}${path}`,
    lastModified,
    changeFrequency,
    priority,
  };
};

const docPathFromRelativeMd = (relativeMd: string): string => {
  const segments = relativeMdToUrlSlugSegments(relativeMd);
  if (segments.length === 0) {
    return "/doc";
  }
  return `/doc/${segments.join("/")}`;
};

export const buildAgentPlaySitemap = (
  options: BuildAgentPlaySitemapOptions,
): MetadataRoute.Sitemap => {
  const lastModified = options.now ?? new Date();
  const origin = options.origin;
  const entries: SitemapEntry[] = [
    sitemapEntry({
      origin,
      path: "/",
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    }),
    sitemapEntry({
      origin,
      path: "/agent-play",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    }),
    sitemapEntry({
      origin,
      path: "/blog",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
    sitemapEntry({
      origin,
      path: "/doc",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
    sitemapEntry({
      origin,
      path: "/stats",
      lastModified,
      changeFrequency: "daily",
      priority: 0.4,
    }),
    sitemapEntry({
      origin,
      path: "/scanner",
      lastModified,
      changeFrequency: "daily",
      priority: 0.4,
    }),
    sitemapEntry({
      origin,
      path: "/agent-play-p2a-implementation",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    }),
    sitemapEntry({
      origin,
      path: "/agent-playground",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
    sitemapEntry({
      origin,
      path: "/agent-playground/aql",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
    ...AGENT_PLAY_SITE_PAGES.map((page) =>
      sitemapEntry({
        origin,
        path: agentPlayHref(page.path),
        lastModified,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
    ...(options.blogSlugs ?? []).map((slug) =>
      sitemapEntry({
        origin,
        path: `/blog/${slug}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.6,
      }),
    ),
    ...(options.docRelativePaths ?? []).map((relativeMd) =>
      sitemapEntry({
        origin,
        path: docPathFromRelativeMd(relativeMd),
        lastModified,
        changeFrequency: "monthly",
        priority: 0.6,
      }),
    ),
  ];

  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
};

type BuildAgentPlayRobotsOptions = {
  origin: string;
};

export type AgentPlayRobotRule = {
  userAgent: string;
  allow: string;
  disallow?: string[];
};

export type AgentPlayRobots = {
  rules: AgentPlayRobotRule[];
  sitemap: string;
  host: string;
};

export const buildAgentPlayRobots = (
  options: BuildAgentPlayRobotsOptions,
): AgentPlayRobots => {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...PRIVATE_PATH_PREFIXES],
      },
      ...SEARCH_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
      })),
    ],
    sitemap: `${options.origin}/sitemap.xml`,
    host: options.origin,
  };
};

export type JsonLdNode = {
  "@type": string;
  [key: string]: unknown;
};

export type JsonLdGraph = {
  "@context": "https://schema.org";
  "@graph": JsonLdNode[];
};

type BuildAgentPlayJsonLdGraphOptions = {
  origin: string;
};

export const buildAgentPlayJsonLdGraph = (
  options: BuildAgentPlayJsonLdGraphOptions,
): JsonLdGraph => {
  const { origin } = options;
  const organizationId = `${origin}/#organization`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: AGENT_PLAY_SEO.brandName,
        legalName: AGENT_PLAY_SEO.legalName,
        url: origin,
        logo: `${origin}${AGENT_PLAY_SEO.logoPath}`,
        sameAs: [AGENT_PLAY_SEO.githubUrl],
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: AGENT_PLAY_SEO.brandName,
        url: origin,
        description: AGENT_PLAY_SEO.defaultDescription,
        inLanguage: "en",
        publisher: { "@id": organizationId },
      },
      {
        "@type": "SoftwareApplication",
        name: AGENT_PLAY_SEO.brandName,
        url: `${origin}/agent-play`,
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description: AGENT_PLAY_SEO.defaultDescription,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        publisher: { "@id": organizationId },
      },
      {
        "@type": "FAQPage",
        mainEntity: AGENT_PLAY_SEO_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };
};

type BuildAgentPlayBreadcrumbJsonLdOptions = {
  origin: string;
  path: readonly string[];
};

export type BreadcrumbJsonLd = {
  "@type": "BreadcrumbList";
  itemListElement: readonly {
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }[];
};

export const buildAgentPlayBreadcrumbJsonLd = (
  options: BuildAgentPlayBreadcrumbJsonLdOptions,
): BreadcrumbJsonLd => {
  const page = getAgentPlaySitePage([...options.path]);
  const items = [
    {
      "@type": "ListItem" as const,
      position: 1,
      name: AGENT_PLAY_SEO.brandName,
      item: `${options.origin}/agent-play`,
    },
    ...(page
      ? [
          {
            "@type": "ListItem" as const,
            position: 2,
            name: page.title,
            item: `${options.origin}${agentPlayHref(page.path)}`,
          },
        ]
      : []),
  ];

  return {
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
};

type BuildLlmsTxtOptions = {
  origin: string;
};

export const buildLlmsTxt = (options: BuildLlmsTxtOptions): string => {
  const { origin } = options;
  const marketplaceLinks = AGENT_PLAY_SITE_PAGES.map(
    (page) => `- [${page.title}](${origin}${agentPlayHref(page.path)}): ${page.lead}`,
  );

  return [
    `# ${AGENT_PLAY_SEO.brandName}`,
    "",
    `> ${AGENT_PLAY_SEO.defaultDescription}`,
    "",
    `${AGENT_PLAY_SEO.brandName} is operated by ${AGENT_PLAY_SEO.legalName}. The live spatial world is at ${origin}/. The public marketplace, publisher onboarding, documentation, and stories are the pages search and AI systems should cite.`,
    "",
    "## Pages",
    "",
    `- [Agent Play World](${origin}/): Live spatial playground where humans and AI agents share one map.`,
    `- [Marketplace](${origin}/agent-play): ${AGENT_PLAY_HERO.subtitle}`,
    ...marketplaceLinks,
    `- [Blog](${origin}/blog): Product stories and announcements.`,
    `- [Documentation](${origin}/doc): CLI, hosting, and platform guides.`,
    `- [Agent Playground](${origin}/agent-playground): Main World for AI agents at https://world1.v0peer.org, plus AQL docs and the live playground.`,
    `- [AQL Docs](${origin}/agent-playground/aql): Agent Query Language for inspecting and authoring Main World.`,
    "",
    "## Optional",
    "",
    `- [GitHub](${AGENT_PLAY_SEO.githubUrl})`,
    "",
  ].join("\n");
};

export const buildAgentPlayManifest = (): MetadataRoute.Manifest => {
  return {
    name: "Agent Play World",
    short_name: AGENT_PLAY_SEO.brandName,
    description: AGENT_PLAY_SEO.defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      {
        src: AGENT_PLAY_SEO.logoPath,
        sizes: "any",
        type: "image/png",
      },
    ],
  };
};

export const buildNoIndexMetadata = (options: {
  title: string;
  description?: string;
}): Metadata => {
  return {
    title: options.title,
    description: options.description,
    robots: {
      index: false,
      follow: false,
    },
  };
};

export const serializeJsonLd = (value: unknown): string => {
  return JSON.stringify(value).replace(/</g, "\\u003c");
};
