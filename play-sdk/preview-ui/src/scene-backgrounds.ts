import { Container, Graphics } from "pixi.js";

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildParkScene(
  width: number,
  height: number,
  seed: number
): Container {
  const root = new Container();
  const rng = mulberry32(seed);
  const sky = new Graphics();
  sky.rect(0, 0, width, height * 0.55).fill({ color: 0x7ec8e3 });
  sky
    .rect(0, height * 0.55, width, height * 0.45)
    .fill({ color: 0xb8dfe8 });
  root.addChild(sky);

  const grass = new Graphics();
  const grassTop = height * 0.58;
  grass.rect(0, grassTop, width, height - grassTop).fill({ color: 0x4caf6a });
  for (let x = 0; x < width; x += 6) {
    const h = 2 + Math.floor(rng() * 4);
    grass
      .rect(x, grassTop - h, 2, h)
      .fill({ color: 0x3d9a54, alpha: 0.7 });
  }
  root.addChild(grass);

  const benchCount = 2 + Math.floor(rng() * 2);
  for (let b = 0; b < benchCount; b += 1) {
    const bx = 40 + rng() * (width - 120);
    const by = grassTop + 30 + rng() * (height - grassTop - 80);
    root.addChild(makeBench(bx, by, rng));
  }

  const treeCount = 6 + Math.floor(rng() * 4);
  for (let t = 0; t < treeCount; t += 1) {
    const tx = 30 + rng() * (width - 60);
    const ty = grassTop - 20 + rng() * (height - grassTop) * 0.35;
    root.addChild(makeTree(tx, ty, rng));
  }

  return root;
}

export function buildNewYorkScene(
  width: number,
  height: number,
  seed: number
): Container {
  const root = new Container();
  const rng = mulberry32(seed);
  const g = new Graphics();
  g.rect(0, 0, width, height * 0.42).fill({ color: 0x8899aa });
  g.rect(0, height * 0.42, width, height * 0.58).fill({ color: 0x546e7a });

  const roadY = height * 0.72;
  g.rect(0, roadY, width, height - roadY).fill({ color: 0x37474f });
  g.rect(0, roadY + 8, width, 3).fill({ color: 0xfde047, alpha: 0.85 });

  const buildingCount = 8 + Math.floor(rng() * 5);
  for (let i = 0; i < buildingCount; i += 1) {
    const bx = (i / buildingCount) * width + rng() * 8;
    const bw = width / buildingCount + 4;
    const bh = height * (0.25 + rng() * 0.35);
    const by = roadY - bh + 20;
    g.rect(bx, by, bw, bh).fill({ color: 0x455a6e });
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        if (rng() > 0.35) {
          g.rect(
            bx + 6 + col * (bw / 3.5),
            by + 12 + row * 18,
            8,
            10
          ).fill({ color: 0xffe082, alpha: 0.7 });
        }
      }
    }
  }
  root.addChild(g);
  return root;
}

export function buildTokyoScene(
  width: number,
  height: number,
  seed: number
): Container {
  const root = new Container();
  const rng = mulberry32(seed);
  const g = new Graphics();
  g.rect(0, 0, width, height * 0.45).fill({ color: 0x4a148c });
  g.rect(0, height * 0.45, width, height * 0.55).fill({ color: 0x1a1a2e });

  const horizon = height * 0.48;
  for (let i = 0; i < 12; i += 1) {
    const bx = (i / 12) * width;
    const bw = width / 12 + 6;
    const bh = height * (0.15 + seededNoise(rng) * 0.4);
    const by = horizon - bh * 0.2;
    g.rect(bx + 2, by, bw - 4, bh).fill({
      color: i % 3 === 0 ? 0x6a1b9a : 0x4527a0,
    });
    const neon = i % 4 === 0 ? 0xff4081 : 0x00e5ff;
    g.rect(bx + bw * 0.35, by + bh * 0.4, bw * 0.2, 4).fill({
      color: neon,
      alpha: 0.9,
    });
  }

  g.rect(0, horizon + 40, width, height - horizon - 40).fill({
    color: 0x263238,
  });
  for (let x = 30; x < width; x += 80) {
    const lx = x + rng() * 40;
    g.rect(lx, horizon + 55, 3, height).fill({ color: 0xf06292, alpha: 0.15 });
  }

  root.addChild(g);
  return root;
}

function seededNoise(rng: () => number): number {
  return rng();
}

function makeBench(bx: number, by: number, rng: () => number): Graphics {
  const gr = new Graphics();
  const w = 36 + Math.floor(rng() * 10);
  gr.rect(bx, by, w, 5).fill({ color: 0x6d4c41 });
  gr.rect(bx + 4, by + 5, 4, 10).fill({ color: 0x5d4037 });
  gr.rect(bx + w - 8, by + 5, 4, 10).fill({ color: 0x5d4037 });
  return gr;
}

function makeTree(x: number, y: number, rng: () => number): Container {
  const c = new Container();
  c.position.set(x, y);
  const trunk = new Graphics();
  trunk.rect(-4, 0, 8, 28).fill({ color: 0x5d4037 });
  const foliage = new Graphics();
  const r = 18 + rng() * 10;
  foliage.circle(0, -8, r).fill({ color: 0x2e7d32 });
  foliage.circle(-8, -16, r * 0.6).fill({ color: 0x388e3c });
  foliage.circle(10, -14, r * 0.55).fill({ color: 0x43a047 });
  c.addChild(trunk);
  c.addChild(foliage);
  return c;
}
