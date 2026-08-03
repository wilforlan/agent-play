// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MESSAGE_DEEP_LINK_PARAM,
  buildMessageDeepLink,
  highlightMessageElement,
  parseMessageDeepLink,
} from "./chat-message-deep-link.js";

describe("message deep links", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses and builds message query links", () => {
    expect(MESSAGE_DEEP_LINK_PARAM).toBe("message");
    expect(
      parseMessageDeepLink("https://example.com/watch?message=req-123&sid=1")
    ).toBe("req-123");
    expect(parseMessageDeepLink("https://example.com/watch#msg=req-456")).toBe(
      "req-456"
    );
    expect(parseMessageDeepLink("https://example.com/watch")).toBeNull();
    expect(
      buildMessageDeepLink({
        requestId: "req-789",
        baseUrl: "https://example.com/watch?sid=abc",
      })
    ).toBe("https://example.com/watch?sid=abc&message=req-789");
  });

  it("highlights a message element for a few seconds then clears", () => {
    vi.useFakeTimers();
    const el = document.createElement("article");
    highlightMessageElement(el, { durationMs: 2500 });
    expect(el.classList.contains("chat-message--highlight")).toBe(true);
    vi.advanceTimersByTime(2499);
    expect(el.classList.contains("chat-message--highlight")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(el.classList.contains("chat-message--highlight")).toBe(false);
  });
});
