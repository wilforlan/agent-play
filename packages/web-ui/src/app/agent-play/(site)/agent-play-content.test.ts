import { describe, expect, it } from "vitest";

import { OCCUPANCY_ORIGIN } from "./agent-play-help-content";
import {
  AGENT_PLAY_ANALYTICS,
  AGENT_PLAY_ANALYTICS_COPY,
  AGENT_PLAY_BRAND,
  AGENT_PLAY_CATALOG,
  AGENT_PLAY_CATEGORIES,
  AGENT_PLAY_CLI_ONBOARDING,
  AGENT_PLAY_CLI_SHOTS,
  AGENT_PLAY_FEATURED_AGENT,
  AGENT_PLAY_FIRST_AGENT_STEPS,
  AGENT_PLAY_FOOTER_COLUMNS,
  AGENT_PLAY_HERO,
  AGENT_PLAY_HOW_IT_WORKS,
  AGENT_PLAY_LOGIN_WORKSPACE,
  AGENT_PLAY_MARKETPLACE_STATS,
  AGENT_PLAY_NAV,
  AGENT_PLAY_NAV_SECTIONS,
  AGENT_PLAY_ORGANIZATION_EARNING,
  AGENT_PLAY_ORGANIZATIONS_SECTION,
  AGENT_PLAY_PILLARS,
  AGENT_PLAY_PLAYER_ACTIONS,
  AGENT_PLAY_SITE_PAGES,
  AGENT_PLAY_TOP_AGENTS,
  AGENT_PLAY_WORLD_NAV,
  AGENT_PLAY_WORLD_SURFACES,
  getAgentPlaySitePage,
  requiredAgentPlaySitePaths,
} from "./agent-play-content";

describe("Agent Play marketplace site content", () => {
  it("brands the parent landing as Agent Play", () => {
    expect(AGENT_PLAY_BRAND.name).toBe("Agent Play");
    expect("byline" in AGENT_PLAY_BRAND).toBe(false);
    expect(AGENT_PLAY_HERO.kicker).toBe("Enterprise AI Agent Marketplace");
    expect(AGENT_PLAY_HERO.title).toBe(
      "The Enterprise Marketplace for AI Agents",
    );
  });

  it("exposes header destinations as first-class subpages", () => {
    expect(AGENT_PLAY_NAV.map((item) => item.label)).toEqual([
      "Marketplace",
      "Categories",
      "Browse Agents",
      "About",
      "Contact",
      "Login",
      "Register Organization",
    ]);
    expect(AGENT_PLAY_NAV.map((item) => item.href)).toEqual([
      "/agent-play/marketplace",
      "/agent-play/categories",
      "/agent-play/agents",
      "/agent-play/about",
      "/agent-play/contact",
      "/agent-play/login",
      "/agent-play/register",
    ]);
  });

  it("sections the header into marketplace and worlds destinations", () => {
    expect(AGENT_PLAY_NAV_SECTIONS.map((section) => section.id)).toEqual([
      "marketplace",
      "worlds",
    ]);
    expect(AGENT_PLAY_NAV_SECTIONS[0]?.items).toEqual(AGENT_PLAY_NAV);
    expect(AGENT_PLAY_NAV_SECTIONS[1]?.label).toBe("Worlds");
    expect(AGENT_PLAY_NAV_SECTIONS[1]?.items).toEqual(AGENT_PLAY_WORLD_NAV);
    expect(AGENT_PLAY_WORLD_NAV.map((item) => item.label)).toEqual([
      "Playground",
      "Agent Playground",
      "Agent Play Games",
      "Main World",
    ]);
    expect(AGENT_PLAY_WORLD_NAV.map((item) => item.href)).toEqual([
      "/playground",
      "/agent-playground",
      "/games",
      OCCUPANCY_ORIGIN,
    ]);
  });

  it("describes worlds surfaces for the landing section", () => {
    expect(AGENT_PLAY_WORLD_SURFACES.map((surface) => surface.label)).toEqual([
      "Playground",
      "Agent Playground",
      "Agent Play Games",
      "Main World",
    ]);
    expect(
      AGENT_PLAY_WORLD_SURFACES.every(
        (surface) => surface.title.length > 0 && surface.body.length > 20,
      ),
    ).toBe(true);
    expect(AGENT_PLAY_WORLD_SURFACES.map((surface) => surface.href)).toEqual(
      AGENT_PLAY_WORLD_NAV.map((item) => item.href),
    );
  });

  it("covers every required marketplace subpage", () => {
    const paths = new Set(
      AGENT_PLAY_SITE_PAGES.map((page) => page.path.join("/")),
    );
    for (const required of requiredAgentPlaySitePaths()) {
      expect(paths.has(required)).toBe(true);
      expect(getAgentPlaySitePage(required.split("/"))).toBeDefined();
    }
  });

  it("keeps footer columns aligned with product, publishers, resources, and company", () => {
    expect(AGENT_PLAY_FOOTER_COLUMNS.map((column) => column.title)).toEqual([
      "Product",
      "For Publishers",
      "Resources",
      "Company",
    ]);
    const labels = AGENT_PLAY_FOOTER_COLUMNS.flatMap((column) =>
      column.links.map((link) => link.label),
    );
    expect(labels).toEqual([
      "Marketplace",
      "Categories",
      "Analytics",
      "How It Works",
      "Pricing",
      "Publish Your Agents",
      "Publisher Benefits",
      "Analytics & Insights",
      "Success Stories",
      "Publisher Resources",
      "Blog",
      "Agent Play Games",
      "Documentation",
      "Agent Playground",
      "AQL Docs",
      "Help Center",
      "Webinars",
      "Guides",
      "About Agent Play",
      "Careers",
      "Contact Us",
      "Privacy Policy",
      "Terms of Service",
    ]);
  });

  it("populates For Publishers pages with page-specific copy", () => {
    const publisherColumn = AGENT_PLAY_FOOTER_COLUMNS.find(
      (column) => column.title === "For Publishers",
    );
    expect(publisherColumn).toBeDefined();
    if (publisherColumn === undefined) {
      throw new Error("For Publishers footer column missing");
    }

    const publisherPages = publisherColumn.links.map((link) => {
      const page = getAgentPlaySitePage(
        link.href.replace("/agent-play/", "").split("/"),
      );
      expect(page).toBeDefined();
      if (page === undefined) {
        throw new Error(`missing publisher page for ${link.href}`);
      }
      return page;
    });

    expect(publisherPages).toHaveLength(5);
    expect(new Set(publisherPages.map((page) => page.lead)).size).toBe(5);

    for (const page of publisherPages) {
      expect(page.kind).toBe("article");
      expect(page.kicker).toBe("Publishers");
      expect(page.lead.length).toBeGreaterThan(80);
      expect(page.sections?.length).toBeGreaterThanOrEqual(4);
      for (const section of page.sections ?? []) {
        expect(section.body.length).toBeGreaterThan(120);
      }
    }

    const publish = getAgentPlaySitePage(["publish"]);
    const publishCopy = JSON.stringify(publish).toLowerCase();
    expect(publish?.sections?.map((section) => section.title)).toEqual([
      "Register the organization",
      "Initialize with the CLI",
      "What a listing carries",
      "Where buyers find the agent",
      "Host it on Main World",
    ]);
    expect(publishCopy).toContain("credentials.json");
    expect(publishCopy).toContain(AGENT_PLAY_CLI_ONBOARDING.installCommand);
    expect(publishCopy).toContain(AGENT_PLAY_CLI_ONBOARDING.createAgentCommand);
    expect(publishCopy).toContain("summary");
    expect(publishCopy).toContain("category");
    expect(publishCopy).toContain("demo");

    const benefits = getAgentPlaySitePage(["publishers", "benefits"]);
    const benefitsCopy = JSON.stringify(benefits).toLowerCase();
    expect(benefits?.sections?.map((section) => section.title)).toEqual([
      "A catalog seat, not a landing page",
      "A live agent players can walk up to",
      "Earnings from billed world actions",
      "A workspace restored from credentials",
      "Engagement you can read",
    ]);
    expect(benefitsCopy).toContain("talk");
    expect(benefitsCopy).toContain("power-ups");
    expect(benefitsCopy).toContain("profile views");
    expect(benefitsCopy).toContain("demo clicks");
    expect(benefitsCopy).toContain("contact views");

    const insights = getAgentPlaySitePage(["publishers", "insights"]);
    const insightsCopy = JSON.stringify(insights).toLowerCase();
    expect(insights?.lead).not.toBe(AGENT_PLAY_ANALYTICS_COPY.body);
    expect(insights?.sections?.map((section) => section.title)).toEqual([
      "Profile views",
      "Demo clicks",
      "Contact views",
      "Lead trend for the period",
      "How publishers use the readout",
    ]);
    expect(insightsCopy).toContain("this month");
    expect(insightsCopy).toContain("/agent-play/analytics");
    expect(insightsCopy).not.toContain("interest request");

    const success = getAgentPlaySitePage(["publishers", "success"]);
    const successCopy = JSON.stringify(success).toLowerCase();
    expect(successCopy).not.toMatch(/appear here/);
    expect(success?.sections?.map((section) => section.title)).toEqual([
      "What success means on this marketplace",
      "Featured listing: IT Helpdesk Agent",
      "Catalog listings already live",
      "The publisher path that produces a story",
    ]);
    expect(successCopy).toContain("it helpdesk agent");
    expect(successCopy).toContain("healthcare navigation assistant");
    expect(successCopy).toContain("meeting scheduler agent");
    expect(successCopy).toContain("employee onboarding assistant");

    const resources = getAgentPlaySitePage(["publishers", "resources"]);
    const resourcesCopy = JSON.stringify(resources).toLowerCase();
    expect(resources?.sections?.map((section) => section.title)).toEqual([
      "Register and restore",
      "CLI and host documentation",
      "Marketplace pages for publishers",
      "World surfaces",
      "Talk to the Agent Play team",
    ]);
    expect(resourcesCopy).toContain("/agent-play/register");
    expect(resourcesCopy).toContain("/agent-play/login");
    expect(resourcesCopy).toContain("/doc/cli");
    expect(resourcesCopy).toContain(
      AGENT_PLAY_CLI_ONBOARDING.initializeDocHref,
    );
    expect(resourcesCopy).toContain("/agent-play/how-it-works");
    expect(resourcesCopy).toContain("/agent-playground");
  });

  it("documents featured agent, marketplace stats, and analytics", () => {
    expect(AGENT_PLAY_FEATURED_AGENT.name).toBe("IT Helpdesk Agent");
    expect(AGENT_PLAY_FEATURED_AGENT.publisher).toBe("Agent Play");
    expect(AGENT_PLAY_MARKETPLACE_STATS.map((stat) => stat.label)).toEqual([
      "Publishers",
      "Agents",
      "Profile Views",
      "Demo Clicks",
    ]);
    expect(AGENT_PLAY_ANALYTICS.metrics.map((metric) => metric.label)).toEqual([
      "Profile Views",
      "Demo Clicks",
      "Contact Views",
    ]);
    expect(AGENT_PLAY_TOP_AGENTS.map((agent) => agent.name)).toEqual([
      "Healthcare Navigation Assistant",
      "Meeting Scheduler Agent",
      "Employee Onboarding Assistant",
    ]);
  });

  it("lists discovery categories and the three publishing steps", () => {
    expect(AGENT_PLAY_CATEGORIES[0]).toBe("All");
    expect(AGENT_PLAY_CATEGORIES).toContain("IT Helpdesk");
    expect(AGENT_PLAY_CATEGORIES).toContain("Voice Agents");
    expect(AGENT_PLAY_HOW_IT_WORKS).toHaveLength(3);
    expect(AGENT_PLAY_PILLARS).toHaveLength(4);
  });

  it("explains CLI onboarding, player actions, and organization earning", () => {
    expect(AGENT_PLAY_CLI_ONBOARDING.cliDocHref).toBe("/doc/cli");
    expect(AGENT_PLAY_CLI_ONBOARDING.initializeDocHref).toBe(
      "/doc/initialize-agent-server-and-template",
    );
    expect(AGENT_PLAY_CLI_ONBOARDING.installCommand).toContain(
      "npx agent-play initialize",
    );
    expect(AGENT_PLAY_PLAYER_ACTIONS.map((item) => item.title)).toEqual([
      "Talk time",
      "Chats",
      "Human-in-the-loop actions",
      "Background tasks",
    ]);
    expect(AGENT_PLAY_ORGANIZATION_EARNING.title).toBe(
      "How organizations earn",
    );
    expect(AGENT_PLAY_ORGANIZATION_EARNING.bullets.join(" ").toLowerCase()).toContain(
      "talk time",
    );
  });

  it("describes a registered organizations section on the agents catalog and categories page", () => {
    expect(AGENT_PLAY_ORGANIZATIONS_SECTION.title).toBe(
      "Registered Organizations",
    );
    expect(AGENT_PLAY_ORGANIZATIONS_SECTION.lead.length).toBeGreaterThan(20);
    expect(AGENT_PLAY_ORGANIZATIONS_SECTION.empty).toMatch(/no organizations/i);
    expect(AGENT_PLAY_ORGANIZATIONS_SECTION.listHref).toBe(
      "/api/agent-play/organizations",
    );
  });

  it("describes publisher login as credentials restore, first-agent steps, and earnings", () => {
    expect(getAgentPlaySitePage(["login"])?.lead).toMatch(/credentials\.json/i);
    expect(AGENT_PLAY_LOGIN_WORKSPACE.uploadLabel).toBe("credentials.json");
    expect(AGENT_PLAY_LOGIN_WORKSPACE.agentsTitle).toBe("Your agents");
    expect(AGENT_PLAY_LOGIN_WORKSPACE.earningsTitle).toBe("Earnings");
    expect(AGENT_PLAY_LOGIN_WORKSPACE.validateHref).toBe("/api/nodes/validate");
    expect(AGENT_PLAY_LOGIN_WORKSPACE.nodesHref).toBe("/api/nodes");
    expect(AGENT_PLAY_FIRST_AGENT_STEPS).toHaveLength(4);
    expect(AGENT_PLAY_FIRST_AGENT_STEPS.map((step) => step.title)).toEqual([
      "Save credentials.json",
      "Initialize a host",
      "Create an agent node",
      "Host and earn",
    ]);
    expect(AGENT_PLAY_CLI_SHOTS).toHaveLength(3);
    expect(AGENT_PLAY_CLI_SHOTS.every((shot) => shot.lines.length >= 2)).toBe(
      true,
    );
    expect(
      AGENT_PLAY_CLI_SHOTS.every((shot) =>
        shot.lines.some(
          (line) =>
            line.kind === "prompt" && line.text.startsWith("npx agent-play"),
        ),
      ),
    ).toBe(true);
    expect(AGENT_PLAY_CLI_ONBOARDING.inspectCommand).toBe(
      "npx agent-play inspect-node",
    );
  });

  it("returns undefined for unknown marketplace paths", () => {
    expect(getAgentPlaySitePage(["not-a-page"])).toBeUndefined();
  });

  it("does not mention OB360 in marketplace copy", () => {
    const copy = JSON.stringify({
      brand: AGENT_PLAY_BRAND,
      catalog: AGENT_PLAY_CATALOG,
      featured: AGENT_PLAY_FEATURED_AGENT,
      footer: AGENT_PLAY_FOOTER_COLUMNS,
      pages: AGENT_PLAY_SITE_PAGES,
    });
    expect(copy).not.toContain("OB360");
  });

  it("does not mention interest requests in marketplace copy", () => {
    const copy = JSON.stringify({
      brand: AGENT_PLAY_BRAND,
      catalog: AGENT_PLAY_CATALOG,
      featured: AGENT_PLAY_FEATURED_AGENT,
      footer: AGENT_PLAY_FOOTER_COLUMNS,
      pages: AGENT_PLAY_SITE_PAGES,
      stats: AGENT_PLAY_MARKETPLACE_STATS,
      analytics: AGENT_PLAY_ANALYTICS,
      analyticsCopy: AGENT_PLAY_ANALYTICS_COPY,
    }).toLowerCase();
    expect(copy).not.toContain("interest request");
  });
});
