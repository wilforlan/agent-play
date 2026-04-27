import { describe, expect, it, vi } from "vitest";
import { executeAgentCapability } from "./execute-agent-capability.js";

describe("executeAgentCapability", () => {
  it("uses canonical ap-intercom address when payload has no explicit address", async () => {
    const world = {
      recordInteraction: vi.fn(async () => ({})),
    };

    const result = await executeAgentCapability({
      world,
      payload: {
        requestId: "req-1",
        mainNodeId: "human-main",
        fromPlayerId: "human-main",
        toPlayerId: "agent-1",
        kind: "chat",
        text: "hello",
      },
    });

    expect(result).toEqual({
      channelKey: "intercom:human:human-main:agent:agent-1",
      intercomAddress: "ap-intercom://human-main",
    });
    expect(world.recordInteraction).toHaveBeenCalledWith({
      playerId: "agent-1",
      role: "user",
      text: "hello",
    });
  });

  it("resolves ap-intercom payload address to channel key by node id", async () => {
    const world = {
      recordInteraction: vi.fn(async () => ({})),
    };

    const result = await executeAgentCapability({
      world,
      payload: {
        requestId: "req-2",
        mainNodeId: "human-main",
        fromPlayerId: "human-main",
        toPlayerId: "agent-1",
        kind: "chat",
        text: "hello",
        intercomAddress: "ap-intercom://human-direct",
      },
    });

    expect(result).toEqual({
      channelKey: "intercom:human:human-direct:agent:agent-1",
      intercomAddress: "ap-intercom://human-direct",
    });
  });

  it("accepts third-party intercom protocol and maps value to human node", async () => {
    const world = {
      recordInteraction: vi.fn(async () => ({})),
    };

    const result = await executeAgentCapability({
      world,
      payload: {
        requestId: "req-3",
        mainNodeId: "human-main",
        fromPlayerId: "human-main",
        toPlayerId: "agent-1",
        kind: "assist",
        toolName: "doThing",
        args: {},
        intercomAddress:
          "gm-intercom://6465f64e6c8fdaa2dfad3a0693662e5d4b2803d30c49f0e961fa6ef0914066a2",
      },
    });

    expect(result).toEqual({
      channelKey:
        "intercom:human:6465f64e6c8fdaa2dfad3a0693662e5d4b2803d30c49f0e961fa6ef0914066a2:agent:agent-1",
      intercomAddress:
        "gm-intercom://6465f64e6c8fdaa2dfad3a0693662e5d4b2803d30c49f0e961fa6ef0914066a2",
    });
  });

  it("forwards realtime command without minting server-side credentials", async () => {
    const world = {
      recordInteraction: vi.fn(async () => ({})),
    };
    const result = await executeAgentCapability({
      world,
      payload: {
        requestId: "req-rt",
        mainNodeId: "human-main",
        fromPlayerId: "human-main",
        toPlayerId: "agent-rt",
        kind: "realtime",
      },
    });
    expect(result).toEqual({
      channelKey: "intercom:human:human-main:agent:agent-rt",
      intercomAddress: "ap-intercom://human-main",
    });
  });
});
