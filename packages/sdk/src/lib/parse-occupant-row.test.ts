import { describe, expect, it } from "vitest";
import { parseAgentOccupantRow } from "./parse-occupant-row.js";

describe("parseAgentOccupantRow", () => {
  it("parses realtimeWebrtc when payload is complete", () => {
    const parsed = parseAgentOccupantRow({
      kind: "agent",
      agentId: "agent-1",
      name: "Agent One",
      x: 1,
      y: 2,
      realtimeWebrtc: {
        clientSecret: "cs_test_123",
        model: "gpt-realtime",
        expiresAt: "2026-01-01T00:00:00.000Z",
        voice: "marin",
      },
      realtimeInstructions: "You are Agent One.",
    });

    expect(parsed.realtimeInstructions).toBe("You are Agent One.");
    expect(parsed.realtimeWebrtc).toEqual({
      clientSecret: "cs_test_123",
      model: "gpt-realtime",
      expiresAt: "2026-01-01T00:00:00.000Z",
      voice: "marin",
    });
  });

  it("ignores realtimeWebrtc when required fields are missing", () => {
    const parsed = parseAgentOccupantRow({
      kind: "agent",
      agentId: "agent-1",
      name: "Agent One",
      x: 1,
      y: 2,
      realtimeWebrtc: {
        clientSecret: "",
      },
    });

    expect(parsed.realtimeWebrtc).toBeUndefined();
  });
});
