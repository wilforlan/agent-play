import { Graphics } from "pixi.js";
import { AIRPLANE_NOSE_TIP_X } from "./airplane-layout.js";

export { AIRPLANE_NOSE_TIP_X, AIRPLANE_ROPE_ANCHOR } from "./airplane-layout.js";

export function drawAirlinerSideView(g: Graphics): void {
  g.clear();

  const outline = { width: 1, color: 0x475569 };
  const outlineSoft = { width: 1, color: 0x64748b };

  g.moveTo(5, 12);
  g.lineTo(10, 2);
  g.lineTo(14, 11);
  g.lineTo(9, 13);
  g.closePath();
  g.fill({ color: 0x94a3b8 });
  g.stroke(outlineSoft);

  g.moveTo(1, 16);
  g.lineTo(17, 16);
  g.lineTo(15, 20);
  g.lineTo(0, 18);
  g.closePath();
  g.fill({ color: 0xcbd5e1 });
  g.stroke(outline);

  g.moveTo(17, 20);
  g.lineTo(48, 20);
  g.lineTo(54, 36);
  g.lineTo(11, 32);
  g.closePath();
  g.fill({ color: 0xb4c5e8 });
  g.stroke(outline);

  g.roundRect(15, 17, 12, 7, 3).fill({ color: 0x9ca3af });
  g.roundRect(15, 17, 12, 7, 3).stroke(outlineSoft);

  g.ellipse(27, 29, 6, 5).fill({ color: 0x575f6b });
  g.ellipse(27, 29, 6, 5).stroke({ width: 1, color: 0x1e293b });
  g.ellipse(27, 27, 3.5, 2.5).fill({ color: 0x94a3b8 });

  g.ellipse(39, 30, 5, 4).fill({ color: 0x575f6b });
  g.ellipse(39, 30, 5, 4).stroke({ width: 1, color: 0x1e293b });
  g.ellipse(39, 28.5, 2.5, 2).fill({ color: 0x94a3b8 });

  g.roundRect(9, 10, 42, 12, 6).fill({ color: 0xf8fafc });
  g.roundRect(9, 10, 42, 12, 6).stroke(outline);

  g.moveTo(48, 11);
  g.lineTo(AIRPLANE_NOSE_TIP_X, 16);
  g.lineTo(48, 21);
  g.closePath();
  g.fill({ color: 0xe2e8f0 });
  g.stroke(outline);

  g.roundRect(43, 8, 16, 9, 3).fill({ color: 0x0c4a6e });
  g.roundRect(43, 8, 16, 9, 3).stroke({ width: 1, color: 0x38bdf8 });
  g.moveTo(45, 10);
  g.lineTo(57, 10);
  g.stroke({ width: 1, color: 0x7dd3fc });

  for (let i = 0; i < 5; i += 1) {
    const wx = 16 + i * 6.5;
    g.roundRect(wx, 12, 4.5, 4, 1).fill({ color: 0x1e293b });
    g.roundRect(wx, 12, 4.5, 4, 1).stroke({ width: 0.5, color: 0x475569 });
  }

  g.moveTo(23, 22);
  g.lineTo(39, 22);
  g.stroke({ width: 1, color: 0xcbd5e1 });

  g.rect(30, 13, 3, 8).fill({ color: 0xcbd5e1 });
  g.rect(30, 13, 3, 8).stroke({ width: 0.5, color: 0x64748b });

  g.moveTo(49, 20);
  g.lineTo(52, 13);
  g.lineTo(55, 20);
  g.closePath();
  g.fill({ color: 0xa5b4fc });
  g.stroke(outlineSoft);

  g.circle(AIRPLANE_NOSE_TIP_X, 16, 2.2).fill({ color: 0x334155 });
  g.circle(AIRPLANE_NOSE_TIP_X - 1.5, 14.5, 1.2).fill({ color: 0x94a3b8 });
}
