// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { HouseSlot } from "@agent-play/sdk/browser";
import { buildHouseInteriorStage } from "./house-interior-stage.js";

const vacantHouse = (houseId: 1 | 2 | 3 | 4): HouseSlot => ({
  id: `house-${String(houseId)}`,
  houseId,
  bay: houseId,
  worldX: 3,
  priceUsd: 1299.99,
  layoutId: houseId,
  layoutLabel: "Studio layout",
  ownerNodeId: null,
  ownerDisplayName: null,
  ownerName: null,
  ownerSignature: null,
  purchasedAt: null,
});

const ownedHouse = (houseId: 1 | 2 | 3 | 4): HouseSlot => ({
  ...vacantHouse(houseId),
  ownerNodeId: "node-a",
  ownerDisplayName: "Alex · AK",
  ownerName: "Alex Kim",
  ownerSignature: "AK",
  purchasedAt: "2026-05-12T00:00:00.000Z",
});

describe("house-interior-stage", () => {
  it("builds inspect stage with purchase panel when house is vacant", () => {
    const handle = buildHouseInteriorStage({
      cellScale: 32,
      house: vacantHouse(1),
      mode: "inspect",
    });
    expect(handle.id).toBe("houseInterior");
    expect(handle.showPurchasePanel).toBe(true);
    expect(handle.purchaseAnchor).not.toBeNull();
    handle.destroy();
  });

  it("hides purchase panel in owner mode", () => {
    const handle = buildHouseInteriorStage({
      cellScale: 32,
      house: ownedHouse(2),
      mode: "owner",
    });
    expect(handle.showPurchasePanel).toBe(false);
    handle.destroy();
  });

  it("shows ownership panel for owned houses in inspect mode", () => {
    const handle = buildHouseInteriorStage({
      cellScale: 32,
      house: ownedHouse(3),
      mode: "inspect",
    });
    expect(handle.showPurchasePanel).toBe(false);
    expect(handle.showOwnershipPanel).toBe(true);
    expect(handle.ownerDisplayName).toBe("Alex · AK");
    expect(handle.ownershipPanelLines.some((line) => line.includes("Alex Kim"))).toBe(
      true
    );
    handle.destroy();
  });

  it("shows ownership panel for owned houses in owner mode", () => {
    const handle = buildHouseInteriorStage({
      cellScale: 32,
      house: ownedHouse(2),
      mode: "owner",
    });
    expect(handle.showOwnershipPanel).toBe(true);
    expect(handle.ownershipPanelLines.length).toBeGreaterThan(3);
    handle.destroy();
  });

  it("clamps player inside house bounds", () => {
    const handle = buildHouseInteriorStage({
      cellScale: 32,
      house: vacantHouse(4),
      mode: "inspect",
    });
    const clamped = handle.clampPosition({ x: 99, y: -5 });
    expect(clamped.x).toBeLessThan(99);
    expect(clamped.y).toBeGreaterThanOrEqual(0);
    handle.destroy();
  });
});
