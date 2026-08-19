/**
 * @module @agent-play/play-ui/proximity-p-action
 * Pure resolver for the proximity pad `P` / keyboard `P` action.
 *
 * Keeps touch-bar and keyboard routing on the same precedence so peer Talk
 * cannot be reachable from one input path and dead on the other.
 */

export type ProximityPActionKind =
  | "noop"
  | "peerHangup"
  | "housePurchaseToggle"
  | "gameStageActivate"
  | "houseInspect"
  | "parkingCycle"
  | "amenityItemCycle"
  | "yardAmenityEnter"
  | "peerTalkStart"
  | "agentPushToTalk";

export type ResolveProximityPActionOptions = {
  peerTalkLabel: string | null;
  isInPeerCall: boolean;
  inHouseInterior: boolean;
  hasActivatableGameStageTarget: boolean;
  hasHouseNearest: boolean;
  hasParkingNearest: boolean;
  hasAmenityItem: boolean;
  hasYardAmenityPad: boolean;
  hasAgentPartner: boolean;
};

/**
 * Resolve what `P` should do from the current proximity / call context.
 *
 * Precedence matches the proximity touch-bar `onPushToTalk` path: hang up an
 * active peer call first, then enclosed-stage P targets, then a nearby member,
 * then overworld objects.
 */
export const resolveProximityPAction = (
  options: ResolveProximityPActionOptions
): ProximityPActionKind => {
  if (options.peerTalkLabel === "End" || options.isInPeerCall) {
    return "peerHangup";
  }
  if (options.inHouseInterior) {
    return "housePurchaseToggle";
  }
  if (options.hasActivatableGameStageTarget) {
    return "gameStageActivate";
  }
  if (options.hasAmenityItem) {
    return "amenityItemCycle";
  }
  if (options.hasAgentPartner) {
    return "agentPushToTalk";
  }
  if (options.peerTalkLabel !== null) {
    return "peerTalkStart";
  }
  if (options.hasHouseNearest) {
    return "houseInspect";
  }
  if (options.hasParkingNearest) {
    return "parkingCycle";
  }
  if (options.hasYardAmenityPad) {
    return "yardAmenityEnter";
  }
  return "noop";
};
