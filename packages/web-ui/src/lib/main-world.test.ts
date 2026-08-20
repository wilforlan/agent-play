import { describe, expect, it } from "vitest";

import {
  LEGACY_MAIN_WORLD_HOSTS,
  MAIN_WORLD_API_BASE,
  MAIN_WORLD_HOST,
  MAIN_WORLD_ORIGIN,
  resolveMainWorldBaseUrl,
} from "./main-world";

describe("Main World base URL", () => {
  it("defaults the live world host to world1.v0peer.org", () => {
    expect(MAIN_WORLD_HOST).toBe("world1.v0peer.org");
    expect(MAIN_WORLD_ORIGIN).toBe("https://world1.v0peer.org");
    expect(MAIN_WORLD_API_BASE).toBe("https://world1.v0peer.org/api/agent-play");
  });

  it("treats agent-play.com hosts as the same World 1 deployment", () => {
    expect(LEGACY_MAIN_WORLD_HOSTS).toEqual([
      "agent-play.com",
      "www.agent-play.com",
      "playworld.world",
    ]);
  });

  it("uses world1.v0peer.org when no override is set", () => {
    expect(resolveMainWorldBaseUrl()).toBe("https://world1.v0peer.org");
    expect(resolveMainWorldBaseUrl({ envValue: undefined })).toBe(
      "https://world1.v0peer.org",
    );
    expect(resolveMainWorldBaseUrl({ envValue: "  " })).toBe(
      "https://world1.v0peer.org",
    );
  });

  it("strips a trailing slash from a configured Main World origin", () => {
    expect(
      resolveMainWorldBaseUrl({
        envValue: "https://world1.v0peer.org/",
      }),
    ).toBe("https://world1.v0peer.org");
  });
});
