import { describe, expect, it } from "vitest";
import {
  canCarAcquireParkingSpot,
  canNodeAcquireParkingSpot,
  MAX_SLOTS_WITH_FOREVER,
  MAX_TIMED_PARKING_SLOTS_PER_NODE,
  type ParkingCarOccupancyRef,
  type ParkingOccupancyRef,
} from "./parking-ownership.js";

const ref = (
  nodeId: string,
  tier: ParkingOccupancyRef["tier"],
  expiresAt: string | null = "2099-01-01T00:00:00.000Z"
): ParkingOccupancyRef => ({ nodeId, tier, expiresAt });

const carRef = (
  carPurchaseId: string,
  expiresAt: string | null = "2099-01-01T00:00:00.000Z"
): ParkingCarOccupancyRef => ({ carPurchaseId, expiresAt });

describe("canCarAcquireParkingSpot", () => {
  it("allows parking when the car is not actively parked", () => {
    expect(
      canCarAcquireParkingSpot({
        carPurchaseId: "car-1",
        activeCars: [carRef("car-2")],
      })
    ).toEqual({ ok: true });
  });

  it("rejects parking when the same car is already parked elsewhere", () => {
    expect(
      canCarAcquireParkingSpot({
        carPurchaseId: "car-1",
        activeCars: [carRef("car-1"), carRef("car-2")],
      })
    ).toEqual({ ok: false, error: "CAR_ALREADY_PARKED" });
  });

  it("allows parking again after the prior occupancy has expired", () => {
    expect(
      canCarAcquireParkingSpot({
        carPurchaseId: "car-1",
        activeCars: [],
      })
    ).toEqual({ ok: true });
  });

  it("rejects forever-parked cars until parking ends", () => {
    expect(
      canCarAcquireParkingSpot({
        carPurchaseId: "car-forever",
        activeCars: [carRef("car-forever", null)],
      })
    ).toEqual({ ok: false, error: "CAR_ALREADY_PARKED" });
  });
});

describe("canNodeAcquireParkingSpot", () => {
  it("allows first timed spot when node has none", () => {
    expect(
      canNodeAcquireParkingSpot({
        nodeId: "node-a",
        tier: "1h",
        active: [],
      })
    ).toEqual({ ok: true });
  });

  it("allows second timed spot", () => {
    expect(
      canNodeAcquireParkingSpot({
        nodeId: "node-a",
        tier: "12h",
        active: [ref("node-a", "1h")],
      })
    ).toEqual({ ok: true });
  });

  it("rejects third timed spot", () => {
    const result = canNodeAcquireParkingSpot({
      nodeId: "node-a",
      tier: "1d",
      active: [ref("node-a", "1h"), ref("node-a", "12h")],
    });
    expect(result).toEqual({ ok: false, error: "PARKING_OWNERSHIP_LIMIT" });
    expect(MAX_TIMED_PARKING_SLOTS_PER_NODE).toBe(2);
  });

  it("rejects any new spot when node holds forever", () => {
    const result = canNodeAcquireParkingSpot({
      nodeId: "node-a",
      tier: "1h",
      active: [ref("node-a", "forever", null)],
    });
    expect(result).toEqual({ ok: false, error: "PARKING_FOREVER_LIMIT" });
    expect(MAX_SLOTS_WITH_FOREVER).toBe(1);
  });

  it("rejects forever when node already has a timed spot", () => {
    const result = canNodeAcquireParkingSpot({
      nodeId: "node-a",
      tier: "forever",
      active: [ref("node-a", "1h")],
    });
    expect(result).toEqual({ ok: false, error: "PARKING_FOREVER_LIMIT" });
  });

  it("allows forever only when node has zero active spots", () => {
    expect(
      canNodeAcquireParkingSpot({
        nodeId: "node-a",
        tier: "forever",
        active: [],
      })
    ).toEqual({ ok: true });
  });

  it("counts double-parked layers toward timed limit", () => {
    const result = canNodeAcquireParkingSpot({
      nodeId: "node-a",
      tier: "1d",
      active: [
        ref("node-a", "1h"),
        ref("node-a", "12h"),
      ],
    });
    expect(result.ok).toBe(false);
  });
});
