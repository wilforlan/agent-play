import { describe, expect, it } from "vitest";
import {
  agentStableKeyFromToPlayerId,
  buildIntercomAddress,
  buildIntercomChannelKey,
  encodeHumanStableKeyForIntercom,
  parseIntercomAddressParts,
  parseIntercomAddress,
} from "./channels.js";

describe("intercom channel keys", () => {
  it("uses trimmed human node id as the human segment (no JSON wrapper)", () => {
    expect(encodeHumanStableKeyForIntercom("  node-a  ")).toBe("node-a");
  });

  it("builds deterministic channel key: human hash, single agent segment", () => {
    const genesis =
      "360fb35cf9a02e29400fad25ddc19fac1c035d1efea8f26f2e66f771c658dfc6";
    const agentLeaf =
      "b2bffffd3e73e975c3aef60f6c15bdd84165fc548583c8553fb8119f92550f4d";
    const k = buildIntercomChannelKey({
      humanNodeId: genesis,
      agentStableKey: `agent:${agentLeaf}`,
    });
    expect(k).toBe(
      `intercom:human:${genesis}:agent:${agentLeaf}`
    );
  });

  it("builds channel key from human node and prefixed agent stable key", () => {
    const k = buildIntercomChannelKey({
      humanNodeId: "main-1",
      agentStableKey: "agent:ag-9",
    });
    expect(k).toBe("intercom:human:main-1:agent:ag-9");
  });

  it("prefixes bare agent id with agent:", () => {
    expect(agentStableKeyFromToPlayerId("ag-1")).toBe("agent:ag-1");
    expect(agentStableKeyFromToPlayerId("agent:ag-1")).toBe("agent:ag-1");
  });

  it("builds canonical ap-intercom URI from node id", () => {
    expect(buildIntercomAddress("node-m1")).toBe("ap-intercom://node-m1");
  });

  it("parses ap-intercom URI to node id", () => {
    expect(parseIntercomAddress("ap-intercom://node-m1")).toBe("node-m1");
  });

  it("parses third-party intercom URI protocol and value", () => {
    expect(
      parseIntercomAddressParts(
        "gm-intercom://6465f64e6c8fdaa2dfad3a0693662e5d4b2803d30c49f0e961fa6ef0914066a2"
      )
    ).toEqual({
      protocol: "gm-intercom",
      value:
        "6465f64e6c8fdaa2dfad3a0693662e5d4b2803d30c49f0e961fa6ef0914066a2",
    });
  });

  it("throws for invalid intercom address format", () => {
    expect(() => parseIntercomAddress("intercom:human:m1:agent:a1")).toThrow();
    expect(() => parseIntercomAddress("ap-intercom://")).toThrow();
    expect(() => parseIntercomAddress("://node-m1")).toThrow();
  });
});
