import { describe, expect, it } from "vitest";
import { routeStageInput } from "./stage-input-router.js";

describe("stage-input-router", () => {
  it("Esc on overworld is a no-op (back to nowhere)", () => {
    expect(
      routeStageInput({
        key: "Escape",
        stageId: "overworld",
        partnerKind: "none",
      })
    ).toEqual({ kind: "noop" });
  });

  it("Esc on the yard exits to the overworld", () => {
    expect(
      routeStageInput({
        key: "Escape",
        stageId: "spaceYard",
        partnerKind: "none",
      })
    ).toEqual({ kind: "backToPrevious" });
  });

  it("Esc on an amenity stage exits to the yard", () => {
    expect(
      routeStageInput({
        key: "Escape",
        stageId: "amenityShop",
        partnerKind: "none",
      })
    ).toEqual({ kind: "backToPrevious" });
  });

  it("'A' near a structure on the overworld enters the space", () => {
    expect(
      routeStageInput({
        key: "a",
        stageId: "overworld",
        partnerKind: "structure",
      })
    ).toEqual({ kind: "enterSpace" });
  });

  it("'A' on the overworld with no structure partner is a no-op", () => {
    expect(
      routeStageInput({
        key: "a",
        stageId: "overworld",
        partnerKind: "none",
      })
    ).toEqual({ kind: "noop" });
  });

  it("'P' on the yard near a pad enters the amenity", () => {
    expect(
      routeStageInput({
        key: "p",
        stageId: "spaceYard",
        partnerKind: "amenityPad",
      })
    ).toEqual({ kind: "enterAmenity" });
  });

  it("'P' on an amenity stage near an item opens the tooltip", () => {
    expect(
      routeStageInput({
        key: "p",
        stageId: "amenityCarWash",
        partnerKind: "amenityItem",
      })
    ).toEqual({ kind: "openItemTooltip" });
  });

  it("returns noop when the key/stage combination has no mapping", () => {
    expect(
      routeStageInput({
        key: "x",
        stageId: "spaceYard",
        partnerKind: "amenityPad",
      })
    ).toEqual({ kind: "noop" });
  });
});
