import { describe, expect, it } from "vitest";
import {
  agentStableKeyFromToPlayerId,
  buildIntercomChannelKey,
  encodeHumanStableKeyForIntercom,
} from "./channels.js";

describe("intercom channel keys", () => {
  it("encodes human stable key as JSON genesis wrapper", () => {
    expect(encodeHumanStableKeyForIntercom("node-a")).toBe(
      JSON.stringify({ __genesis__: "node-a" })
    );
  });

  it("builds deterministic channel key from human node and agent stable key", () => {
    const k = buildIntercomChannelKey({
      humanNodeId: "main-1",
      agentStableKey: "agent:ag-9",
    });
    expect(k).toContain("intercom:human:");
    expect(k).toContain("agent:agent:ag-9");
  });

  it("prefixes bare agent id with agent:", () => {
    expect(agentStableKeyFromToPlayerId("ag-1")).toBe("agent:ag-1");
    expect(agentStableKeyFromToPlayerId("agent:ag-1")).toBe("agent:ag-1");
  });
});
