import { describe, expect, it } from "vitest";
import { resolveSnapshotForResponse } from "./resolve-snapshot-for-response.js";
import type { PreviewSnapshotJson } from "./preview-serialize.js";

const emptyWorldMap: PreviewSnapshotJson["worldMap"] = {
  bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  structures: [],
};

const minimalLive = (sid: string): PreviewSnapshotJson => ({
  sid,
  players: [],
  worldMap: emptyWorldMap,
});

describe("resolveSnapshotForResponse", () => {
  it("returns live when there is no cache", () => {
    const sid = "session-a";
    const live = minimalLive(sid);
    expect(
      resolveSnapshotForResponse({ sid, live, cached: null })
    ).toBe(live);
  });

  it("returns live when cached session id does not match", () => {
    const sid = "session-a";
    const live = minimalLive(sid);
    const cached: PreviewSnapshotJson = {
      sid: "session-b",
      players: [
        {
          playerId: "p1",
          name: "One",
          structures: [],
        },
      ],
      worldMap: emptyWorldMap,
    };
    expect(resolveSnapshotForResponse({ sid, live, cached })).toBe(live);
  });

  it("returns cached when same sid and cache has more players than live memory", () => {
    const sid = "session-a";
    const live = minimalLive(sid);
    const cached: PreviewSnapshotJson = {
      sid,
      players: [
        {
          playerId: "p1",
          name: "One",
          structures: [],
        },
      ],
      worldMap: emptyWorldMap,
    };
    expect(resolveSnapshotForResponse({ sid, live, cached })).toBe(cached);
  });

  it("returns live when player counts are equal so local state wins on ties", () => {
    const sid = "session-a";
    const live: PreviewSnapshotJson = {
      sid,
      players: [
        {
          playerId: "p1",
          name: "Local",
          structures: [{ id: "s1", kind: "tool", x: 0, y: 0, toolName: "t" }],
        },
      ],
      worldMap: emptyWorldMap,
    };
    const cached: PreviewSnapshotJson = {
      sid,
      players: [
        {
          playerId: "p1",
          name: "Stale",
          structures: [],
        },
      ],
      worldMap: emptyWorldMap,
    };
    expect(resolveSnapshotForResponse({ sid, live, cached })).toBe(live);
  });
});
