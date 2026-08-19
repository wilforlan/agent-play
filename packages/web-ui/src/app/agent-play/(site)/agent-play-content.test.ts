import { describe, expect, it } from "vitest";

import {
  AGENT_PLAY_ANALYTICS,
  AGENT_PLAY_BRAND,
  AGENT_PLAY_CATALOG,
  AGENT_PLAY_CATEGORIES,
  AGENT_PLAY_CLI_ONBOARDING,
  AGENT_PLAY_FEATURED_AGENT,
  AGENT_PLAY_FOOTER_COLUMNS,
  AGENT_PLAY_HERO,
  AGENT_PLAY_HOW_IT_WORKS,
  AGENT_PLAY_MARKETPLACE_STATS,
  AGENT_PLAY_NAV,
  AGENT_PLAY_ORGANIZATION_EARNING,
  AGENT_PLAY_PILLARS,
  AGENT_PLAY_PLAYER_ACTIONS,
  AGENT_PLAY_SITE_PAGES,
  AGENT_PLAY_TOP_AGENTS,
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

  it("documents featured agent, marketplace stats, and analytics", () => {
    expect(AGENT_PLAY_FEATURED_AGENT.name).toBe("IT Helpdesk Agent");
    expect(AGENT_PLAY_FEATURED_AGENT.publisher).toBe("Agent Play");
    expect(AGENT_PLAY_MARKETPLACE_STATS.map((stat) => stat.label)).toEqual([
      "Publishers",
      "Agents",
      "Profile Views",
      "Interest Requests",
    ]);
    expect(AGENT_PLAY_ANALYTICS.metrics.map((metric) => metric.label)).toEqual([
      "Profile Views",
      "Demo Clicks",
      "Contact Views",
      "Interest Requests",
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
});
