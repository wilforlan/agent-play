import { describe, expect, it } from "vitest";
import { resolveProximityPAction } from "./proximity-p-action.js";

const idle = {
  peerTalkLabel: null as string | null,
  isInPeerCall: false,
  inHouseInterior: false,
  hasActivatableGameStageTarget: false,
  hasHouseNearest: false,
  hasParkingNearest: false,
  hasAmenityItem: false,
  hasYardAmenityPad: false,
  hasAgentPartner: false,
};

describe("resolveProximityPAction", () => {
  it("starts a peer call when P is Talk and no higher-priority target is active", () => {
    expect(
      resolveProximityPAction({
        ...idle,
        peerTalkLabel: "Talk",
      })
    ).toBe("peerTalkStart");
  });

  it("ends a peer call when the pad label is End", () => {
    expect(
      resolveProximityPAction({
        ...idle,
        peerTalkLabel: "End",
      })
    ).toBe("peerHangup");
  });

  it("ends a peer call when already in a call even without an End label", () => {
    expect(
      resolveProximityPAction({
        ...idle,
        isInPeerCall: true,
      })
    ).toBe("peerHangup");
  });

  it("prefers enclosed amenity item P over starting peer Talk", () => {
    expect(
      resolveProximityPAction({
        ...idle,
        peerTalkLabel: "Talk",
        hasAmenityItem: true,
      })
    ).toBe("amenityItemCycle");
  });

  it("prefers a nearby member over house, parking, yard amenity, and peer Talk", () => {
    expect(
      resolveProximityPAction({
        ...idle,
        hasAgentPartner: true,
        hasHouseNearest: true,
        hasParkingNearest: true,
        hasYardAmenityPad: true,
        peerTalkLabel: "Talk",
      })
    ).toBe("agentPushToTalk");
  });

  it("prefers peer Talk over house inspect when no agent partner is nearby", () => {
    expect(
      resolveProximityPAction({
        ...idle,
        peerTalkLabel: "Talk",
        hasHouseNearest: true,
        hasParkingNearest: true,
        hasYardAmenityPad: true,
      })
    ).toBe("peerTalkStart");
  });

  it("keeps enclosed game-stage P above a nearby member", () => {
    expect(
      resolveProximityPAction({
        ...idle,
        hasAgentPartner: true,
        hasActivatableGameStageTarget: true,
      })
    ).toBe("gameStageActivate");
  });

  it("still hangs up peer calls before amenity P targets", () => {
    expect(
      resolveProximityPAction({
        ...idle,
        peerTalkLabel: "End",
        hasYardAmenityPad: true,
        hasAmenityItem: true,
      })
    ).toBe("peerHangup");
  });

  it("falls back to agent push-to-talk when no peer Talk target exists", () => {
    expect(
      resolveProximityPAction({
        ...idle,
        hasAgentPartner: true,
      })
    ).toBe("agentPushToTalk");
  });

  it("returns noop when nothing is actionable", () => {
    expect(resolveProximityPAction(idle)).toBe("noop");
  });
});
