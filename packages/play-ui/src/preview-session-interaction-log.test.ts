// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isSessionInteractionLoggingEnabled,
  logSessionInteraction,
} from "./preview-session-interaction-log.js";

describe("isSessionInteractionLoggingEnabled", () => {
  it("is true under Vitest (non-production)", () => {
    expect(isSessionInteractionLoggingEnabled()).toBe(true);
  });
});

describe("logSessionInteraction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes a structured console.info line with detail", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logSessionInteraction("unit:step", "skip", { reason: "test" });
    expect(spy).toHaveBeenCalledTimes(1);
    const [first, second] = spy.mock.calls[0] as [string, Record<string, unknown>];
    expect(first).toContain("[agent-play:session-interaction]");
    expect(first).toContain("skip");
    expect(first).toContain("unit:step");
    expect(second).toEqual({ reason: "test" });
  });

  it("omits empty detail object", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logSessionInteraction("unit:empty", "event", {});
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("unit:empty")
    );
  });
});
