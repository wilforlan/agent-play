// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { CHAT_EMOJI_CATALOG } from "./chat-emoji-catalog.js";
import { createChatComposer } from "./chat-composer.js";

describe("createChatComposer", () => {
  it("submits trimmed text and clears the input", () => {
    const onSubmit = vi.fn();
    const composer = createChatComposer({
      placeholder: "Say something...",
      onSubmit,
    });
    const textarea = composer.element.querySelector(
      ".chat-composer__input"
    ) as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();
    textarea!.value = "  hello world  ";
    const send = composer.element.querySelector(
      ".chat-composer__send"
    ) as HTMLButtonElement | null;
    send!.click();
    expect(onSubmit).toHaveBeenCalledWith({
      text: "hello world",
      parentRequestId: null,
    });
    expect(textarea!.value).toBe("");
  });

  it("inserts emoji from the catalog picker", () => {
    const composer = createChatComposer({
      placeholder: "Say something...",
      onSubmit: vi.fn(),
    });
    const toggle = composer.element.querySelector(
      ".chat-composer__emoji-toggle"
    ) as HTMLButtonElement | null;
    toggle!.click();
    const buttons = composer.element.querySelectorAll(
      ".chat-composer__emoji-option"
    );
    expect(buttons.length).toBe(CHAT_EMOJI_CATALOG.length);
    (buttons[0] as HTMLButtonElement).click();
    const textarea = composer.element.querySelector(
      ".chat-composer__input"
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain(CHAT_EMOJI_CATALOG[0]!);
  });

  it("tracks a reply target and exposes it on submit", () => {
    const onSubmit = vi.fn();
    const composer = createChatComposer({
      placeholder: "Say something...",
      onSubmit,
    });
    composer.setReplyTarget({
      requestId: "parent-1",
      previewText: "Earlier message",
    });
    const chip = composer.element.querySelector(
      ".chat-composer__reply-chip"
    ) as HTMLElement | null;
    expect(chip?.hidden).toBe(false);
    expect(chip?.textContent).toContain("Earlier message");
    const textarea = composer.element.querySelector(
      ".chat-composer__input"
    ) as HTMLTextAreaElement;
    textarea.value = "nested reply";
    const send = composer.element.querySelector(
      ".chat-composer__send"
    ) as HTMLButtonElement;
    send.click();
    expect(onSubmit).toHaveBeenCalledWith({
      text: "nested reply",
      parentRequestId: "parent-1",
    });
    expect(composer.getReplyTarget()).toBeNull();
  });

  it("submits on Enter and inserts newline on Shift+Enter", () => {
    const onSubmit = vi.fn();
    const composer = createChatComposer({
      placeholder: "Say something...",
      onSubmit,
    });
    const textarea = composer.element.querySelector(
      ".chat-composer__input"
    ) as HTMLTextAreaElement;
    textarea.value = "line";
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
    textarea.value = "keep";
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
      })
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
