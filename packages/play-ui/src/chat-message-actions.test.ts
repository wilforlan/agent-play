// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyMessageReactions } from "./chat-message-reactions.js";
import { createChatMessageActions } from "./chat-message-actions.js";

describe("createChatMessageActions", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders reply, copy link, love, and like controls with icons", () => {
    const onReply = vi.fn();
    const onCopyLink = vi.fn();
    const onReact = vi.fn();
    const actions = createChatMessageActions({
      reactions: createEmptyMessageReactions(),
      playerId: "main-1",
      canReply: true,
      onReply,
      onCopyLink,
      onReact,
    });
    const reply = actions.element.querySelector(
      ".chat-message-actions__reply"
    ) as HTMLButtonElement | null;
    const link = actions.element.querySelector(
      ".chat-message-actions__link"
    ) as HTMLButtonElement | null;
    const love = actions.element.querySelector(
      ".chat-message-actions__love"
    ) as HTMLButtonElement | null;
    const like = actions.element.querySelector(
      ".chat-message-actions__thumbs-up"
    ) as HTMLButtonElement | null;
    expect(reply).not.toBeNull();
    expect(link).not.toBeNull();
    expect(love).not.toBeNull();
    expect(like).not.toBeNull();
    expect(reply?.textContent).toContain("Reply");
    expect(link?.textContent).toContain("Copy link");
    expect(love?.textContent).toContain("Love");
    expect(like?.textContent).toContain("Like");
    expect(reply?.querySelector("svg.chat-message-actions__icon")).not.toBeNull();
    expect(link?.querySelector("svg.chat-message-actions__icon")).not.toBeNull();
    expect(love?.querySelector("svg.chat-message-actions__icon")).not.toBeNull();
    expect(like?.querySelector("svg.chat-message-actions__icon")).not.toBeNull();
    reply!.click();
    expect(onReply).toHaveBeenCalledTimes(1);
    love!.click();
    expect(onReact).toHaveBeenCalledWith({ kind: "love", action: "set" });
    like!.click();
    expect(onReact).toHaveBeenCalledWith({ kind: "thumbs_up", action: "set" });
  });

  it("shows copied feedback on the link control then reverts", () => {
    vi.useFakeTimers();
    const onCopyLink = vi.fn();
    const actions = createChatMessageActions({
      reactions: createEmptyMessageReactions(),
      playerId: "main-1",
      canReply: false,
      onReply: vi.fn(),
      onCopyLink,
      onReact: vi.fn(),
    });
    const link = actions.element.querySelector(
      ".chat-message-actions__link"
    ) as HTMLButtonElement;
    const label = link.querySelector(".chat-message-actions__label");
    expect(label?.textContent).toBe("Copy link");
    link.click();
    expect(onCopyLink).toHaveBeenCalledTimes(1);
    expect(label?.textContent).toBe("Copied");
    expect(link.classList.contains("chat-message-actions__link--copied")).toBe(
      true
    );
    vi.advanceTimersByTime(2000);
    expect(label?.textContent).toBe("Copy link");
    expect(link.classList.contains("chat-message-actions__link--copied")).toBe(
      false
    );
  });

  it("cancels an existing reaction for the current player", () => {
    const onReact = vi.fn();
    const actions = createChatMessageActions({
      reactions: { love: ["main-1"], thumbs_up: [] },
      playerId: "main-1",
      canReply: false,
      onReply: vi.fn(),
      onCopyLink: vi.fn(),
      onReact,
    });
    const love = actions.element.querySelector(
      ".chat-message-actions__love"
    ) as HTMLButtonElement;
    expect(love.getAttribute("aria-pressed")).toBe("true");
    love.click();
    expect(onReact).toHaveBeenCalledWith({ kind: "love", action: "cancel" });
    expect(
      actions.element.querySelector(".chat-message-actions__reply")
    ).toBeNull();
  });
});
