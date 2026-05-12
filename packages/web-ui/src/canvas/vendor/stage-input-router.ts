/**
 * @packageDocumentation
 * @module @agent-play/play-ui/stage-input-router
 *
 * Pure key-mapping logic for the world-switch input flow.
 *
 * The router translates a keyboard event + current stage + proximity
 * context into a {@link StageInputAction} so the production key handler
 * (and tests) stay tiny and assertable.
 *
 * @see ./main.ts for the host that consumes these actions.
 * @see ./proximity-interaction.ts — the existing proximity layer this
 *      router slots beside.
 */

import type { StageId } from "./stage-controller.js";

/**
 * Object-centric proximity partner kinds the router knows about.
 *
 * @public
 */
export type StageProximityPartnerKind =
  | "none"
  | "agent"
  | "structure"
  | "amenityPad"
  | "amenityItem"
  | "exitDoor";

/**
 * Action selected by the router.
 *
 * @public
 */
export type StageInputAction =
  | { kind: "noop" }
  | { kind: "enterSpace" }
  | { kind: "enterAmenity" }
  | { kind: "openItemTooltip" }
  | { kind: "backToPrevious" };

/**
 * Pure router: returns the action the host should run for the given
 * keyboard event + current stage + nearest proximity partner.
 *
 * @example
 * ```ts
 * const action = routeStageInput({
 *   key: "Escape",
 *   stageId: "spaceYard",
 *   partnerKind: "none",
 * });
 * if (action.kind === "backToPrevious") void controller.back();
 * ```
 *
 * @public
 */
export const routeStageInput = (input: {
  key: string;
  stageId: StageId;
  partnerKind: StageProximityPartnerKind;
}): StageInputAction => {
  if (input.key === "Escape") {
    if (input.stageId !== "overworld") {
      return { kind: "backToPrevious" };
    }
    return { kind: "noop" };
  }
  const lower = input.key.toLowerCase();
  if (input.stageId === "overworld" && lower === "a") {
    if (input.partnerKind === "structure") return { kind: "enterSpace" };
  }
  if (input.stageId === "spaceYard" && lower === "p") {
    if (input.partnerKind === "amenityPad")
      return { kind: "enterAmenity" };
  }
  if (
    (input.stageId === "amenityShop" ||
      input.stageId === "amenitySupermarket" ||
      input.stageId === "amenityCarWash") &&
    lower === "p"
  ) {
    if (input.partnerKind === "amenityItem")
      return { kind: "openItemTooltip" };
  }
  return { kind: "noop" };
};
