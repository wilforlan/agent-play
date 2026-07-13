import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyParkingStreetContent } from "@agent-play/sdk/browser";
import {
  createParkingExpiryScheduler,
  nextParkingExpiryMs,
} from "./parking-expiry-schedule.js";

describe("nextParkingExpiryMs", () => {
  it("returns the earliest future expiresAt among timed occupants", () => {
    const content = createEmptyParkingStreetContent();
    const soon = content.spots[0];
    const later = content.spots[1];
    if (soon === undefined || later === undefined) {
      throw new Error("spots");
    }
    const street = {
      ...content,
      spots: content.spots.map((s) => {
        if (s.id === soon.id) {
          return {
            ...s,
            occupant: {
              nodeId: "a",
              carPurchaseId: "p1",
              displayNick: "A",
              colorHex: "#ff0000",
              model: "GT",
              tier: "1h" as const,
              purchasedAt: "2026-01-01T00:00:00.000Z",
              expiresAt: "2026-01-01T01:00:00.000Z",
            },
          };
        }
        if (s.id === later.id) {
          return {
            ...s,
            occupant: {
              nodeId: "b",
              carPurchaseId: "p2",
              displayNick: "B",
              colorHex: "#00ff00",
              model: "GT",
              tier: "1h" as const,
              purchasedAt: "2026-01-01T00:00:00.000Z",
              expiresAt: "2026-01-01T02:00:00.000Z",
            },
          };
        }
        return s;
      }),
    };
    expect(nextParkingExpiryMs(street, Date.parse("2026-01-01T00:30:00.000Z"))).toBe(
      Date.parse("2026-01-01T01:00:00.000Z")
    );
  });

  it("returns null when no timed occupants remain active", () => {
    const content = createEmptyParkingStreetContent();
    expect(nextParkingExpiryMs(content, Date.now())).toBeNull();
  });
});

describe("createParkingExpiryScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onExpire at the next expiry boundary and reschedules", () => {
    const content = createEmptyParkingStreetContent();
    const spot = content.spots[0];
    if (spot === undefined) {
      throw new Error("spot");
    }
    const street = {
      ...content,
      spots: content.spots.map((s) =>
        s.id === spot.id
          ? {
              ...s,
              occupant: {
                nodeId: "a",
                carPurchaseId: "p1",
                displayNick: "A",
                colorHex: "#ff0000",
                model: "GT",
                tier: "1h" as const,
                purchasedAt: "2026-01-01T00:00:00.000Z",
                expiresAt: "2026-01-01T01:00:00.000Z",
              },
            }
          : s
      ),
    };
    let current = street;
    const onExpire = vi.fn(() => {
      current = createEmptyParkingStreetContent();
    });
    const scheduler = createParkingExpiryScheduler({
      getStreet: () => current,
      onExpire,
      nowMs: () => Date.parse("2026-01-01T00:00:00.000Z"),
    });
    scheduler.schedule();
    vi.advanceTimersByTime(60 * 60 * 1000 + 50);
    expect(onExpire).toHaveBeenCalledTimes(1);
    scheduler.cancel();
  });
});
