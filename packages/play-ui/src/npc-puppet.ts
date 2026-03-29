import { Graphics } from "pixi.js";
import type { AvatarFacing } from "./avatar-anim.js";

export function drawMiniPerson(
  g: Graphics,
  options: { scale: number; facing: AvatarFacing }
): void {
  g.clear();
  const s = options.scale;
  g.scale.set(options.facing === "left" ? -1 : 1, 1);
  g.rect(-2 * s, -12 * s, 4 * s, 4 * s).fill({ color: 0xffcc80 });
  g.rect(-3 * s, -9 * s, 6 * s, 7 * s).fill({ color: 0x5c6bc0 });
  g.rect(-2 * s, -2 * s, 2 * s, 4 * s).fill({ color: 0x37474f });
  g.rect(0, -2 * s, 2 * s, 4 * s).fill({ color: 0x37474f });
}

export function drawMiniDogAtFeet(g: Graphics, scale: number): void {
  g.clear();
  const s = scale;
  g.ellipse(6 * s, -1 * s, 4 * s, 3 * s).fill({ color: 0x8d6e63 });
  g.rect(2 * s, -2 * s, 3 * s, 2 * s).fill({ color: 0x6d4c41 });
}

export function drawMiniDogHeld(g: Graphics, scale: number): void {
  g.clear();
  const s = scale;
  g.ellipse(0, -6 * s, 4 * s, 3 * s).fill({ color: 0xa1887f });
  g.rect(3 * s, -7 * s, 4 * s, 3 * s).fill({ color: 0x6d4c41 });
}
