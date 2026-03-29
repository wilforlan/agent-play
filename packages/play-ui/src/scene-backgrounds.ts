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

const GROUND_TOP_RATIO = 0.58;

export function buildNewYorkScene(
  width: number,
  height: number,
  seed: number
): Container {
  const root = new Container();
  const rng = mulberry32(seed);
  const g = new Graphics();
  const groundTop = height * GROUND_TOP_RATIO;

  const skyBottom = groundTop * 0.92;
  g.rect(0, 0, width, skyBottom * 0.38).fill({ color: 0x7c8fa3 });
  g.rect(0, skyBottom * 0.38, width, skyBottom * 0.32).fill({ color: 0x94a8bc });
  g.rect(0, skyBottom * 0.7, width, skyBottom * 0.3).fill({ color: 0xa8bad0 });
  g.rect(0, groundTop - 36, width, 36).fill({ color: 0xb8c9d8, alpha: 0.45 });

  const skylineBase = groundTop - 6;
  const columns = 11 + Math.floor(rng() * 4);
  for (let i = 0; i < columns; i += 1) {
    const bx = (i / columns) * width + (rng() - 0.5) * 10;
    const bw = width / columns + 3 + rng() * 4;
    const bh = height * (0.2 + rng() * 0.34);
    const by = skylineBase - bh;
    const stone = rng() > 0.45 ? 0x4a5f6f : 0x5d6f7f;
    g.rect(bx, by, bw, bh).fill({ color: stone });
    const winColor = rng() > 0.55 ? 0xfff8e1 : 0xffecb3;
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        if (rng() > 0.18) {
          g.rect(
            bx + 5 + col * (bw / 3.2),
            by + 10 + row * 16,
            7,
            9
          ).fill({ color: winColor, alpha: rng() * 0.45 + 0.35 });
        }
      }
    }
    if (rng() > 0.65) {
      g.rect(bx + bw * 0.35, by + 4, bw * 0.3, 5).fill({
        color: 0x263238,
        alpha: 0.85,
      });
    }
  }

  g.rect(0, groundTop, width, height - groundTop).fill({ color: 0x3e4a52 });
  g.rect(0, groundTop, width, 8).fill({ color: 0x5c6b76, alpha: 0.55 });
  const laneY = groundTop + (height - groundTop) * 0.42;
  for (let x = 0; x < width; x += 22) {
    g.rect(x, laneY, 12, 2).fill({ color: 0xfacc15, alpha: 0.88 });
  }
  for (let x = 40; x < width; x += 180) {
    g.rect(x, groundTop + 12, 28, 3).fill({ color: 0xe2e8f0, alpha: 0.35 });
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
  const groundTop = height * GROUND_TOP_RATIO;

  const skyH = groundTop * 0.94;
  g.rect(0, 0, width, skyH * 0.42).fill({ color: 0x0f172a });
  g.rect(0, skyH * 0.42, width, skyH * 0.33).fill({ color: 0x1e293b });
  g.rect(0, skyH * 0.75, width, skyH * 0.25).fill({ color: 0x1e1b4b });

  for (let s = 0; s < 52; s += 1) {
    const sx = rng() * width;
    const sy = rng() * groundTop * 0.52;
    const a = rng() * 0.45 + 0.25;
    g.circle(sx, sy, rng() > 0.88 ? 1.8 : 1).fill({ color: 0xe2e8f0, alpha: a });
  }

  const skylineBase = groundTop - 4;
  const columns = 14;
  for (let i = 0; i < columns; i += 1) {
    const bx = (i / columns) * width + (rng() - 0.5) * 6;
    const bw = width / columns + rng() * 3;
    const bh = height * (0.14 + rng() * 0.26);
    const by = skylineBase - bh;
    const fac =
      i % 4 === 0 ? 0x312e81 : i % 4 === 1 ? 0x3730a3 : 0x1e1b4b;
    g.rect(bx, by, bw, bh).fill({ color: fac });
    if (rng() > 0.4) {
      const ny = by + bh * (0.22 + rng() * 0.45);
      g.rect(bx + bw * 0.15, ny, bw * 0.7, 3).fill({
        color: rng() > 0.5 ? 0xf472b6 : 0x22d3ee,
        alpha: 0.88,
      });
    }
    for (let wy = by + 8; wy < skylineBase - 12; wy += 13) {
      for (let wx = bx + 4; wx < bx + bw - 10; wx += 8) {
        if (rng() > 0.42) {
          g.rect(wx, wy, 5, 7).fill({
            color: 0xfef3c7,
            alpha: rng() * 0.35 + 0.25,
          });
        }
      }
    }
  }

  g.rect(0, groundTop, width, height - groundTop).fill({ color: 0x0f172a });
  g.rect(0, groundTop, width, 5).fill({ color: 0x334155, alpha: 0.95 });
  for (let rx = 0; rx < width; rx += 100) {
    g.rect(rx + 15, groundTop + 24, 50, 3).fill({
      color: 0x6366f1,
      alpha: 0.07,
    });
  }
  for (let lx = 70; lx < width; lx += 220) {
    const ly = groundTop + 22;
    g.circle(lx, ly, 7).fill({ color: 0xf59e0b, alpha: 0.35 });
    g.circle(lx, ly, 3.5).fill({ color: 0xfef9c3, alpha: 0.9 });
  }

  root.addChild(g);
  return root;
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
