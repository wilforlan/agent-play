import { Container, Graphics, Text } from "pixi.js";
import {
  AIRPLANE_NOSE_TIP_X,
  AIRPLANE_ROPE_ANCHOR,
} from "./airplane-layout.js";
import { drawAirlinerSideView } from "./airplane-silhouette.js";
import {
  isPlaneOffScreen,
  nextMarqueeOffset,
  pickGreeting,
} from "./sky-decor-logic.js";

const MAX_PLANES = 3;
const PLANE_SPEED_PX = 62;
const MARQUEE_SPEED_PX = 36;
const PLANE_SPAWN_EVERY_SEC = 11;
const BANNER_WIDTH = 200;
const BANNER_HEIGHT = 26;

type PlaneEntry = {
  root: Container;
  vx: number;
  greetingText: Text;
  greetingTextWidth: number;
};

export function createSkyDecorLayer(options: {
  width: number;
  height: number;
  grassBandTopRatio: number;
  rng?: () => number;
}): {
  container: Container;
  tick: (dt: number) => void;
  setReducedMotion: (value: boolean) => void;
  setBounds: (width: number, height: number, grassBandTopRatio: number) => void;
} {
  const rng = options.rng ?? Math.random;
  const container = new Container();
  container.label = "sky-decor";

  let width = options.width;
  let height = options.height;
  let grassBandTopRatio = options.grassBandTopRatio;
  let reducedMotion = false;

  const planes: PlaneEntry[] = [];

  let planeSpawnAcc = 4;

  function skyBand(): { top: number; bottom: number } {
    const bottom = Math.max(48, height * grassBandTopRatio - 28);
    const top = 28;
    return { top, bottom };
  }

  function spawnPlane(): void {
    if (planes.length >= MAX_PLANES) return;
    const { top, bottom } = skyBand();
    const y = top + rng() * Math.max(12, bottom - top - 40);
    const root = new Container();
    root.position.set(-120, y);

    const planeG = new Graphics({ roundPixels: true });
    drawAirlinerSideView(planeG);

    const rope = new Graphics({ roundPixels: true });
    rope.moveTo(AIRPLANE_ROPE_ANCHOR.x, AIRPLANE_ROPE_ANCHOR.y);
    rope.lineTo(-BANNER_WIDTH - 8, 26);
    rope.stroke({ width: 1.5, color: 0x94a3b8 });

    const bannerBg = new Graphics({ roundPixels: true });
    bannerBg.roundRect(-BANNER_WIDTH - 8, 14, BANNER_WIDTH, BANNER_HEIGHT, 5).fill({
      color: 0xfef9c3,
    });
    bannerBg.roundRect(-BANNER_WIDTH - 8, 14, BANNER_WIDTH, BANNER_HEIGHT, 5).stroke({
      width: 1.5,
      color: 0xd97706,
    });

    const mask = new Graphics({ roundPixels: true });
    mask.rect(-BANNER_WIDTH - 8, 14, BANNER_WIDTH, BANNER_HEIGHT).fill({
      color: 0xffffff,
    });

    const greetingText = new Text({
      text: `${pickGreeting(rng)}   ·   `,
      style: {
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: 13,
        fontWeight: "700",
        fill: 0x78350f,
      },
    });
    greetingText.position.set(-BANNER_WIDTH + 8, 18);
    const greetingTextWidth = greetingText.width;

    const bannerClip = new Container();
    bannerClip.addChild(mask);
    bannerClip.addChild(bannerBg);
    bannerClip.addChild(greetingText);
    bannerClip.mask = mask;

    root.addChild(bannerClip);
    root.addChild(rope);
    root.addChild(planeG);

    container.addChild(root);
    planes.push({
      root,
      vx: PLANE_SPEED_PX,
      greetingText,
      greetingTextWidth,
    });
  }

  function tick(dt: number): void {
    if (reducedMotion) return;

    planeSpawnAcc += dt;
    if (planeSpawnAcc >= PLANE_SPAWN_EVERY_SEC) {
      planeSpawnAcc = 0;
      spawnPlane();
    }

    for (let i = planes.length - 1; i >= 0; i -= 1) {
      const p = planes[i];
      if (p === undefined) continue;
      p.root.position.x += p.vx * dt;
      const nextOffset = nextMarqueeOffset({
        offset: p.greetingText.position.x,
        dt,
        textWidth: p.greetingTextWidth,
        bannerWidth: BANNER_WIDTH - 16,
        speedPxPerSec: MARQUEE_SPEED_PX,
      });
      p.greetingText.position.x = nextOffset;

      const noseX = p.root.position.x + AIRPLANE_NOSE_TIP_X;
      if (isPlaneOffScreen({ noseX, viewWidth: width })) {
        container.removeChild(p.root);
        p.root.destroy({ children: true });
        planes.splice(i, 1);
      }
    }
  }

  function setReducedMotion(value: boolean): void {
    reducedMotion = value;
    container.visible = !value;
    if (value) {
      for (const p of planes) {
        container.removeChild(p.root);
        p.root.destroy({ children: true });
      }
      planes.length = 0;
      planeSpawnAcc = 4;
    }
  }

  function setBounds(
    nextWidth: number,
    nextHeight: number,
    nextGrass: number
  ): void {
    width = nextWidth;
    height = nextHeight;
    grassBandTopRatio = nextGrass;
  }

  return {
    container,
    tick,
    setReducedMotion,
    setBounds,
  };
}
