/**
 * @packageDocumentation
 * @module @agent-play/play-ui/stage-controller
 *
 * Orchestrates transitions between the play-canvas stages (overworld, space
 * yard, and amenity stages). Owns a small stack of {@link StageHandle}
 * instances and animates ease-out / ease-in tweens (`alpha` and uniform
 * `scale`) when one stage replaces another.
 *
 * The controller is intentionally Pixi-agnostic: it operates on minimal
 * {@link StageRoot} / {@link StageContainer} contracts so it can be exercised
 * with stub objects in unit tests. The production wiring in
 * {@link ../main.ts | main.ts} satisfies these contracts with real Pixi
 * `Container` instances.
 *
 * @see ./main.ts for the bootstrap that mounts the overworld stage through
 *      this controller.
 * @see ../../docs/releases/agent-play-3.1.1.md for the user-facing flow.
 */

/**
 * Identifier of a stage the controller can mount.
 *
 * @public
 */
export type StageId =
  | "overworld"
  | "spaceYard"
  | "amenityShop"
  | "amenitySupermarket"
  | "amenityCarWash"
  | "gameHiddenGems"
  | "gameMapRecall"
  | "gamePriceCheck"
  | "gameSignalHunt"
  | "gameDeliveryDash"
  | "gameLeaseLocker"
  | "gameTalkTimer"
  | "houseInterior";

/**
 * Minimal display-object contract the controller animates.
 *
 * @remarks
 * Real call sites pass a Pixi `Container`, but tests use lightweight stubs
 * with the same shape.
 *
 * @public
 */
export type StageRoot = {
  alpha: number;
  scale: { x: number; y: number };
};

/**
 * Minimal scene-graph parent that hosts the currently-mounted stage.
 *
 * @public
 */
export type StageContainer = {
  addChild(child: StageRoot): void;
  removeChild(child: StageRoot): void;
};

/**
 * A stage that can be mounted and animated by the controller.
 *
 * @public
 */
export type StageHandle = {
  readonly id: StageId;
  readonly root: StageRoot;
  attach(): void;
  detach(): void;
  destroy(): void;
  rebuildForTheme?(): void;
  onSnapshot?(snap: unknown): void;
};

/**
 * Options accepted when constructing a {@link StageController}.
 *
 * @public
 */
export type StageControllerOptions = {
  parent: StageContainer;
  /**
   * Tween duration in milliseconds applied to both the out and in phases.
   *
   * @defaultValue `280`
   */
  durationMs?: number;
};

/**
 * Options accepted by {@link StageController.enter}.
 *
 * @public
 */
export type EnterOptions = {
  /**
   * When `true` (default), the outgoing stage is detached and kept on the
   * history stack so a later {@link StageController.back} can return to it.
   * When `false`, the outgoing stage is destroyed.
   *
   * @defaultValue `true`
   */
  keepHistory?: boolean;
};

/**
 * Stage controller surface exposed to callers.
 *
 * @public
 */
export type StageController = {
  enter(next: StageHandle, options?: EnterOptions): Promise<void>;
  back(): Promise<void>;
  current(): StageHandle | null;
  /** Advance any in-flight transition. Called once per frame from the host. */
  update(deltaMs: number): void;
  /** Tear down every stage on the stack and release references. */
  destroy(): void;
};

const DEFAULT_DURATION_MS = 280;
const OUT_SCALE_TARGET = 0.96;
const IN_SCALE_START = 1.04;

type Phase = "idle" | "out" | "in";

type Transition = {
  kind: "enter" | "back";
  outgoing: StageHandle | null;
  incoming: StageHandle;
  keepHistory: boolean;
  phase: Phase;
  elapsedMs: number;
  resolve: () => void;
  reject: (reason: unknown) => void;
};

const easeInOutCubic = (t: number): number => {
  if (t < 0.5) return 4 * t * t * t;
  const u = 2 * t - 2;
  return 0.5 * u * u * u + 1;
};

const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

/**
 * Create a new {@link StageController}.
 *
 * @example
 * ```ts
 * const controller = createStageController({ parent: app.stage });
 * await controller.enter(createOverworldStage());
 * ```
 *
 * @public
 */
export const createStageController = (
  options: StageControllerOptions
): StageController => {
  const parent = options.parent;
  const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;
  const stack: StageHandle[] = [];
  let active: Transition | null = null;

  const startOutPhase = (handle: StageHandle): void => {
    handle.root.alpha = 1;
    handle.root.scale.x = 1;
    handle.root.scale.y = 1;
  };

  const startInPhase = (handle: StageHandle): void => {
    handle.root.alpha = 0;
    handle.root.scale.x = IN_SCALE_START;
    handle.root.scale.y = IN_SCALE_START;
  };

  const beginInForActive = (): void => {
    if (active === null) return;
    parent.addChild(active.incoming.root);
    active.incoming.attach();
    startInPhase(active.incoming);
    active.phase = "in";
    active.elapsedMs = 0;
  };

  const swapForEnter = (): void => {
    if (active === null) return;
    if (active.outgoing !== null) {
      parent.removeChild(active.outgoing.root);
      active.outgoing.detach();
      if (!active.keepHistory) {
        active.outgoing.destroy();
        stack.pop();
      }
    }
    stack.push(active.incoming);
    beginInForActive();
  };

  const swapForBack = (): void => {
    if (active === null) return;
    const outgoing = active.outgoing;
    if (outgoing !== null) {
      parent.removeChild(outgoing.root);
      outgoing.detach();
      outgoing.destroy();
      stack.pop();
    }
    beginInForActive();
  };

  const finishTransition = (): void => {
    if (active === null) return;
    const resolve = active.resolve;
    active = null;
    resolve();
  };

  const update = (deltaMs: number): void => {
    if (active === null) return;
    active.elapsedMs += deltaMs;
    const ratio =
      durationMs <= 0 ? 1 : Math.min(1, active.elapsedMs / durationMs);
    const eased = easeInOutCubic(ratio);

    if (active.phase === "out" && active.outgoing !== null) {
      active.outgoing.root.alpha = lerp(1, 0, eased);
      const s = lerp(1, OUT_SCALE_TARGET, eased);
      active.outgoing.root.scale.x = s;
      active.outgoing.root.scale.y = s;
      if (ratio >= 1) {
        if (active.kind === "enter") swapForEnter();
        else swapForBack();
      }
    } else if (active.phase === "in") {
      active.incoming.root.alpha = lerp(0, 1, eased);
      const s = lerp(IN_SCALE_START, 1, eased);
      active.incoming.root.scale.x = s;
      active.incoming.root.scale.y = s;
      if (ratio >= 1) {
        finishTransition();
      }
    }
  };

  const enter = (
    next: StageHandle,
    enterOptions: EnterOptions = {}
  ): Promise<void> => {
    if (active !== null) {
      return Promise.reject(
        new Error("stage-controller: transition already in flight")
      );
    }
    const previous = stack[stack.length - 1] ?? null;
    return new Promise<void>((resolve, reject) => {
      active = {
        kind: "enter",
        outgoing: previous,
        incoming: next,
        keepHistory: enterOptions.keepHistory !== false,
        phase: previous === null ? "in" : "out",
        elapsedMs: 0,
        resolve,
        reject,
      };
      if (previous === null) {
        stack.push(next);
        parent.addChild(next.root);
        next.attach();
        startInPhase(next);
      } else {
        startOutPhase(previous);
      }
    });
  };

  const back = (): Promise<void> => {
    if (active !== null) {
      return Promise.reject(
        new Error("stage-controller: transition already in flight")
      );
    }
    if (stack.length < 2) {
      return Promise.reject(
        new Error("stage-controller: cannot go back, no previous stage")
      );
    }
    const outgoing = stack[stack.length - 1];
    const incoming = stack[stack.length - 2];
    if (outgoing === undefined || incoming === undefined) {
      return Promise.reject(new Error("stage-controller: invalid stack state"));
    }
    return new Promise<void>((resolve, reject) => {
      active = {
        kind: "back",
        outgoing,
        incoming,
        keepHistory: false,
        phase: "out",
        elapsedMs: 0,
        resolve,
        reject,
      };
      startOutPhase(outgoing);
    });
  };

  const destroy = (): void => {
    if (active !== null) {
      active.reject(new Error("stage-controller: destroyed during transition"));
      active = null;
    }
    while (stack.length > 0) {
      const handle = stack.pop();
      if (handle === undefined) continue;
      parent.removeChild(handle.root);
      handle.destroy();
    }
  };

  const current = (): StageHandle | null => stack[stack.length - 1] ?? null;

  return { enter, back, current, update, destroy };
};
