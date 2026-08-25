import { afterEach, describe, expect, it, vi } from "vitest";

import { startStartupWatchdog } from "./startup-watchdog";

describe("startup watchdog", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("logs debug when the server is not ready within 60s", () => {
    vi.useFakeTimers();
    const logs: string[] = [];
    const cancel = startStartupWatchdog({
      timeoutMs: 60_000,
      log: (message) => {
        logs.push(message);
      },
    });

    vi.advanceTimersByTime(59_999);
    expect(logs).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(logs.some((line) => line.includes("debug") && line.includes("60"))).toBe(
      true
    );
    cancel();
  });

  it("does not log when cancelled before the timeout", () => {
    vi.useFakeTimers();
    const logs: string[] = [];
    const cancel = startStartupWatchdog({
      timeoutMs: 60_000,
      log: (message) => {
        logs.push(message);
      },
    });

    cancel();
    vi.advanceTimersByTime(60_000);
    expect(logs).toEqual([]);
  });
});
