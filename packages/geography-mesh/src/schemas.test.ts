import { describe, expect, it } from "vitest";
import {
  GeographyCoarseBodySchema,
  GeographyMembershipBodySchema,
  GeographyNeighborsPayloadSchema,
  GeographySignalBodySchema,
} from "./schemas.js";

describe("geography wire schemas", () => {
  it("parses membership join and leave", () => {
    expect(
      GeographyMembershipBodySchema.parse({
        action: "join",
        humanId: "h1",
        name: "Ada",
        x: 1,
        y: 2,
      }).action
    ).toBe("join");
    expect(
      GeographyMembershipBodySchema.parse({
        action: "leave",
        humanId: "h1",
      }).action
    ).toBe("leave");
  });

  it("parses coarse and signal and neighbors payloads", () => {
    expect(
      GeographyCoarseBodySchema.parse({
        humanId: "h1",
        x: 3,
        y: 4,
      })
    ).toMatchObject({ humanId: "h1", x: 3, y: 4 });
    expect(
      GeographySignalBodySchema.parse({
        fromHumanId: "a",
        toHumanId: "b",
        kind: "offer",
        payload: { type: "offer", sdp: "x" },
      }).kind
    ).toBe("offer");
    expect(
      GeographyNeighborsPayloadSchema.parse({
        humanId: "a",
        neighborIds: ["b", "c"],
        truncated: true,
        memberCount: 20,
      }).truncated
    ).toBe(true);
  });
});
