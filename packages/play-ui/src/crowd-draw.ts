/**
 * @module @agent-play/play-ui/crowd-draw
 * crowd draw — preview canvas module (Pixi + DOM).
 */
import { Container, Graphics } from "pixi.js";
import type { CrowdClusterSpec } from "./crowd-layout.js";
import {
  drawMiniDogAtFeet,
  drawMiniDogHeld,
  drawMiniPerson,
} from "./npc-puppet.js";

export function buildCrowdLayer(clusters: CrowdClusterSpec[]): Container {
  const root = new Container();
  const scale = 0.28;
  for (const cl of clusters) {
    const c = new Container();
    c.position.set(cl.cx, cl.cy);
    for (const pe of cl.people) {
      const personRoot = new Container();
      personRoot.position.set(pe.dx, pe.dy);
      const body = new Graphics({ roundPixels: true });
      drawMiniPerson(body, { scale, facing: pe.facing });
      personRoot.addChild(body);
      if (pe.dogMode === "held") {
        const dogG = new Graphics({ roundPixels: true });
        dogG.position.set(4 * scale, -8 * scale);
        drawMiniDogHeld(dogG, scale * 0.85);
        personRoot.addChild(dogG);
      } else if (pe.dogMode === "feet") {
        const dogG = new Graphics({ roundPixels: true });
        dogG.position.set(pe.facing === "right" ? 8 * scale : -8 * scale, 0);
        drawMiniDogAtFeet(dogG, scale * 0.9);
        personRoot.addChild(dogG);
      }
      c.addChild(personRoot);
    }
    root.addChild(c);
  }
  return root;
}
