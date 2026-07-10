import { describe, expect, it } from "vitest";
import { resolveSpaceOwnerWalletPlayerId } from "./resolve-space-owner-wallet.js";

describe("resolveSpaceOwnerWalletPlayerId", () => {
  it("returns owner.nodeId when present on the space catalog row", () => {
    const id = resolveSpaceOwnerWalletPlayerId(
      {
        spaces: [
          {
            id: "space-1",
            name: "Test",
            description: "",
            designKey: "d",
            owner: { displayName: "Owner", nodeId: "node:space-owner" },
            amenities: ["shop"],
          },
        ],
      } as never,
      "space-1"
    );
    expect(id).toBe("node:space-owner");
  });

  it("returns null when owner.nodeId is missing", () => {
    const id = resolveSpaceOwnerWalletPlayerId(
      {
        spaces: [
          {
            id: "space-1",
            name: "Test",
            description: "",
            designKey: "d",
            owner: { displayName: "Owner" },
            amenities: ["shop"],
          },
        ],
      } as never,
      "space-1"
    );
    expect(id).toBeNull();
  });
});
