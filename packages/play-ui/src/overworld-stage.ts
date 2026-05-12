/**
 * @packageDocumentation
 * @module @agent-play/play-ui/overworld-stage
 *
 * Wraps the existing `worldRoot` Pixi container into a {@link StageHandle}
 * so it can be mounted by the {@link createStageController | stage controller}.
 *
 * The overworld stage owns the agents, structures, street art, and grid
 * graphics that make up the top-level walking world. Lifecycle hooks
 * (`attach`, `detach`, `destroy`) are forwarded to the host so it can wire
 * its module-scoped resources without this thin adapter needing to know
 * about them.
 *
 * @see ./stage-controller.ts for the controller that drives transitions.
 * @see ./main.ts for the host that creates this stage during bootstrap.
 */

import type { StageHandle, StageRoot } from "./stage-controller.js";

/**
 * Options accepted by {@link createOverworldStage}.
 *
 * @public
 */
export type CreateOverworldStageOptions = {
  /** The pre-built world root container. */
  root: StageRoot;
  /** Called when the stage is mounted onto the parent container. */
  attach?: () => void;
  /** Called when the stage is unmounted but retained on the history stack. */
  detach?: () => void;
  /** Called when the stage is permanently removed from the controller. */
  destroy?: () => void;
  /** Called when the host theme changes and the stage must rebuild visuals. */
  rebuildForTheme?: () => void;
  /** Called when a fresh preview snapshot arrives. */
  onSnapshot?: (snap: unknown) => void;
};

/**
 * Build the overworld {@link StageHandle}.
 *
 * @example
 * ```ts
 * const stage = createOverworldStage({
 *   root: worldRoot,
 *   attach: () => app.ticker.add(onTick),
 *   detach: () => app.ticker.remove(onTick),
 * });
 * controller.enter(stage);
 * ```
 *
 * @public
 */
export const createOverworldStage = (
  options: CreateOverworldStageOptions
): StageHandle => {
  const noop = (): void => {};
  return {
    id: "overworld",
    root: options.root,
    attach: options.attach ?? noop,
    detach: options.detach ?? noop,
    destroy: options.destroy ?? noop,
    rebuildForTheme: options.rebuildForTheme,
    onSnapshot: options.onSnapshot,
  };
};
