import { describe, expect, it } from "vitest";
import {
  GEOGRAPHY_MEMBER_CAP,
  GEOGRAPHY_MESH_DEGREE_MAX,
} from "@agent-play/geography-mesh";
import {
  computeAllNeighborPayloads,
  computeNeighborsForMember,
  parseGeographyMember,
} from "./geography-membership.js";

describe("geography-membership", () => {
  it("parses a member record", () => {
    const member = parseGeographyMember({
      humanId: "h1",
      name: "Ada",
      x: 1,
      y: 2,
      joinedAt: 10,
      coarseRevisedAt: 11,
    });
    expect(member.humanId).toBe("h1");
  });

  it("computes AOI neighbors capped at degree max", () => {
    const members = new Map(
      Array.from({ length: 20 }, (_, i) => {
        const humanId = `h${i}`;
        const member = parseGeographyMember({
          humanId,
          name: humanId,
          x: i,
          y: 0,
          joinedAt: 1,
          coarseRevisedAt: 1,
        });
        return [humanId, member] as const;
      })
    );
    const result = computeNeighborsForMember({
      selfId: "h0",
      members,
      nowMs: 1000,
    });
    expect(result.neighborIds).toHaveLength(GEOGRAPHY_MESH_DEGREE_MAX);
    expect(result.truncated).toBe(true);
    expect(result.memberCount).toBe(20);
  });

  it("computes neighbor payloads for every member", () => {
    const members = new Map([
      [
        "a",
        parseGeographyMember({
          humanId: "a",
          name: "A",
          x: 0,
          y: 0,
          joinedAt: 1,
          coarseRevisedAt: 1,
        }),
      ],
      [
        "b",
        parseGeographyMember({
          humanId: "b",
          name: "B",
          x: 1,
          y: 0,
          joinedAt: 1,
          coarseRevisedAt: 1,
        }),
      ],
    ]);
    const payloads = computeAllNeighborPayloads({ members, nowMs: 1 });
    expect(payloads).toHaveLength(2);
    expect(payloads.find((p) => p.humanId === "a")?.neighborIds).toEqual([
      "b",
    ]);
  });

  it("exports the locked membership cap", () => {
    expect(GEOGRAPHY_MEMBER_CAP).toBe(100);
  });
});
