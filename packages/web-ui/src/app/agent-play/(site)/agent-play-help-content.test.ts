import { describe, expect, it } from "vitest";

import {
  AGENT_PLAY_CLI_ONBOARDING,
  getAgentPlaySitePage,
} from "./agent-play-content";
import {
  AGENT_PLAY_HELP_ARTICLES,
  AGENT_PLAY_HELP_HUB,
  OCCUPANCY_ORIGIN,
  agentPlayHelpHref,
} from "./agent-play-help-content";

describe("Agent Play help center for agent developers", () => {
  it("indexes a large set of Agent Developer articles from the help hub", () => {
    expect(AGENT_PLAY_HELP_HUB.developerIndexTitle).toBe("For Agent Developers");
    expect(AGENT_PLAY_HELP_ARTICLES.map((article) => article.slug)).toEqual([
      "getting-started",
      "register-organization",
      "credentials-json",
      "node-hierarchy",
      "initialize-host",
      "create-agent-node",
      "inspect-and-validate",
      "auth-headers",
      "connect-main-world",
      "sessions-and-snapshots",
      "remote-play-world",
      "chat-and-assist-tools",
      "talk-chat-assist",
      "aql-authoring",
      "spaces-and-amenities",
      "earnings-power-ups",
      "marketplace-listing",
      "troubleshooting",
    ]);
    expect(AGENT_PLAY_HELP_ARTICLES.length).toBeGreaterThanOrEqual(16);
    expect(
      new Set(AGENT_PLAY_HELP_ARTICLES.map((article) => article.slug)).size,
    ).toBe(AGENT_PLAY_HELP_ARTICLES.length);
  });

  it("gives each Agent Developer article a dedicated help page with substantial copy", () => {
    for (const article of AGENT_PLAY_HELP_ARTICLES) {
      expect(article.title.length).toBeGreaterThan(8);
      expect(article.lead.length).toBeGreaterThan(80);
      expect(article.sections.length).toBeGreaterThanOrEqual(3);
      for (const section of article.sections) {
        expect(section.body.length).toBeGreaterThan(120);
      }

      const page = getAgentPlaySitePage(["help", article.slug]);
      expect(page?.title).toBe(article.title);
      expect(page?.kicker).toBe("Agent Developers");
      expect(page?.kind).toBe("article");
      expect(page?.lead).toBe(article.lead);
      expect(page?.sections).toEqual(article.sections);
      expect(agentPlayHelpHref(article.slug)).toBe(
        `/agent-play/help/${article.slug}`,
      );
    }
  });

  it("covers the live hosting loop, CLI, Main World, and marketplace listing", () => {
    const copy = JSON.stringify(AGENT_PLAY_HELP_ARTICLES).toLowerCase();
    expect(copy).toContain("credentials.json");
    expect(copy).toContain(AGENT_PLAY_CLI_ONBOARDING.installCommand);
    expect(copy).toContain(AGENT_PLAY_CLI_ONBOARDING.createAgentCommand);
    expect(copy).toContain(AGENT_PLAY_CLI_ONBOARDING.inspectCommand);
    expect(copy).toContain(OCCUPANCY_ORIGIN.toLowerCase());
    expect(copy).toContain("world1.v0peer.org");
    expect(copy).not.toContain("legacy hosts such as agent-play.com");
    expect(copy).toContain("x-node-id");
    expect(copy).toContain("x-node-passw");
    expect(copy).toContain("chat_tool");
    expect(copy).toContain("assist_");
    expect(copy).toContain("remoteplayworld");
    expect(copy).toContain("/playground");
    expect(copy).toContain("power-ups");
    expect(copy).not.toContain("interest request");
    expect(copy).not.toContain("ob360");
    expect(copy).not.toContain("syncplayerstructuresfromtools");
  });
});
