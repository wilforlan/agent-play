/**
 * @packageDocumentation
 * @module @agent-play/play-ui/space-yard-stage
 *
 * The yard a player enters when they press `A` near a structure (or invoke
 * `world.enter.space(spaceId)` from the console).
 *
 * Layout — rectangular wooden fence, gate centered on the bottom edge, up
 * to three amenity pads laid out along the back of the yard, sign posts
 * per pad. The {@link sprite-exit-door | exit door} sits at stage-local
 * `(0, 0)`; the player spawns at the gate (opposite corner) so leaving
 * the yard is a deliberate walk back to the origin.
 *
 * Layout helpers ({@link layoutYardAmenityPads}, {@link yardSpawnPosition},
 * {@link clampYardPosition}) are pure functions and unit-tested directly.
 *
 * @see ./stage-controller.ts for the controller that mounts this stage.
 * @see ./sprite-exit-door.ts for the shared exit door sprite anchored at
 *      `(0, 0)`.
 */

import { Container, Graphics, Text } from "pixi.js";
import {
  cssColorToPixi,
  type MultiversePalette,
} from "./multiverse-engine.js";
import { buildTSignPost } from "./world-street-signs.js";
import {
  buildExitDoorSprite,
  EXIT_DOOR_PROXIMITY_RADIUS_WORLD,
} from "./sprite-exit-door.js";
import { drawPlatformHero } from "./hero-puppet.js";
import type { AvatarFacing } from "./avatar-anim.js";
import type { StageHandle } from "./stage-controller.js";

/**
 * Yard bounds in world cells. The yard is rectangular (8 wide × 6 deep) so
 * up to three amenity pads fit comfortably along the back row.
 *
 * @public
 */
export const YARD_BOUNDS = {
  minX: 0,
  minY: 0,
  maxX: 8,
  maxY: 6,
} as const;

/**
 * Player spawn point inside the yard.
 *
 * @remarks
 * Returned in yard-local cell coordinates. Placed at the gate (the front
 * edge, far from the exit door at `(0, 0)`) so the player has to walk
 * back to leave.
 *
 * @public
 */
export const yardSpawnPosition = (): { x: number; y: number } => ({
  x: YARD_BOUNDS.maxX / 2,
  y: YARD_BOUNDS.maxY - 0.5,
});

/**
 * Clamp a yard-local position to the fence interior.
 *
 * @public
 */
export const clampYardPosition = (pos: {
  x: number;
  y: number;
}): { x: number; y: number } => ({
  x: Math.min(YARD_BOUNDS.maxX, Math.max(YARD_BOUNDS.minX, pos.x)),
  y: Math.min(YARD_BOUNDS.maxY, Math.max(YARD_BOUNDS.minY, pos.y)),
});

/**
 * Dead-zone threshold below which the joystick vector is treated as idle.
 * Mirrors the overworld value in `preview-debug-joystick.ts`. Re-declared
 * here so the input helper can stay decoupled from that module.
 *
 * @public
 */
export const ENCLOSED_STAGE_JOYSTICK_DEFLECT_EPS = 0.02;

/**
 * Result of {@link nextEnclosedStageInputDirection}. The `source`
 * discriminator lets callers decide downstream behaviour (e.g.
 * variable-speed scaling) without re-deriving it from the magnitude.
 *
 * @public
 */
export type EnclosedStageInputDirection = {
  dx: number;
  dy: number;
  source: "idle" | "joystick" | "arrows";
};

/**
 * Compute the player's movement direction for an "enclosed" stage (space
 * yard or amenity interior) for the current frame.
 *
 * @remarks
 * Joystick handling — preferred when `joystickEnabled` is `true` and the
 * vector magnitude exceeds {@link ENCLOSED_STAGE_JOYSTICK_DEFLECT_EPS}.
 * The joystick's y-component is **inverted** before being returned so
 * pushing the stick up moves the avatar toward decreasing screen-y (i.e.
 * toward the top of the canvas / the exit door). This makes the joystick
 * agree with the four-direction arrow key path, which already produces a
 * negative `dy` for "up".
 *
 * Falls back to a unit-length arrow-key vector when the joystick is idle
 * or disabled.
 *
 * Pure and side-effect free — easy to unit-test.
 *
 * @public
 */
export const nextEnclosedStageInputDirection = (input: {
  joystickEnabled: boolean;
  joystickVector: { x: number; y: number };
  arrowKeys: { up: boolean; down: boolean; left: boolean; right: boolean };
}): EnclosedStageInputDirection => {
  const { joystickEnabled, joystickVector, arrowKeys } = input;
  if (joystickEnabled) {
    const joyLen = Math.hypot(joystickVector.x, joystickVector.y);
    if (joyLen > ENCLOSED_STAGE_JOYSTICK_DEFLECT_EPS) {
      return {
        dx: joystickVector.x,
        dy: -joystickVector.y,
        source: "joystick",
      };
    }
  }
  const rawDx =
    (arrowKeys.right ? 1 : 0) - (arrowKeys.left ? 1 : 0);
  const rawDy =
    (arrowKeys.down ? 1 : 0) - (arrowKeys.up ? 1 : 0);
  if (rawDx === 0 && rawDy === 0) {
    return { dx: 0, dy: 0, source: "idle" };
  }
  const len = Math.hypot(rawDx, rawDy);
  return { dx: rawDx / len, dy: rawDy / len, source: "arrows" };
};

/**
 * Amenity kinds the yard can host. Mirrors the catalog metadata.
 *
 * @public
 */
export type YardAmenityKind = "shop" | "supermarket" | "car_wash";

/**
 * Amenity descriptor used by {@link layoutYardAmenityPads}.
 *
 * @public
 */
export type YardAmenityDescriptor = {
  kind: YardAmenityKind;
};

/**
 * Position of a single amenity pad inside the yard.
 *
 * @public
 */
export type YardAmenityPadPosition = {
  kind: YardAmenityKind;
  /** Yard-local cell x. */
  x: number;
  /** Yard-local cell y. */
  y: number;
};

const MAX_YARD_AMENITIES = 3;

/**
 * Proximity radius (yard cells) used to detect when the player is close
 * enough to an amenity pad to trigger the "enter amenity" prompt.
 *
 * @remarks
 * Pads are roughly 2.4 cells wide × 2.6 cells tall, with their anchor
 * point on the floor. A radius of `1.8` lets the player walk up onto
 * the pad and feel the proximity activate from "the front step", without
 * triggering for adjacent pads that share the back row.
 *
 * @public
 */
export const YARD_AMENITY_PROXIMITY_RADIUS_WORLD = 1.8;

/**
 * Return the amenity pad whose centre is closest to the player, or
 * `null` when none lie within `radius`.
 *
 * @remarks
 * Pure and side-effect free — easy to unit-test. Distance is measured in
 * yard-local cells (the same coordinate space the player walks in).
 *
 * @public
 */
export const findNearestYardAmenityPad = (input: {
  player: { x: number; y: number };
  pads: ReadonlyArray<YardAmenityPadPosition>;
  radius: number;
}): YardAmenityPadPosition | null => {
  const { player, pads, radius } = input;
  let best: YardAmenityPadPosition | null = null;
  let bestDistance = radius;
  for (const pad of pads) {
    const distance = Math.hypot(pad.x - player.x, pad.y - player.y);
    if (distance <= bestDistance) {
      best = pad;
      bestDistance = distance;
    }
  }
  return best;
};

/**
 * Lay out up to three amenity pads across the back of the yard.
 *
 * @example
 * ```ts
 * const pads = layoutYardAmenityPads(space.amenities);
 * pads.forEach((p) => buildAndMountPad(p));
 * ```
 *
 * @public
 */
export const layoutYardAmenityPads = (
  amenities: ReadonlyArray<YardAmenityDescriptor>
): YardAmenityPadPosition[] => {
  const capped = amenities.slice(0, MAX_YARD_AMENITIES);
  const span = YARD_BOUNDS.maxX - YARD_BOUNDS.minX;
  const padY = YARD_BOUNDS.minY + 2.6;
  return capped.map((amenity, index) => {
    const slotCount = capped.length;
    const ratio = slotCount === 1 ? 0.5 : index / (slotCount - 1);
    const x = YARD_BOUNDS.minX + 1.2 + ratio * (span - 2.4);
    return { kind: amenity.kind, x, y: padY };
  });
};

const PAD_COLORS: Record<YardAmenityKind, { primary: number; accent: number }> =
  {
    shop: { primary: 0x6a4f2a, accent: 0xc8a86d },
    supermarket: { primary: 0xb12f2f, accent: 0xfae0a0 },
    car_wash: { primary: 0x2c7fa9, accent: 0xbfe0f3 },
  };

const PAD_LABELS: Record<YardAmenityKind, string> = {
  shop: "SHOP",
  supermarket: "SUPERMARKET",
  car_wash: "CAR WASH",
};

const YARD_GRASS_COLOR = 0x6f8f3f;
const YARD_GRASS_LINE_COLOR = 0x7c9d4a;

const buildYardBackdrop = (
  cellScale: number,
  palette: MultiversePalette
): Graphics => {
  const g = new Graphics({ roundPixels: true });
  const w = YARD_BOUNDS.maxX * cellScale;
  const h = YARD_BOUNDS.maxY * cellScale;
  g.rect(0, 0, w, h).fill({ color: YARD_GRASS_COLOR });
  const strokeColor = cssColorToPixi(palette.stroke);
  for (let i = 0; i <= YARD_BOUNDS.maxX; i += 1) {
    const x = i * cellScale;
    g.moveTo(x, 0)
      .lineTo(x, h)
      .stroke({
        color: YARD_GRASS_LINE_COLOR,
        width: 0.5,
        alpha: 0.2,
      });
  }
  g.rect(0, 0, w, h).stroke({
    color: strokeColor,
    width: 1,
    alpha: 0.1,
  });
  return g;
};

const buildYardFence = (cellScale: number): Container => {
  const root = new Container();
  const w = YARD_BOUNDS.maxX * cellScale;
  const h = YARD_BOUNDS.maxY * cellScale;
  const railColor = 0x9b6a3f;
  const postColor = 0x5f3f1e;

  const top = new Graphics();
  top.rect(0, 0, w, 4).fill({ color: railColor });
  root.addChild(top);

  const bottomLeft = new Graphics();
  bottomLeft
    .rect(0, h - 4, w / 2 - cellScale * 0.6, 4)
    .fill({ color: railColor });
  root.addChild(bottomLeft);

  const bottomRight = new Graphics();
  bottomRight
    .rect(w / 2 + cellScale * 0.6, h - 4, w / 2 - cellScale * 0.6, 4)
    .fill({ color: railColor });
  root.addChild(bottomRight);

  const left = new Graphics();
  left.rect(0, 0, 4, h).fill({ color: railColor });
  root.addChild(left);

  const right = new Graphics();
  right.rect(w - 4, 0, 4, h).fill({ color: railColor });
  root.addChild(right);

  for (let i = 0; i <= YARD_BOUNDS.maxX; i += 1) {
    const x = i * cellScale;
    const post = new Graphics();
    post.rect(x - 2, 0, 4, 8).fill({ color: postColor });
    post.rect(x - 2, h - 8, 4, 8).fill({ color: postColor });
    root.addChild(post);
  }

  return root;
};

const buildAmenityPadVisual = (input: {
  pad: YardAmenityPadPosition;
  cellScale: number;
}): Container => {
  const { pad, cellScale } = input;
  const colors = PAD_COLORS[pad.kind];
  const root = new Container();

  const padW = cellScale * 2.4;
  const padH = cellScale * 2.6;

  const base = new Graphics();
  base.rect(-padW / 2, -padH * 0.2, padW, padH * 0.2).fill({
    color: 0x222222,
    alpha: 0.25,
  });
  root.addChild(base);

  const building = new Graphics();
  building.rect(-padW / 2, -padH, padW, padH).fill({ color: colors.primary });
  building
    .rect(-padW / 2, -padH, padW, padH * 0.18)
    .fill({ color: colors.accent });
  building
    .rect(-padW / 2 + padW * 0.1, -padH * 0.55, padW * 0.2, padH * 0.3)
    .fill({ color: 0xffffff, alpha: 0.85 });
  building
    .rect(-padW / 2 + padW * 0.7, -padH * 0.55, padW * 0.2, padH * 0.3)
    .fill({ color: 0xffffff, alpha: 0.85 });
  building
    .rect(-padW / 2 + padW * 0.4, -padH * 0.45, padW * 0.2, padH * 0.45)
    .fill({ color: 0x1a1a1a, alpha: 0.8 });
  root.addChild(building);

  return root;
};

/**
 * Player avatar animation hints supplied to
 * {@link SpaceYardStageHandle.setPlayerYardPosition}.
 *
 * @public
 */
export type YardPlayerAnim = {
  facing: AvatarFacing;
  walkPhase: number;
  isMoving: boolean;
};

/**
 * Result of {@link buildSpaceYardStage}: a {@link StageHandle} extended
 * with the yard-local exit-door anchor, pad positions, the actual cell
 * scale chosen for layout, and a `setPlayerYardPosition` hook the host
 * uses to move the player avatar each frame.
 *
 * @public
 */
export type SpaceYardStageHandle = StageHandle & {
  readonly exitDoorAnchor: { x: number; y: number };
  readonly amenityPads: ReadonlyArray<YardAmenityPadPosition>;
  /**
   * The cell scale (px / world cell) chosen at build time. When a
   * `viewportSize` is supplied, this is computed so the yard fills the
   * canvas; otherwise it falls back to the explicit `cellScale` input.
   */
  readonly cellScale: number;
  /**
   * Yard-local origin offset (px) of the playable area. The host can add
   * this to `world-local px = yard cell × cellScale` to compute screen
   * coordinates when needed (e.g. to position prompts).
   */
  readonly interiorOffset: { x: number; y: number };
  /**
   * Move the player avatar to a yard-local position. The input is clamped
   * to {@link YARD_BOUNDS} so callers don't have to.
   */
  setPlayerYardPosition(local: { x: number; y: number }, anim: YardPlayerAnim): void;
  /** Read-back of the current yard-local position, post-clamp. */
  playerYardPosition(): { x: number; y: number };
};

const YARD_HEADER_BAND_PX = 56;

/**
 * Build the space-yard {@link StageHandle}.
 *
 * @example
 * ```ts
 * const yard = buildSpaceYardStage({
 *   spaceName: "SandMill Circle",
 *   amenities: [{ kind: "shop" }, { kind: "supermarket" }],
 *   cellScale: 28,
 * });
 * await controller.enter(yard);
 * ```
 *
 * @public
 */
export const buildSpaceYardStage = (input: {
  spaceName: string;
  amenities: ReadonlyArray<YardAmenityDescriptor>;
  /**
   * Explicit cell scale (px / cell). Ignored when `viewportSize` is set —
   * in that case the stage computes a scale that fills the viewport.
   */
  cellScale?: number;
  viewportSize?: { width: number; height: number };
  palette?: MultiversePalette;
}): SpaceYardStageHandle => {
  const yardW = YARD_BOUNDS.maxX - YARD_BOUNDS.minX;
  const yardH = YARD_BOUNDS.maxY - YARD_BOUNDS.minY;
  let cellScale: number;
  let interiorOffsetX = 0;
  let interiorOffsetY = YARD_HEADER_BAND_PX;
  if (input.viewportSize !== undefined) {
    const availH = Math.max(60, input.viewportSize.height - YARD_HEADER_BAND_PX);
    cellScale = Math.min(input.viewportSize.width / yardW, availH / yardH);
    interiorOffsetX = (input.viewportSize.width - yardW * cellScale) / 2;
    interiorOffsetY =
      YARD_HEADER_BAND_PX +
      (availH - yardH * cellScale) / 2;
  } else {
    cellScale = input.cellScale ?? 28;
  }
  const palette: MultiversePalette =
    input.palette ??
    ({
      background: "#1a1c2e",
      grid: "rgba(100, 118, 140, 0.15)",
      structureTool: "#3b82f6",
      structureHome: "#f59e0b",
      structureVendorAwning: "#f97316",
      structureVendorBody: "#9a3412",
      structureMcpFacade: "#1e3a5f",
      structureMcpAccent: "#7dd3fc",
      agent: "#22d3ee",
      calloutBg: "rgba(15, 23, 42, 0.88)",
      text: "#e2e8f0",
      textMuted: "#94a3b8",
      stroke: "#334155",
    } satisfies MultiversePalette);
  const root = new Container();
  root.position.set(0, 0);

  if (input.viewportSize !== undefined) {
    const ground = new Graphics();
    ground
      .rect(0, 0, input.viewportSize.width, input.viewportSize.height)
      .fill({ color: 0x1f2a1a });
    root.addChild(ground);

    const headerBand = new Graphics();
    headerBand
      .rect(0, 0, input.viewportSize.width, YARD_HEADER_BAND_PX)
      .fill({ color: 0x111827 });
    headerBand
      .rect(0, YARD_HEADER_BAND_PX - 2, input.viewportSize.width, 2)
      .fill({ color: 0x374151, alpha: 0.7 });
    root.addChild(headerBand);
  }

  const interior = new Container();
  interior.position.set(interiorOffsetX, interiorOffsetY);
  root.addChild(interior);

  const backdrop = buildYardBackdrop(cellScale, palette);
  interior.addChild(backdrop);

  const fence = buildYardFence(cellScale);
  interior.addChild(fence);

  const pads = layoutYardAmenityPads(input.amenities);
  for (const pad of pads) {
    const padVisual = buildAmenityPadVisual({ pad, cellScale });
    padVisual.position.set(pad.x * cellScale, pad.y * cellScale);
    interior.addChild(padVisual);

    const sign = buildTSignPost({
      palette,
      cellScale,
      label: PAD_LABELS[pad.kind],
    });
    sign.position.set(pad.x * cellScale, pad.y * cellScale + cellScale * 0.4);
    interior.addChild(sign);
  }

  const door = buildExitDoorSprite({ cellScale });
  door.position.set(0, 0);
  interior.addChild(door);

  const playerLayer = new Container();
  interior.addChild(playerLayer);
  const heroGraphic = new Graphics();
  playerLayer.addChild(heroGraphic);
  const playerScale = Math.max(0.5, Math.min(1.1, cellScale / 48));
  let playerLocal = clampYardPosition(yardSpawnPosition());
  const renderPlayer = (anim: YardPlayerAnim): void => {
    playerLayer.position.set(
      playerLocal.x * cellScale,
      playerLocal.y * cellScale
    );
    drawPlatformHero(heroGraphic, {
      scale: playerScale,
      facing: anim.facing,
      walkPhase: anim.walkPhase,
      isMoving: anim.isMoving,
    });
  };
  renderPlayer({ facing: "right", walkPhase: 0, isMoving: false });

  const headline = new Text({
    text: input.spaceName,
    style: {
      fontFamily: "system-ui, sans-serif",
      fontSize:
        input.viewportSize !== undefined
          ? 22
          : Math.max(14, Math.round(cellScale * 0.5)),
      fontWeight: "700",
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 2, alpha: 0.45 },
    },
  });
  headline.anchor.set(0.5, 0.5);
  if (input.viewportSize !== undefined) {
    headline.position.set(
      input.viewportSize.width / 2,
      YARD_HEADER_BAND_PX / 2
    );
  } else {
    headline.position.set((yardW * cellScale) / 2, 8);
  }
  root.addChild(headline);

  return {
    id: "spaceYard",
    root,
    attach: () => {},
    detach: () => {},
    destroy: () => {
      root.destroy({ children: true });
    },
    exitDoorAnchor: { x: 0, y: 0 },
    amenityPads: pads,
    cellScale,
    interiorOffset: { x: interiorOffsetX, y: interiorOffsetY },
    setPlayerYardPosition: (local, anim) => {
      playerLocal = clampYardPosition(local);
      renderPlayer(anim);
    },
    playerYardPosition: () => ({ ...playerLocal }),
  };
};

export { EXIT_DOOR_PROXIMITY_RADIUS_WORLD };
