import { describe, expect, it } from "vitest";
import {
  createEmptyParkingStreetContent,
  ParkingStreetContentSchema,
} from "@agent-play/sdk/browser";
import {
  buildParkingCarSelectionOptions,
  hasSelectableParkingCar,
} from "./parking-car-selection.js";

const streetWithParkedCar = (input: {
  carPurchaseId: string;
  expiresAt: string | null;
}): ReturnType<typeof createEmptyParkingStreetContent> => {
  const content = createEmptyParkingStreetContent();
  const spot = content.spots[0];
  if (spot === undefined) {
    throw new Error("spot");
  }
  return ParkingStreetContentSchema.parse({
    ...content,
    spots: content.spots.map((s) =>
      s.id === spot.id
        ? {
            ...s,
            occupant: {
              nodeId: "node-a",
              carPurchaseId: input.carPurchaseId,
              displayNick: "Parked",
              colorHex: "#ff0000",
              model: "GT",
              tier: input.expiresAt === null ? ("forever" as const) : ("1h" as const),
              purchasedAt: "2026-01-01T00:00:00.000Z",
              expiresAt: input.expiresAt,
            },
          }
        : s
    ),
  });
};

describe("buildParkingCarSelectionOptions", () => {
  it("disables a car that is actively parked", () => {
    const options = buildParkingCarSelectionOptions({
      cars: [
        { purchaseId: "car-1", label: "GT 350" },
        { purchaseId: "car-2", label: "Sedan" },
      ],
      parkingStreet: streetWithParkedCar({
        carPurchaseId: "car-1",
        expiresAt: "2026-01-01T01:00:00.000Z",
      }),
      nowIso: "2026-01-01T00:30:00.000Z",
    });
    expect(options).toEqual([
      {
        purchaseId: "car-1",
        label: "GT 350 — parked until ticket expires",
        disabled: true,
        disabledReason: "Car is already parked",
      },
      {
        purchaseId: "car-2",
        label: "Sedan",
        disabled: false,
        disabledReason: null,
      },
    ]);
    expect(hasSelectableParkingCar(options)).toBe(true);
  });

  it("makes a car selectable again after parking expiry", () => {
    const options = buildParkingCarSelectionOptions({
      cars: [{ purchaseId: "car-1", label: "GT 350" }],
      parkingStreet: streetWithParkedCar({
        carPurchaseId: "car-1",
        expiresAt: "2026-01-01T01:00:00.000Z",
      }),
      nowIso: "2026-01-01T02:00:00.000Z",
    });
    expect(options[0]?.disabled).toBe(false);
    expect(hasSelectableParkingCar(options)).toBe(true);
  });

  it("reports no selectable cars when every car is parked", () => {
    const options = buildParkingCarSelectionOptions({
      cars: [{ purchaseId: "car-1", label: "GT 350" }],
      parkingStreet: streetWithParkedCar({
        carPurchaseId: "car-1",
        expiresAt: null,
      }),
      nowIso: "2026-01-01T00:30:00.000Z",
    });
    expect(options[0]?.disabled).toBe(true);
    expect(hasSelectableParkingCar(options)).toBe(false);
  });
});
