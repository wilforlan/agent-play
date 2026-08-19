import { describe, expect, it } from "vitest";

import { MAIN_WORLD_ORIGIN } from "@/lib/main-world";

import {
  AGENT_PLAYGROUND_AGENT_PROMPT,
  AGENT_PLAYGROUND_AQL_COMMANDS,
  AGENT_PLAYGROUND_AQL_DOC_LINKS,
  AGENT_PLAYGROUND_API_GROUPS,
  AGENT_PLAYGROUND_HERO,
  AGENT_PLAYGROUND_MIGRATION,
  AGENT_PLAYGROUND_NAV,
  AGENT_PLAYGROUND_PROGRESSION,
  AGENT_PLAYGROUND_QUICK_START,
  AGENT_PLAYGROUND_SURFACES,
  AGENT_PLAYGROUND_WORLDS,
  agentPlaygroundApiUrl,
  requiredAgentPlaygroundSections,
} from "./agent-playground-content";

const collectText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(collectText).join(" ");
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).map(collectText).join(" ");
  }
  return "";
};

describe("Agent Playground content", () => {
  it("covers every required public section", () => {
    const ids = requiredAgentPlaygroundSections();
    expect(ids).toEqual([
      "worlds",
      "progression",
      "aql",
      "prompt",
      "quick-start",
      "api",
      "migration",
    ]);
  });

  it("brands the landing as Agent Playground on Main World", () => {
    expect(AGENT_PLAYGROUND_HERO.kicker).toBe("Main World");
    expect(AGENT_PLAYGROUND_HERO.title).toBe(
      "Interactive World Platform for AI Agents",
    );
    expect(AGENT_PLAYGROUND_HERO.baseUrl).toBe(MAIN_WORLD_ORIGIN);
    expect(AGENT_PLAYGROUND_HERO.liveWorldHref).toBe(MAIN_WORLD_ORIGIN);
    expect(AGENT_PLAYGROUND_HERO.aqlPlaygroundHref).toBe("/playground");
    expect(AGENT_PLAYGROUND_HERO.aqlDocsHref).toBe("/agent-playground/aql");
  });

  it("uses world1.v0peer.org in every public URL and example", () => {
    const catalog = collectText({
      hero: AGENT_PLAYGROUND_HERO,
      worlds: AGENT_PLAYGROUND_WORLDS,
      progression: AGENT_PLAYGROUND_PROGRESSION,
      quickStart: AGENT_PLAYGROUND_QUICK_START,
      api: AGENT_PLAYGROUND_API_GROUPS,
      prompt: AGENT_PLAYGROUND_AGENT_PROMPT,
      aql: AGENT_PLAYGROUND_AQL_COMMANDS,
      surfaces: AGENT_PLAYGROUND_SURFACES,
    });

    expect(catalog).toContain("https://world1.v0peer.org");
    expect(catalog).not.toContain("agentplayground.com.sg");
    expect(AGENT_PLAYGROUND_QUICK_START.every((step) =>
      step.sample === undefined || step.sample.includes("https://world1.v0peer.org"),
    )).toBe(true);
  });

  it("keeps header destinations for the live world, AQL, API docs, and contact", () => {
    expect(AGENT_PLAYGROUND_NAV.map((item) => item.label)).toEqual([
      "AQL Docs",
      "Swagger",
      "Contact Us",
    ]);
    expect(AGENT_PLAYGROUND_NAV.map((item) => item.href)).toEqual([
      "/agent-playground/aql",
      "https://wilforlan.github.io/agent-play/",
      "/agent-play/contact",
    ]);
  });

  it("describes Main World surfaces instead of third-party world names", () => {
    expect(AGENT_PLAYGROUND_WORLDS.map((world) => world.title)).toEqual([
      "Agent Street",
      "Space Avenue",
      "Maple Arcade",
      "AQL Console",
    ]);
    expect(
      AGENT_PLAYGROUND_WORLDS.every((world) =>
        world.body.toLowerCase().includes("main world") ||
        world.title === "AQL Console",
      ),
    ).toBe(true);
  });

  it("points AQL docs at the playground editor and language reference", () => {
    expect(AGENT_PLAYGROUND_AQL_DOC_LINKS.map((link) => link.href)).toEqual([
      "/playground",
      "/doc/aql/introduction",
      "/doc/aql/language-reference",
      "/doc/aql/examples",
      "/doc/aql/playground",
    ]);
    expect(AGENT_PLAYGROUND_AQL_COMMANDS[0]?.sample).toContain(
      `CONNECT SERVER "${MAIN_WORLD_ORIGIN}"`,
    );
  });

  it("builds REST examples against the Main World API prefix", () => {
    expect(agentPlaygroundApiUrl("/session")).toBe(
      "https://world1.v0peer.org/api/agent-play/session",
    );
    const paths = AGENT_PLAYGROUND_API_GROUPS.flatMap((group) =>
      group.endpoints.map((endpoint) => endpoint.path),
    );
    expect(paths).toContain("GET /api/agent-play/session");
    expect(paths).toContain("GET /api/agent-play/snapshot");
    expect(paths).toContain("POST /api/agent-play/sdk/rpc");
    expect(paths).not.toContain("/v1/sessions/{id}/observation");
  });

  it("documents restoring agent-play.com credentials on world1.v0peer.org", () => {
    expect(AGENT_PLAYGROUND_MIGRATION.title).toMatch(/migrat/i);
    expect(AGENT_PLAYGROUND_MIGRATION.fromHost).toBe("agent-play.com");
    expect(AGENT_PLAYGROUND_MIGRATION.toHost).toBe("world1.v0peer.org");
    expect(AGENT_PLAYGROUND_MIGRATION.legacyOrigins).toEqual([
      "https://agent-play.com",
      "https://www.agent-play.com",
      "https://playworld.world",
    ]);
    expect(AGENT_PLAYGROUND_MIGRATION.canonicalOrigin).toBe(MAIN_WORLD_ORIGIN);
    expect(AGENT_PLAYGROUND_MIGRATION.steps.join(" ")).toContain(
      "credentials.json",
    );
    expect(AGENT_PLAYGROUND_MIGRATION.body).toContain("agent-play.com");
    expect(AGENT_PLAYGROUND_MIGRATION.body).toContain("world1.v0peer.org");
  });

  it("gives agents a copyable prompt aimed at the Main World", () => {
    expect(AGENT_PLAYGROUND_AGENT_PROMPT).toContain(MAIN_WORLD_ORIGIN);
    expect(AGENT_PLAYGROUND_AGENT_PROMPT).toContain("/playground");
    expect(AGENT_PLAYGROUND_AGENT_PROMPT).toContain("/agent-playground/aql");
    expect(AGENT_PLAYGROUND_AGENT_PROMPT).not.toContain("agentplayground.com.sg");
  });
});
