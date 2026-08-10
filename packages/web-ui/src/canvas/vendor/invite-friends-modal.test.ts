// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INVITE_FRIENDS_STORAGE_KEY,
  REFERRAL_REWARD_APU_COPY,
  clearInviteFriendsDismissed,
  shouldShowInviteFriendsModal,
  showInviteFriendsModal,
} from "./invite-friends-modal.js";

describe("invite friends modal", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.replaceChildren();
    document
      .querySelectorAll("#agent-play-invite-friends-styles")
      .forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  it("shows for citizens who have not dismissed the quest invite", () => {
    expect(
      shouldShowInviteFriendsModal({ guest: false, hasCredentials: true }),
    ).toBe(true);
    expect(
      shouldShowInviteFriendsModal({ guest: true, hasCredentials: true }),
    ).toBe(false);
    expect(
      shouldShowInviteFriendsModal({ guest: false, hasCredentials: false }),
    ).toBe(false);
  });

  it("renders a game-style invite with referral link and copy actions", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        code: "AB12CD34",
        link: "https://agent-play.com/?rc=AB12CD34",
        rewardApu: 25,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const handle = showInviteFriendsModal({
      nodeId: "citizen-node",
      parent: document.body,
      playWorldBaseUrl: "https://agent-play.com",
    });

    const overlay = document.querySelector("[data-invite-friends-modal='1']");
    expect(overlay).not.toBeNull();
    expect(overlay?.querySelector("h2")?.textContent).toMatch(/invite/i);
    expect(overlay?.textContent).toContain(REFERRAL_REWARD_APU_COPY);
    expect(overlay?.className).toContain("invite-friends-overlay");

    await vi.waitFor(() => {
      expect(
        overlay?.querySelector("[data-invite-link]")?.textContent,
      ).toContain("?rc=AB12CD34");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/referrals/ensure",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const copyLink = Array.from(overlay?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent === "Copy invite link",
    );
    expect(copyLink).toBeDefined();
    copyLink?.click();
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "https://agent-play.com/?rc=AB12CD34",
      );
    });

    Array.from(overlay?.querySelectorAll("button") ?? [])
      .find((button) => button.textContent === "Maybe later")
      ?.click();

    expect(shouldShowInviteFriendsModal({ guest: false, hasCredentials: true })).toBe(
      false,
    );
    expect(localStorage.getItem(INVITE_FRIENDS_STORAGE_KEY)).not.toBeNull();
    expect(document.querySelector("[data-invite-friends-modal='1']")).toBeNull();
    handle.destroy();
    clearInviteFriendsDismissed();
  });

  it("stacks actions for mobile touch targets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          code: "ZZ99YY88",
          link: "https://agent-play.com/?rc=ZZ99YY88",
          rewardApu: 25,
        }),
      }),
    );

    showInviteFriendsModal({
      nodeId: "citizen-node",
      parent: document.body,
      playWorldBaseUrl: "https://agent-play.com",
    });

    await vi.waitFor(() => {
      expect(
        document.querySelector(".invite-friends-actions--stacked"),
      ).not.toBeNull();
    });
  });
});
