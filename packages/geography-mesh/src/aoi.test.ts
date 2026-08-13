import { describe, expect, it } from "vitest";
import {
  GEOGRAPHY_MEMBER_CAP,
  GEOGRAPHY_MESH_DEGREE_MAX,
} from "./constants.js";
import {
  selectAoiNeighbors,
  type AoiMemberInput,
  type AoiSelectionState,
} from "./aoi.js";

const at = (
  humanId: string,
  x: number,
  y: number,
  stage: "overworld" | "space" | "amenity" = "overworld"
): AoiMemberInput => ({ humanId, x, y, stage });

describe("selectAoiNeighbors", () => {
  it("excludes self and ranks by distance", () => {
    const self = at("self", 0, 0);
    const members = [
      self,
      at("far", 100, 0),
      at("near", 1, 0),
      at("mid", 10, 0),
    ];
    const result = selectAoiNeighbors({
      selfId: "self",
      selfPos: { x: 0, y: 0 },
      selfStage: "overworld",
      members,
      degreeMax: 2,
      nowMs: 1_000,
      previous: undefined,
    });
    expect(result.neighborIds).toEqual(["near", "mid"]);
    expect(result.truncated).toBe(true);
  });

  it("caps at degreeMax and sets truncated when more candidates exist", () => {
    const members: AoiMemberInput[] = [at("self", 0, 0)];
    for (let i = 0; i < 20; i += 1) {
      members.push(at(`p${i}`, i + 1, 0));
    }
    const result = selectAoiNeighbors({
      selfId: "self",
      selfPos: { x: 0, y: 0 },
      selfStage: "overworld",
      members,
      degreeMax: GEOGRAPHY_MESH_DEGREE_MAX,
      nowMs: 1_000,
      previous: undefined,
    });
    expect(result.neighborIds).toHaveLength(GEOGRAPHY_MESH_DEGREE_MAX);
    expect(result.truncated).toBe(true);
    expect(result.neighborIds[0]).toBe("p0");
  });

  it("prefers same stage before distance", () => {
    const result = selectAoiNeighbors({
      selfId: "self",
      selfPos: { x: 0, y: 0 },
      selfStage: "overworld",
      members: [
        at("self", 0, 0, "overworld"),
        at("space-near", 1, 0, "space"),
        at("over-far", 50, 0, "overworld"),
      ],
      degreeMax: 1,
      nowMs: 1_000,
      previous: undefined,
    });
    expect(result.neighborIds).toEqual(["over-far"]);
  });

  it("applies hysteresis before dropping a neighbor", () => {
    const members = [
      at("self", 0, 0),
      at("a", 1, 0),
      at("b", 2, 0),
      at("c", 3, 0),
    ];
    const first = selectAoiNeighbors({
      selfId: "self",
      selfPos: { x: 0, y: 0 },
      selfStage: "overworld",
      members,
      degreeMax: 2,
      nowMs: 1_000,
      previous: undefined,
      hysteresisMs: 2_500,
    });
    expect(first.neighborIds).toEqual(["a", "b"]);

    const movedMembers = [
      at("self", 0, 0),
      at("a", 100, 0),
      at("b", 2, 0),
      at("c", 3, 0),
    ];
    const duringGrace = selectAoiNeighbors({
      selfId: "self",
      selfPos: { x: 0, y: 0 },
      selfStage: "overworld",
      members: movedMembers,
      degreeMax: 2,
      nowMs: 2_000,
      previous: first,
      hysteresisMs: 2_500,
    });
    expect(duringGrace.neighborIds).toContain("a");
    expect(duringGrace.neighborIds).toContain("b");

    const afterGrace = selectAoiNeighbors({
      selfId: "self",
      selfPos: { x: 0, y: 0 },
      selfStage: "overworld",
      members: movedMembers,
      degreeMax: 2,
      nowMs: 5_000,
      previous: duringGrace,
      hysteresisMs: 2_500,
    });
    expect(afterGrace.neighborIds).toEqual(["b", "c"]);
  });

  it("does not exceed membership-oriented expectations for dense rooms", () => {
    expect(GEOGRAPHY_MEMBER_CAP).toBe(100);
    expect(GEOGRAPHY_MESH_DEGREE_MAX).toBe(16);
  });

  it("returns empty neighbors when alone", () => {
    const result = selectAoiNeighbors({
      selfId: "self",
      selfPos: { x: 0, y: 0 },
      selfStage: "overworld",
      members: [at("self", 0, 0)],
      degreeMax: 16,
      nowMs: 1_000,
      previous: undefined,
    });
    expect(result.neighborIds).toEqual([]);
    expect(result.truncated).toBe(false);
  });
});

describe("AoiSelectionState shape", () => {
  it("tracks enteredAt by neighbor id", () => {
    const state: AoiSelectionState = {
      neighborIds: ["a"],
      truncated: false,
      enteredAtById: { a: 100 },
      leaveCandidateSinceById: {},
    };
    expect(state.enteredAtById.a).toBe(100);
  });
});
