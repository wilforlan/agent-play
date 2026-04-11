/**
 * @module @agent-play/play-ui/avatar-anim
 * avatar anim — preview canvas module (Pixi + DOM).
 */
export type AvatarFacing = "left" | "right";

export type AvatarMotion = {
  facing: AvatarFacing;
  walkPhase: number;
  isMoving: boolean;
};

const MOVE_EPS = 1e-4;

export function nextAvatarMotion(options: {
  prevWorld: { x: number; y: number };
  nextWorld: { x: number; y: number };
  prevFacing: AvatarFacing;
  prevWalkPhase: number;
  dt: number;
  stepsPerSecondWhileWalking: number;
}): AvatarMotion {
  const dx = options.nextWorld.x - options.prevWorld.x;
  const dy = options.nextWorld.y - options.prevWorld.y;
  const isMoving = Math.hypot(dx, dy) > MOVE_EPS;
  let facing = options.prevFacing;
  if (dx < -MOVE_EPS) facing = "left";
  else if (dx > MOVE_EPS) facing = "right";
  let walkPhase = options.prevWalkPhase;
  if (isMoving) {
    walkPhase += options.dt * options.stepsPerSecondWhileWalking;
  }
  return { facing, walkPhase, isMoving };
}
