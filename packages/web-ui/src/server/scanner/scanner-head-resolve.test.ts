import { describe, expect, it } from "vitest";
import { REFERENCE_APW_PER_APU } from "@agent-play/sdk";
import { apwPerApuRateKey } from "./scanner-keys.js";
import { apwFromApu, resolveApwPerApu } from "./scanner-head-resolve.js";

describe("apwFromApu", () => {
  it("multiplies APU by the convert rate", () => {
    expect(apwFromApu({ apuAmount: 100, apwPerApu: 0.0664875 })).toBeCloseTo(
      6.64875,
      8,
    );
  });

  it("returns zero for missing rate or amount", () => {
    expect(apwFromApu({ apuAmount: 100, apwPerApu: 0 })).toBe(0);
    expect(apwFromApu({ apuAmount: 0, apwPerApu: 0.0664875 })).toBe(0);
  });
});

describe("resolveApwPerApu", () => {
  it("returns the live Redis market rate when present", async () => {
    const hostId = "default";
    const strings = new Map<string, string>([
      [apwPerApuRateKey(hostId), "0.1"],
    ]);
    const redis = {
      async get(key: string): Promise<string | null> {
        return strings.get(key) ?? null;
      },
    };
    await expect(
      resolveApwPerApu({ redis: redis as never, hostId }),
    ).resolves.toBe(0.1);
  });

  it("falls back so dual-tender amenities still quote APW$ when Redis rate is missing", async () => {
    const redis = {
      async get(): Promise<string | null> {
        return null;
      },
    };
    await expect(
      resolveApwPerApu({ redis: redis as never, hostId: "default" }),
    ).resolves.toBe(REFERENCE_APW_PER_APU);
  });
});
