import { describe, expect, it } from "vitest";

import { AGENT_PLAY_SITE_PAGES, agentPlayHref } from "@/app/agent-play/(site)/agent-play-content";

import { GAME_CABINET_CATALOG } from "@agent-play/sdk";

import {
  AGENT_PLAY_SEO,
  AGENT_PLAY_SEO_FAQ,
  buildAgentPlayBreadcrumbJsonLd,
  buildAgentPlayGamesBreadcrumbJsonLd,
  buildAgentPlayGamesJsonLd,
  buildAgentPlayGamesPageMetadata,
  buildAgentPlayJsonLdGraph,
  buildAgentPlayManifest,
  buildAgentPlayMarketplaceMetadata,
  buildAgentPlayRobots,
  buildAgentPlaySitemap,
  buildAgentPlayRootMetadata,
  buildLlmsTxt,
  listAgentPlayGamesSitemapPaths,
  resolveAgentPlayOrigin,
} from "./agent-play-seo";

const ORIGIN = "https://agent-play.com";

describe("Agent Play origin", () => {
  it("uses the production site when the origin env is empty", () => {
    expect(resolveAgentPlayOrigin({ envValue: undefined })).toBe(ORIGIN);
    expect(resolveAgentPlayOrigin({ envValue: "  " })).toBe(ORIGIN);
  });

  it("strips a trailing slash from a configured origin", () => {
    expect(
      resolveAgentPlayOrigin({ envValue: "https://staging.agent-play.com/" }),
    ).toBe("https://staging.agent-play.com");
  });
});

describe("Agent Play SEO catalog", () => {
  it("keeps the default title and description in search-snippet range", () => {
    expect(AGENT_PLAY_SEO.brandName).toBe("Agent Play");
    expect(AGENT_PLAY_SEO.legalName).toBe(
      "Viroke Technologies Inc (a Delaware US corporation)",
    );
    expect(AGENT_PLAY_SEO.defaultTitle).toContain("Agent Play");
    expect(AGENT_PLAY_SEO.defaultTitle).toMatch(/marketplace/i);
    expect(AGENT_PLAY_SEO.defaultTitle).toMatch(/spatial/i);
    expect(AGENT_PLAY_SEO.defaultTitle.length).toBeGreaterThanOrEqual(40);
    expect(AGENT_PLAY_SEO.defaultTitle.length).toBeLessThanOrEqual(65);
    expect(AGENT_PLAY_SEO.defaultDescription.length).toBeGreaterThanOrEqual(110);
    expect(AGENT_PLAY_SEO.defaultDescription.length).toBeLessThanOrEqual(160);
    expect(AGENT_PLAY_SEO.defaultDescription).toMatch(/Agent Play/);
    expect(AGENT_PLAY_SEO.defaultDescription).toMatch(/agent/i);
  });

  it("covers the search phrases people use to find Agent Play", () => {
    const keywords = AGENT_PLAY_SEO.keywords.map((keyword) => keyword.toLowerCase());
    for (const phrase of [
      "agent play",
      "agent play world",
      "ai agent marketplace",
      "spatial ai",
      "ai agents",
      "host ai agents",
    ]) {
      expect(keywords).toContain(phrase);
    }
  });

  it("answers marketplace questions for rich results", () => {
    const questions = AGENT_PLAY_SEO_FAQ.map((item) => item.question);
    expect(questions).toContain("What is Agent Play?");
    expect(questions).toContain("How do I host AI agents on Agent Play?");
    expect(questions).toContain("How do organizations earn on Agent Play?");
    expect(questions).toContain("How do players interact with agents?");
    for (const item of AGENT_PLAY_SEO_FAQ) {
      expect(item.answer.length).toBeGreaterThan(40);
    }
  });
});

describe("root metadata", () => {
  it("publishes indexable Open Graph, Twitter, and crawler signals", () => {
    const metadata = buildAgentPlayRootMetadata({
      origin: ORIGIN,
      googleSiteVerification: "google-token",
    });

    expect(metadata.metadataBase?.toString()).toBe(`${ORIGIN}/`);
    expect(metadata.title).toEqual({
      default: AGENT_PLAY_SEO.defaultTitle,
      template: "%s | Agent Play",
    });
    expect(metadata.description).toBe(AGENT_PLAY_SEO.defaultDescription);
    expect(metadata.applicationName).toBe("Agent Play");
    expect(metadata.authors).toEqual([
      { name: "Viroke Technologies Inc (a Delaware US corporation)" },
    ]);
    expect(metadata.publisher).toBe(
      "Viroke Technologies Inc (a Delaware US corporation)",
    );
    expect(metadata.alternates).toEqual({ canonical: "/" });
    expect(metadata.robots).toEqual({
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    });
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      locale: "en_US",
      url: "/",
      siteName: "Agent Play",
      title: AGENT_PLAY_SEO.defaultTitle,
      description: AGENT_PLAY_SEO.defaultDescription,
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: AGENT_PLAY_SEO.defaultTitle,
      description: AGENT_PLAY_SEO.defaultDescription,
    });
    expect(metadata.verification).toEqual({ google: "google-token" });
  });

  it("omits verification when no token is configured", () => {
    const metadata = buildAgentPlayRootMetadata({ origin: ORIGIN });
    expect(metadata.verification).toBeUndefined();
  });
});

describe("marketplace page metadata", () => {
  it("points search engines at the marketplace landing as the public catalog", () => {
    const metadata = buildAgentPlayMarketplaceMetadata({ path: [] });

    expect(metadata.title).toEqual({
      absolute: "Agent Play — Enterprise AI Agent Marketplace",
    });
    expect(metadata.description?.length).toBeGreaterThan(40);
    expect(metadata.alternates).toEqual({ canonical: "/agent-play" });
    expect(metadata.openGraph).toMatchObject({
      url: "/agent-play",
      type: "website",
      siteName: "Agent Play",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
    });
  });

  it("gives register and how-it-works their own canonical URLs", () => {
    const register = buildAgentPlayMarketplaceMetadata({
      path: ["register"],
    });
    const howItWorks = buildAgentPlayMarketplaceMetadata({
      path: ["how-it-works"],
    });

    expect(register.title).toEqual({
      absolute: "Register Organization — Agent Play",
    });
    expect(register.alternates).toEqual({ canonical: "/agent-play/register" });
    expect(howItWorks.alternates).toEqual({
      canonical: "/agent-play/how-it-works",
    });
  });

  it("falls back to the brand title when the slug is unknown", () => {
    const metadata = buildAgentPlayMarketplaceMetadata({
      path: ["missing-page"],
    });
    expect(metadata.title).toBe("Agent Play");
    expect(metadata.alternates).toBeUndefined();
  });
});

describe("sitemap", () => {
  it("lists the world, marketplace, and every public Agent Play page", () => {
    const entries = buildAgentPlaySitemap({
      origin: ORIGIN,
      now: new Date("2026-08-19T00:00:00.000Z"),
      blogSlugs: ["spatial-ai-world"],
      docRelativePaths: ["README.md", "cli.md", "guides/hosting.md"],
    });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${ORIGIN}/`);
    expect(urls).toContain(`${ORIGIN}/agent-play`);
    expect(urls).toContain(`${ORIGIN}/blog`);
    expect(urls).toContain(`${ORIGIN}/blog/spatial-ai-world`);
    expect(urls).toContain(`${ORIGIN}/doc`);
    expect(urls).toContain(`${ORIGIN}/doc/cli`);
    expect(urls).toContain(`${ORIGIN}/doc/guides/hosting`);
    expect(urls).toContain(`${ORIGIN}/stats`);
    expect(urls).toContain(`${ORIGIN}/scanner`);
    expect(urls).toContain(`${ORIGIN}/agent-play-p2a-implementation`);
    expect(urls).toContain(`${ORIGIN}/agent-playground`);
    expect(urls).toContain(`${ORIGIN}/agent-playground/aql`);
    expect(urls).toContain(`${ORIGIN}/games`);
    expect(urls).toContain(`${ORIGIN}/games/units`);
    expect(urls).toContain(`${ORIGIN}/games/hidden-gems`);

    for (const page of AGENT_PLAY_SITE_PAGES) {
      expect(urls).toContain(`${ORIGIN}${agentPlayHref(page.path)}`);
    }

    const marketplace = entries.find((entry) => entry.url === `${ORIGIN}/agent-play`);
    expect(marketplace?.priority).toBe(1);
    expect(marketplace?.changeFrequency).toBe("weekly");
    expect(marketplace?.lastModified).toEqual(new Date("2026-08-19T00:00:00.000Z"));
  });

  it("keeps private and duplicate surfaces out of the sitemap", () => {
    const urls = buildAgentPlaySitemap({ origin: ORIGIN }).map((entry) => entry.url);

    expect(urls.some((url) => url.includes("/api/"))).toBe(false);
    expect(urls.some((url) => url.includes("/platform"))).toBe(false);
    expect(urls.some((url) => url.includes("/sanity"))).toBe(false);
    expect(urls).not.toContain(`${ORIGIN}/agent-play/watch`);
  });
});

describe("robots", () => {
  it("invites search and AI crawlers while blocking private apps", () => {
    const robots = buildAgentPlayRobots({ origin: ORIGIN });
    const star = robots.rules.find((rule) => rule.userAgent === "*");

    expect(star).toMatchObject({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/platform/", "/sanity/", "/agent-play/watch"],
    });
    expect(robots.sitemap).toBe(`${ORIGIN}/sitemap.xml`);
    expect(robots.host).toBe(ORIGIN);

    const agents = robots.rules.map((rule) => rule.userAgent);
    for (const crawler of [
      "Googlebot",
      "Bingbot",
      "GPTBot",
      "ChatGPT-User",
      "ClaudeBot",
      "PerplexityBot",
      "Google-Extended",
      "Applebot",
      "DuckDuckBot",
    ]) {
      expect(agents).toContain(crawler);
    }
  });
});

describe("JSON-LD", () => {
  it("describes the organization, website, product, and FAQ", () => {
    const graph = buildAgentPlayJsonLdGraph({ origin: ORIGIN });
    const types = graph["@graph"].map((node) => node["@type"]);

    expect(graph["@context"]).toBe("https://schema.org");
    expect(types).toEqual([
      "Organization",
      "WebSite",
      "SoftwareApplication",
      "FAQPage",
    ]);

    const organization = graph["@graph"][0];
    expect(organization).toMatchObject({
      "@type": "Organization",
      name: "Agent Play",
      legalName: "Viroke Technologies Inc (a Delaware US corporation)",
      url: ORIGIN,
      sameAs: ["https://github.com/wilforlan/agent-play"],
    });

    const website = graph["@graph"][1];
    expect(website).toMatchObject({
      "@type": "WebSite",
      name: "Agent Play",
      url: ORIGIN,
    });

    const software = graph["@graph"][2];
    expect(software).toMatchObject({
      "@type": "SoftwareApplication",
      name: "Agent Play",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
    });

    const faq = graph["@graph"][3];
    expect(faq["@type"]).toBe("FAQPage");
    expect(Array.isArray(faq.mainEntity)).toBe(true);
    expect((faq.mainEntity as unknown[]).length).toBe(AGENT_PLAY_SEO_FAQ.length);
  });

  it("builds breadcrumbs for marketplace subpages", () => {
    const breadcrumbs = buildAgentPlayBreadcrumbJsonLd({
      origin: ORIGIN,
      path: ["register"],
    });

    expect(breadcrumbs["@type"]).toBe("BreadcrumbList");
    expect(breadcrumbs.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Agent Play",
        item: `${ORIGIN}/agent-play`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Register Organization",
        item: `${ORIGIN}/agent-play/register`,
      },
    ]);
  });
});

describe("llms.txt and web app manifest", () => {
  it("lists the public Agent Play destinations for AI search", () => {
    const text = buildLlmsTxt({ origin: ORIGIN });

    expect(text).toContain("# Agent Play");
    expect(text).toContain(`${ORIGIN}/agent-play`);
    expect(text).toContain(`${ORIGIN}/agent-play/register`);
    expect(text).toContain(`${ORIGIN}/blog`);
    expect(text).toContain(`${ORIGIN}/doc`);
    expect(text).toContain(`${ORIGIN}/agent-playground`);
    expect(text).toContain(`${ORIGIN}/agent-playground/aql`);
    expect(text).toContain(`${ORIGIN}/games`);
    expect(text).toContain(`${ORIGIN}/games/units`);
    expect(text).toContain("Agent Play Games");
    expect(text).toContain("https://agent-play.com");
    expect(text).toContain("world1.v0peer.org");
    expect(text).not.toContain("/platform");
    expect(text).not.toContain("/agent-play/watch");
  });

  it("lists every Agent Play Games destination for AI search", () => {
    const text = buildLlmsTxt({ origin: ORIGIN });
    for (const cabinet of GAME_CABINET_CATALOG) {
      expect(text).toContain(`${ORIGIN}/games/${cabinet.gameId}`);
    }
  });

  it("names the installable web app Agent Play", () => {
    const manifest = buildAgentPlayManifest();
    expect(manifest.name).toBe("Agent Play World");
    expect(manifest.short_name).toBe("Agent Play");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
  });
});

describe("Agent Play Games SEO", () => {
  it("lists the hub, units page, and every cabinet path", () => {
    const paths = listAgentPlayGamesSitemapPaths();
    expect(paths).toContain("/games");
    expect(paths).toContain("/games/units");
    for (const cabinet of GAME_CABINET_CATALOG) {
      expect(paths).toContain(`/games/${cabinet.gameId}`);
    }
  });

  it("gives the hub and units pages indexable metadata", () => {
    const hub = buildAgentPlayGamesPageMetadata({ slug: [] });
    const units = buildAgentPlayGamesPageMetadata({ slug: ["units"] });

    expect(hub.title).toEqual({
      absolute: expect.stringContaining("Agent Play Games"),
    });
    expect(hub.alternates).toEqual({ canonical: "/games" });
    expect(units.alternates).toEqual({ canonical: "/games/units" });
    expect(units.description).toMatch(/APU|APW/i);
  });

  it("gives each cabinet its own canonical URL", () => {
    const metadata = buildAgentPlayGamesPageMetadata({
      slug: ["hidden-gems"],
    });
    expect(metadata.alternates).toEqual({ canonical: "/games/hidden-gems" });
    expect(metadata.title).toEqual({
      absolute: expect.stringContaining("Hidden Gems"),
    });
  });

  it("falls back when the game slug is unknown", () => {
    const metadata = buildAgentPlayGamesPageMetadata({
      slug: ["missing-cabinet"],
    });
    expect(metadata.title).toBe("Agent Play Games");
    expect(metadata.alternates).toBeUndefined();
  });

  it("emits VideoGame JSON-LD, FAQ, and breadcrumbs for a cabinet", () => {
    const jsonLd = buildAgentPlayGamesJsonLd({
      origin: ORIGIN,
      slug: ["hidden-gems"],
    });
    const types = jsonLd["@graph"].map((node) => node["@type"]);
    expect(types).toContain("VideoGame");
    expect(types).toContain("FAQPage");
    expect(types).toContain("BreadcrumbList");

    const game = jsonLd["@graph"].find((node) => node["@type"] === "VideoGame");
    expect(game).toMatchObject({
      name: "Hidden Gems",
      url: `${ORIGIN}/games/hidden-gems`,
    });

    const crumbs = buildAgentPlayGamesBreadcrumbJsonLd({
      origin: ORIGIN,
      slug: ["hidden-gems"],
    });
    expect(crumbs.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Agent Play",
        item: `${ORIGIN}/agent-play`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Agent Play Games",
        item: `${ORIGIN}/games`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Hidden Gems",
        item: `${ORIGIN}/games/hidden-gems`,
      },
    ]);
  });
});
