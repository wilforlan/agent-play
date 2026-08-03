// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import {
  ARRIVAL_QUEST_STORAGE_KEY,
  ArrivalQuestStep,
  advanceArrivalQuestStep,
  clearArrivalQuestProgress,
  createArrivalQuestCoach,
  dismissArrivalQuestCoach,
  dismissCitizenCard,
  ECONEXT_URL,
  isArrivalQuestActive,
  isGuestNodeId,
  markArrivalQuestStep,
  readArrivalQuestProgress,
  shouldShowCitizenCard,
  showCitizenCard,
  startArrivalQuest,
} from "./arrival-quest.js";

describe("arrival quest", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.replaceChildren();
    document
      .querySelectorAll("#agent-play-arrival-quest-coach-styles")
      .forEach((el) => el.remove());
  });

  it("detects guest node ids", () => {
    expect(isGuestNodeId("preview-local-node")).toBe(true);
    expect(isGuestNodeId("session-abcdefghijkl")).toBe(true);
    expect(isGuestNodeId("a1b2c3d4e5f6789012345678901234567890abcd")).toBe(
      false
    );
  });

  it("starts at watch_screen for citizens and persists", () => {
    startArrivalQuest({ guest: false });
    const progress = readArrivalQuestProgress();
    expect(progress).toEqual({
      step: "watch_screen",
      guest: false,
      coachDismissed: false,
      citizenCardDismissed: false,
    });
    expect(localStorage.getItem(ARRIVAL_QUEST_STORAGE_KEY)).not.toBeNull();
    expect(isArrivalQuestActive()).toBe(true);
  });

  it("starts at watch_screen for guests", () => {
    startArrivalQuest({ guest: true });
    expect(readArrivalQuestProgress()?.guest).toBe(true);
    expect(isArrivalQuestActive()).toBe(true);
  });

  it("does not restart when already completed", () => {
    startArrivalQuest({ guest: false });
    for (const step of [
      "watch_screen",
      "touch_control",
      "play_pad",
      "wallet_chip",
      "meet_agent",
      "maple_arcade",
    ] as const satisfies readonly ArrivalQuestStep[]) {
      markArrivalQuestStep(step);
    }
    expect(readArrivalQuestProgress()?.step).toBe("complete");
    startArrivalQuest({ guest: false });
    expect(readArrivalQuestProgress()?.step).toBe("complete");
    expect(isArrivalQuestActive()).toBe(false);
  });

  it("advances feature walkthrough steps in order", () => {
    startArrivalQuest({ guest: false });
    expect(markArrivalQuestStep("touch_control")).toBe(false);
    expect(advanceArrivalQuestStep()).toBe(true);
    expect(readArrivalQuestProgress()?.step).toBe("touch_control");
    expect(markArrivalQuestStep("touch_control")).toBe(true);
    expect(readArrivalQuestProgress()?.step).toBe("play_pad");
    expect(markArrivalQuestStep("play_pad")).toBe(true);
    expect(readArrivalQuestProgress()?.step).toBe("wallet_chip");
    expect(markArrivalQuestStep("wallet_chip")).toBe(true);
    expect(readArrivalQuestProgress()?.step).toBe("meet_agent");
    expect(markArrivalQuestStep("meet_agent")).toBe(true);
    expect(readArrivalQuestProgress()?.step).toBe("maple_arcade");
    expect(markArrivalQuestStep("maple_arcade")).toBe(true);
    expect(readArrivalQuestProgress()?.step).toBe("complete");
  });

  it("keeps coach dismissed across step advances", () => {
    startArrivalQuest({ guest: false });
    dismissArrivalQuestCoach();
    expect(readArrivalQuestProgress()?.coachDismissed).toBe(true);
    expect(markArrivalQuestStep("watch_screen")).toBe(true);
    expect(readArrivalQuestProgress()?.step).toBe("touch_control");
    expect(readArrivalQuestProgress()?.coachDismissed).toBe(true);
  });

  it("hides coach after dismiss click and stays hidden", () => {
    startArrivalQuest({ guest: false });
    const coach = createArrivalQuestCoach({ parent: document.body });
    const root = document.querySelector(".arrival-quest-coach");
    expect(root?.hasAttribute("hidden")).toBe(false);
    const dismiss = root?.querySelector(
      ".arrival-quest-coach__dismiss"
    ) as HTMLButtonElement;
    dismiss.click();
    expect(readArrivalQuestProgress()?.coachDismissed).toBe(true);
    expect(root?.hasAttribute("hidden")).toBe(true);
    markArrivalQuestStep("watch_screen");
    coach.sync();
    expect(root?.hasAttribute("hidden")).toBe(true);
    coach.destroy();
  });

  it("next button advances the current walkthrough step", () => {
    startArrivalQuest({ guest: false });
    const coach = createArrivalQuestCoach({ parent: document.body });
    const root = document.querySelector(".arrival-quest-coach");
    expect(root?.querySelector(".arrival-quest-coach__title")?.textContent).toBe(
      "Watch screen"
    );
    const next = root?.querySelector(
      ".arrival-quest-coach__next"
    ) as HTMLButtonElement;
    next.click();
    expect(readArrivalQuestProgress()?.step).toBe("touch_control");
    expect(root?.querySelector(".arrival-quest-coach__title")?.textContent).toBe(
      "Touch controls"
    );
    coach.destroy();
  });

  it("shows citizen card only for completed non-guest undismissed quests", () => {
    expect(shouldShowCitizenCard()).toBe(false);
    startArrivalQuest({ guest: false });
    for (const step of [
      "watch_screen",
      "touch_control",
      "play_pad",
      "wallet_chip",
      "meet_agent",
      "maple_arcade",
    ] as const satisfies readonly ArrivalQuestStep[]) {
      markArrivalQuestStep(step);
    }
    expect(shouldShowCitizenCard()).toBe(true);
    dismissCitizenCard();
    expect(shouldShowCitizenCard()).toBe(false);
  });

  it("never shows citizen card for guests", () => {
    startArrivalQuest({ guest: true });
    for (const step of [
      "watch_screen",
      "touch_control",
      "play_pad",
      "wallet_chip",
      "meet_agent",
      "maple_arcade",
    ] as const satisfies readonly ArrivalQuestStep[]) {
      markArrivalQuestStep(step);
    }
    expect(shouldShowCitizenCard()).toBe(false);
  });

  it("places coach toast top-center below proximity pad", () => {
    startArrivalQuest({ guest: false });
    const coach = createArrivalQuestCoach({ parent: document.body });
    const css = document.getElementById("agent-play-arrival-quest-coach-styles")
      ?.textContent;
    expect(css).toContain("left: 50%");
    expect(css).toContain("translateX(-50%)");
    expect(css).toContain("z-index: 14000");
    expect(css).toContain("min-height: 44px");
    coach.destroy();
  });

  it("shows citizen card with Econext link and stacked action class", () => {
    startArrivalQuest({ guest: false });
    for (const step of [
      "watch_screen",
      "touch_control",
      "play_pad",
      "wallet_chip",
      "meet_agent",
      "maple_arcade",
    ] as const satisfies readonly ArrivalQuestStep[]) {
      markArrivalQuestStep(step);
    }
    const card = showCitizenCard({
      nodeId: "abcdef0123456789abcdef0123456789abcdef01",
      parent: document.body,
    });
    const overlay = document.querySelector("[data-arrival-citizen-card='1']");
    expect(overlay).not.toBeNull();
    expect(overlay?.querySelector("h2")?.textContent).toBe("Day 1 citizen");
    const econext = overlay?.querySelector(
      `a[href="${ECONEXT_URL}"]`
    ) as HTMLAnchorElement | null;
    expect(econext).not.toBeNull();
    expect(econext?.target).toBe("_blank");
    expect(
      overlay?.querySelector(".human-onboard-actions--citizen")
    ).not.toBeNull();
    Array.from(overlay?.querySelectorAll("button") ?? [])
      .find((b) => b.textContent === "Keep exploring")
      ?.click();
    expect(shouldShowCitizenCard()).toBe(false);
    card.destroy();
  });
});
