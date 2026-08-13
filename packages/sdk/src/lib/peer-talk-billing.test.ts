import { describe, expect, it } from "vitest";
import {
  PEER_TALK_PRICE_PER_60S_USD,
  PEER_TALK_PRICE_PER_SECOND_USD,
  PEER_TALK_TICK_MAX_SECONDS,
  PEER_TALK_TICK_MIN_SECONDS,
  nextPeerTalkTickSeconds,
  peerCostForSeconds,
} from "./peer-talk-billing.js";

describe("peer-talk-billing", () => {
  it("charges exactly 0.12 for 60 whole seconds", () => {
    expect(peerCostForSeconds(60)).toBe(PEER_TALK_PRICE_PER_60S_USD);
  });

  it("uses micro-dollar rounding per whole second at 0.002/s", () => {
    expect(peerCostForSeconds(1)).toBe(0.002);
    expect(peerCostForSeconds(7)).toBe(0.014);
    expect(peerCostForSeconds(15)).toBe(0.03);
  });

  it("is monotonic for each added second", () => {
    let prev = 0;
    for (let s = 1; s <= 120; s += 1) {
      const next = peerCostForSeconds(s);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });

  it("returns zero for non-positive or non-finite seconds", () => {
    expect(peerCostForSeconds(0)).toBe(0);
    expect(peerCostForSeconds(-1)).toBe(0);
    expect(peerCostForSeconds(Number.NaN)).toBe(0);
  });

  it("floors fractional seconds input before billing", () => {
    expect(peerCostForSeconds(10.9)).toBe(peerCostForSeconds(10));
  });

  it("exposes stable per-second rate constant", () => {
    expect(PEER_TALK_PRICE_PER_SECOND_USD).toBe(0.002);
  });

  it("exposes inclusive tick bounds of 7 and 15 seconds", () => {
    expect(PEER_TALK_TICK_MIN_SECONDS).toBe(7);
    expect(PEER_TALK_TICK_MAX_SECONDS).toBe(15);
  });

  it("picks a deterministic tick delay from a seeded RNG in [7, 15]", () => {
    const sequence = [0, 0.5, 0.999999];
    let i = 0;
    const rng = (): number => {
      const value = sequence[i] ?? 0;
      i += 1;
      return value;
    };
    expect(nextPeerTalkTickSeconds(rng)).toBe(7);
    expect(nextPeerTalkTickSeconds(rng)).toBe(11);
    expect(nextPeerTalkTickSeconds(rng)).toBe(15);
  });

  it("never leaves [7, 15] across many draws", () => {
    let seed = 1;
    const rng = (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let n = 0; n < 200; n += 1) {
      const delay = nextPeerTalkTickSeconds(rng);
      expect(delay).toBeGreaterThanOrEqual(7);
      expect(delay).toBeLessThanOrEqual(15);
      expect(Number.isInteger(delay)).toBe(true);
    }
  });
});
