import { Graphics } from "pixi.js";
import type { AvatarFacing } from "./avatar-anim.js";

export function drawPlatformHero(
  g: Graphics,
  options: {
    scale: number;
    facing: AvatarFacing;
    walkPhase: number;
    isMoving: boolean;
  }
): void {
  g.clear();
  const s = options.scale;
  const bob =
    options.isMoving === true
      ? Math.sin(options.walkPhase * Math.PI * 2) * 1.5 * s
      : 0;
  const legSwing =
    options.isMoving === true
      ? Math.sin(options.walkPhase * Math.PI * 2) * 2.5 * s
      : 0;
  g.scale.set(options.facing === "left" ? -1 : 1, 1);

  g.rect(-7 * s, -36 * s + bob, 14 * s, 8 * s).fill({ color: 0xb71c1c });
  g.rect(-6 * s, -31 * s + bob, 12 * s, 5 * s).fill({ color: 0xd32f2f });
  g.rect(-6 * s, -27 * s + bob, 12 * s, 9 * s).fill({ color: 0xffcc80 });
  g.rect(-7 * s, -19 * s + bob, 14 * s, 11 * s).fill({ color: 0x1565c0 });
  g.rect(-7 * s, -19 * s + bob, 4 * s, 5 * s).fill({ color: 0xffcc80 });
  g.rect(3 * s, -19 * s + bob, 4 * s, 5 * s).fill({ color: 0xffcc80 });
  g.rect(-5 * s, -9 * s + bob, 4 * s, 9 * s).fill({ color: 0x0d47a1 });
  g.rect(1 * s, -9 * s + bob, 4 * s, 9 * s).fill({ color: 0x0d47a1 });
  g.rect(-6 * s + legSwing, -1 * s, 5 * s, 3 * s).fill({ color: 0x3e2723 });
  g.rect(1 * s - legSwing, -1 * s, 5 * s, 3 * s).fill({ color: 0x3e2723 });
}
