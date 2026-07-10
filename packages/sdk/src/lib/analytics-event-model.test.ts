import { describe, expect, it } from "vitest";
import {
  ANALYTICS_EVENT_NAMES,
  AnalyticsEventSchema,
  AnalyticsTraitsSchema,
} from "./analytics-event-model.js";

describe("analytics-event-model", () => {
  it("parses a track event with properties", () => {
    const event = AnalyticsEventSchema.parse({
      messageId: "msg-1",
      event: ANALYTICS_EVENT_NAMES.purchaseCompleted,
      distinctId: "node-1",
      timestamp: "2026-01-01T00:00:00.000Z",
      properties: {
        spaceId: "space-1",
        priceUsd: 12.5,
        backfilled: false,
      },
      context: {
        hostId: "default",
        library: "agent-play-server",
      },
    });
    expect(event.properties.priceUsd).toBe(12.5);
  });

  it("parses identify traits", () => {
    const traits = AnalyticsTraitsSchema.parse({
      distinctId: "node-1",
      traits: { walletBalanceUsd: 10, powerUps: 3 },
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    expect(traits.traits.powerUps).toBe(3);
  });
});
