// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearHumanCredentials, readHumanCredentials } from "./preview-human-credentials.js";
import { ensureHumanNodeOnboarding } from "./preview-human-onboarding.js";

vi.mock("./preview-agent-play-root-key.js", () => ({
  resolveAgentPlayRootKeyForBrowser: vi.fn(async () => new Uint8Array(32).fill(1)),
}));

vi.mock("@agent-play/node-tools/browser", () => ({
  nodeCredentialFromHumanPhrase: vi.fn(() => ({
    nodeId: "citizen-node-id-abcdefghijklmnopqrstuvwxyz012345",
    passwHash: "hash",
  })),
}));

describe("citizen induction onboarding", () => {
  beforeEach(() => {
    clearHumanCredentials();
    document.body.replaceChildren();
    document
      .querySelectorAll("#agent-play-human-onboarding-styles")
      .forEach((el) => el.remove());
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            nodeId: "citizen-node-id-abcdefghijklmnopqrstuvwxyz012345",
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );
  });

  afterEach(() => {
    clearHumanCredentials();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows opaque citizen induction stage without world-through backdrop", async () => {
    const pending = ensureHumanNodeOnboarding({
      apiBase: "https://example.com/api",
      getSid: () => "sid-test",
    });
    await Promise.resolve();
    const overlay = document.querySelector(".human-onboard-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.classList.contains("human-onboard-overlay--opaque")).toBe(
      true
    );
    expect(document.querySelector(".human-onboard-brand")?.textContent).toBe(
      "Agent Play"
    );
    expect(document.querySelector(".human-onboard-title")?.textContent).toBe(
      "Become a citizen"
    );
    const css = document.getElementById("agent-play-human-onboarding-styles")
      ?.textContent;
    expect(css).toContain("background: #071018");
    expect(css).not.toContain("rgba(30, 41, 36, 0.42)");
    expect(
      Array.from(document.querySelectorAll("button")).some(
        (b) => b.textContent === "Start citizenship"
      )
    ).toBe(true);
    overlay?.remove();
    void pending;
  });

  it("opens passport with citizen primary and quiet guest path", async () => {
    const pending = ensureHumanNodeOnboarding({
      apiBase: "https://example.com/api",
      getSid: () => "sid-test",
    });
    await Promise.resolve();
    Array.from(document.querySelectorAll("button"))
      .find((b) => b.textContent === "Start citizenship")
      ?.click();
    await Promise.resolve();
    expect(document.querySelector(".human-onboard-title")?.textContent).toBe(
      "Issue your papers"
    );
    const buttons = Array.from(document.querySelectorAll("button")).map(
      (b) => b.textContent
    );
    expect(buttons).toContain("Become a citizen");
    expect(
      Array.from(document.querySelectorAll("button")).some(
        (b) => b.textContent === "Continue as guest (no earn / no chat)"
      )
    ).toBe(true);
    document.querySelector(".human-onboard-overlay")?.remove();
    void pending;
  });

  it("guest path writes synthetic credentials and resolves", async () => {
    const done = ensureHumanNodeOnboarding({
      apiBase: "https://example.com/api",
      getSid: () => "sid-abcdefghijkl",
    });
    await Promise.resolve();
    Array.from(document.querySelectorAll("button"))
      .find((b) => b.textContent === "Start citizenship")
      ?.click();
    await Promise.resolve();
    Array.from(document.querySelectorAll("button"))
      .find((b) => b.textContent === "Continue as guest (no earn / no chat)")
      ?.click();
    await done;
    expect(readHumanCredentials()?.nodeId).toBe("session-sid-abcdefgh");
    expect(document.querySelector(".human-onboard-overlay")).toBeNull();
  });

  it("blocks enter until backup download or saved-key check", async () => {
    const done = ensureHumanNodeOnboarding({
      apiBase: "https://example.com/api",
      getSid: () => "sid-test",
    });
    await Promise.resolve();
    Array.from(document.querySelectorAll("button"))
      .find((b) => b.textContent === "Start citizenship")
      ?.click();
    await Promise.resolve();
    const consent = document.querySelector(
      '.human-onboard-panel input[type="checkbox"]'
    ) as HTMLInputElement | null;
    expect(consent).not.toBeNull();
    if (consent !== null) {
      consent.checked = true;
    }
    Array.from(document.querySelectorAll("button"))
      .find((b) => b.textContent === "Become a citizen")
      ?.click();
    await vi.waitFor(() => {
      expect(document.querySelector(".human-onboard-title")?.textContent).toBe(
        "Citizenship sealed"
      );
    });
    const continueBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent === "Enter Agent Play World"
    ) as HTMLButtonElement | undefined;
    expect(continueBtn?.disabled).toBe(true);
    const saved = document.querySelector(
      'input[data-onboard-saved-key="1"]'
    ) as HTMLInputElement | null;
    expect(saved).not.toBeNull();
    if (saved !== null) {
      saved.checked = true;
      saved.dispatchEvent(new Event("change", { bubbles: true }));
    }
    expect(continueBtn?.disabled).toBe(false);
    continueBtn?.click();
    await done;
    expect(readHumanCredentials()?.nodeId).toContain("citizen-node-id");
  });

  it("keeps mobile sheet and touch-target contracts", async () => {
    const pending = ensureHumanNodeOnboarding({
      apiBase: "https://example.com/api",
      getSid: () => "sid-test",
    });
    await Promise.resolve();
    const css = document.getElementById("agent-play-human-onboarding-styles")
      ?.textContent;
    expect(css).toContain("max-width: 767px");
    expect(css).toContain("align-items: end");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("font-size: 16px");
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain("flex-direction: column");
    document.querySelector(".human-onboard-overlay")?.remove();
    void pending;
  });
});
