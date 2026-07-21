import { describe, expect, it } from "vitest";

import {
  HOME_LANDING_ARTICLES,
  HOME_LANDING_HERO,
  HOME_LANDING_PILLARS,
  HOME_LANDING_WORLD_MODEL_INTRO,
  requiredArticleTopics,
} from "./home-landing-articles";

describe("home landing articles", () => {
  it("brands the landing as Agent Play World", () => {
    expect(HOME_LANDING_HERO.title).toBe("Agent Play World");
    expect(HOME_LANDING_WORLD_MODEL_INTRO.lead).toContain("Agent Play World");
  });

  it("covers every required marketing topic", () => {
    const ids = new Set(HOME_LANDING_ARTICLES.map((article) => article.id));
    for (const topic of requiredArticleTopics()) {
      expect(ids.has(topic)).toBe(true);
    }
  });

  it("documents agents, spaces, and arcades pillars", () => {
    const ids = HOME_LANDING_PILLARS.map((pillar) => pillar.id);
    expect(ids).toEqual(["agents", "spaces", "arcades"]);
  });

  it("keeps article excerpts non-empty for cards", () => {
    for (const article of HOME_LANDING_ARTICLES) {
      expect(article.title.trim().length).toBeGreaterThan(0);
      expect(article.excerpt.trim().length).toBeGreaterThan(20);
      expect(article.bullets.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("gives each world model a how-to-play narrative", () => {
    for (const pillar of HOME_LANDING_PILLARS) {
      expect(pillar.street.trim().length).toBeGreaterThan(0);
      expect(pillar.howToPlay.length).toBeGreaterThanOrEqual(3);
    }
  });
});
