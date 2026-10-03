import { describe, expect, it } from "vitest";
import { amenityOwnershipFlags } from "./amenity-ownership.js";

describe("amenityOwnershipFlags", () => {
  it("marks another player's sold item as sold", () => {
    expect(
      amenityOwnershipFlags({
        sale: { status: "sold", soldToPlayerId: "owner-a" },
        viewerPlayerId: "viewer-b",
      })
    ).toEqual({ sold: true, mine: false });
  });

  it("marks the viewer's owned item as mine", () => {
    expect(
      amenityOwnershipFlags({
        sale: { status: "sold", soldToPlayerId: "viewer-b" },
        viewerPlayerId: "viewer-b",
      })
    ).toEqual({ sold: false, mine: true });
  });

  it("marks the viewer's transfer listing as mine without sold overlay", () => {
    expect(
      amenityOwnershipFlags({
        sale: {
          status: "transfer_available",
          soldToPlayerId: "viewer-b",
        },
        viewerPlayerId: "viewer-b",
      })
    ).toEqual({ sold: false, mine: true });
  });

  it("leaves primary available items unmarked", () => {
    expect(
      amenityOwnershipFlags({
        sale: { status: "available" },
        viewerPlayerId: "viewer-b",
      })
    ).toEqual({ sold: false, mine: false });
  });
});
