import { describe, expect, it } from "vitest";

import {
  computeEventPuDelta,
  DAILY_GAME_PU_CAP,
  DEFAULT_PLAYER_WALLET_BALANCE_USD,
  GAME_CABINET_CATALOG,
  PLAYABLE_GAME_IDS,
  STREAK_BONUS_PU,
  STREAK_BONUS_THRESHOLD_DAYS,
  TALK_AGENT_PU_BILLED_SECONDS_PER_UNIT,
  TALK_AGENT_PU_MAX_PER_LEG,
  WALLET_BUNDLE_OFFERS,
} from "@agent-play/sdk";

import {
  AGENT_PLAY_GAMES_FAQ,
  AGENT_PLAY_GAMES_HERO,
  AGENT_PLAY_GAMES_NAV,
  AGENT_PLAY_GAMES_PAGES,
  AGENT_PLAY_GAMES_UNITS,
  AGENT_PLAY_GAMES_WIN_LOOP,
  amenityPurchaseApu,
  getAgentPlayGamePage,
  listAgentPlayGameSlugs,
  requiredAgentPlayGamesPaths,
} from "./agent-play-games-content";

describe("Agent Play Games catalog", () => {
  it("covers the arcade hub, world units, and every Maple Ave cabinet", () => {
    expect(requiredAgentPlayGamesPaths()).toEqual([
      "/games",
      "/games/units",
      ...GAME_CABINET_CATALOG.map((cabinet) => `/games/${cabinet.gameId}`),
    ]);
    expect(listAgentPlayGameSlugs()).toEqual(
      GAME_CABINET_CATALOG.map((cabinet) => cabinet.gameId),
    );
    for (const cabinet of GAME_CABINET_CATALOG) {
      const page = getAgentPlayGamePage(cabinet.gameId);
      expect(page).toBeDefined();
      expect(page?.cabinetName).toBe(cabinet.name);
      expect(page?.gameId).toBe(cabinet.gameId);
    }
  });

  it("documents every playable title with a play loop, world advantage, and scored events", () => {
    for (const gameId of PLAYABLE_GAME_IDS) {
      const page = getAgentPlayGamePage(gameId);
      expect(page?.playLoop.length).toBeGreaterThanOrEqual(3);
      expect(page?.worldAdvantage.length).toBeGreaterThanOrEqual(2);
      expect(page?.puRates.length).toBeGreaterThanOrEqual(2);
      expect(page?.seoDescription.length).toBeGreaterThanOrEqual(110);
      expect(page?.seoDescription.length).toBeLessThanOrEqual(160);
    }
  });

  it("keeps arcade earning tables aligned with server scoring", () => {
    for (const page of AGENT_PLAY_GAMES_PAGES) {
      for (const rate of page.puRates) {
        expect(computeEventPuDelta(rate.event)).toBe(rate.pu);
      }
    }
  });

  it("brands the hub as Agent Play Games on Maple Ave", () => {
    expect(AGENT_PLAY_GAMES_HERO.kicker).toBe("Maple Ave Arcade");
    expect(AGENT_PLAY_GAMES_HERO.title).toBe("Agent Play Games");
    expect(AGENT_PLAY_GAMES_HERO.seoTitle.length).toBeGreaterThanOrEqual(40);
    expect(AGENT_PLAY_GAMES_HERO.seoTitle.length).toBeLessThanOrEqual(65);
    expect(AGENT_PLAY_GAMES_HERO.seoDescription.length).toBeGreaterThanOrEqual(110);
    expect(AGENT_PLAY_GAMES_HERO.seoDescription.length).toBeLessThanOrEqual(160);
    expect(AGENT_PLAY_GAMES_NAV.map((item) => item.href)).toEqual([
      "/games",
      "/games/units",
      "/",
      "/doc/games",
    ]);
  });
});

describe("Agent Play World units", () => {
  it("names APW dollars and APU, and documents how they count", () => {
    expect(AGENT_PLAY_GAMES_UNITS.apw.symbol).toBe("APW$");
    expect(AGENT_PLAY_GAMES_UNITS.apw.seedUsd).toBe(
      DEFAULT_PLAYER_WALLET_BALANCE_USD,
    );
    expect(AGENT_PLAY_GAMES_UNITS.apu.symbol).toBe("APU");
    expect(AGENT_PLAY_GAMES_UNITS.apu.dailyArcadeCap).toBe(DAILY_GAME_PU_CAP);
    expect(AGENT_PLAY_GAMES_UNITS.apu.streakBonus).toBe(STREAK_BONUS_PU);
    expect(AGENT_PLAY_GAMES_UNITS.apu.streakThresholdDays).toBe(
      STREAK_BONUS_THRESHOLD_DAYS,
    );
    expect(AGENT_PLAY_GAMES_UNITS.howTheyCount.length).toBeGreaterThanOrEqual(4);
    expect(AGENT_PLAY_GAMES_UNITS.howToSpend.length).toBeGreaterThanOrEqual(3);
    expect(AGENT_PLAY_GAMES_UNITS.seoDescription.length).toBeGreaterThanOrEqual(110);
    expect(AGENT_PLAY_GAMES_UNITS.seoDescription.length).toBeLessThanOrEqual(160);
  });

  it("lists wallet bundle redemption rates from the live catalog", () => {
    expect(AGENT_PLAY_GAMES_UNITS.bundles).toEqual(
      WALLET_BUNDLE_OFFERS.map((offer) => ({
        id: offer.id,
        apuCost: offer.powerUpsCost,
        creditUsd: offer.creditUsd,
      })),
    );
  });

  it("documents amenity, talk, referral, and first-round earning rates", () => {
    expect(amenityPurchaseApu(4.99)).toBe(12);
    expect(amenityPurchaseApu(1)).toBe(3);
    expect(AGENT_PLAY_GAMES_UNITS.earningRates.map((rate) => rate.id)).toEqual([
      "arcade",
      "first-round",
      "streak",
      "amenity",
      "talk",
      "referral",
    ]);
    const talk = AGENT_PLAY_GAMES_UNITS.earningRates.find(
      (rate) => rate.id === "talk",
    );
    expect(talk?.detail).toContain(String(TALK_AGENT_PU_BILLED_SECONDS_PER_UNIT));
    expect(talk?.detail).toContain(String(TALK_AGENT_PU_MAX_PER_LEG));
    expect(AGENT_PLAY_GAMES_WIN_LOOP.length).toBeGreaterThanOrEqual(4);
  });

  it("answers games and units questions for rich results", () => {
    const questions = AGENT_PLAY_GAMES_FAQ.map((item) => item.question);
    expect(questions).toContain("What are Agent Play Games?");
    expect(questions).toContain("What are Agent Play World units?");
    expect(questions).toContain("How do I earn APU?");
    expect(questions).toContain("How do I spend APU and APW$?");
    for (const item of AGENT_PLAY_GAMES_FAQ) {
      expect(item.answer.length).toBeGreaterThan(40);
    }
  });
});
