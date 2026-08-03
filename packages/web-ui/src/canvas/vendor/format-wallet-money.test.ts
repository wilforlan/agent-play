// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  formatApwBalance,
  formatApuCount,
} from "./format-wallet-money.js";

describe("format-wallet-money", () => {
  it("formats APW balances with grouping and two decimals", () => {
    expect(formatApwBalance(70)).toBe("$70.00");
    expect(formatApwBalance(12.345)).toBe("$12.35");
    expect(formatApwBalance(1234.5)).toBe("$1,234.50");
    expect(formatApwBalance(1_000_000.99)).toBe("$1,000,000.99");
  });

  it("formats non-finite APW as a placeholder", () => {
    expect(formatApwBalance(Number.NaN)).toBe("$—");
    expect(formatApwBalance(Number.POSITIVE_INFINITY)).toBe("$—");
  });

  it("formats APU counts with grouping", () => {
    expect(formatApuCount(7)).toBe("7");
    expect(formatApuCount(1234)).toBe("1,234");
    expect(formatApuCount(1_000_000)).toBe("1,000,000");
  });

  it("floors fractional APU and clamps invalid values to zero", () => {
    expect(formatApuCount(12.9)).toBe("12");
    expect(formatApuCount(-3)).toBe("0");
    expect(formatApuCount(Number.NaN)).toBe("0");
  });
});
