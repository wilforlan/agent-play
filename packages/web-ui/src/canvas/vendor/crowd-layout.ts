/**
 * @module @agent-play/play-ui/crowd-layout
 * crowd layout — preview canvas module (Pixi + DOM).
 */
export type CrowdDogMode = "none" | "held" | "feet";

export type CrowdPersonSpec = {
  dx: number;
  dy: number;
  dogMode: CrowdDogMode;
  facing: "left" | "right";
};

export type CrowdClusterSpec = {
  cx: number;
  cy: number;
  people: CrowdPersonSpec[];
};

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function layoutCrowdClusters(options: {
  width: number;
  height: number;
  seed: number;
  groundTop: number;
  groundBottom: number;
  clusterCountRange: readonly [number, number];
}): CrowdClusterSpec[] {
  const rng = mulberry32(options.seed);
  const [cMin, cMax] = options.clusterCountRange;
  const span = Math.max(1, cMax - cMin + 1);
  const clusterCount = cMin + Math.floor(rng() * span);
  const clusters: CrowdClusterSpec[] = [];
  const marginX = 48;
  const centers: { x: number; y: number }[] = [];
  const minDist = 64;
  let attempts = 0;
  while (centers.length < clusterCount && attempts < 900) {
    attempts += 1;
    const cx = marginX + rng() * (options.width - 2 * marginX);
    const cy =
      options.groundTop + 24 + rng() * (options.groundBottom - options.groundTop - 48);
    const d = attempts > 550 ? 36 : minDist;
    const ok = centers.every((p) => Math.hypot(p.x - cx, p.y - cy) >= d);
    if (ok) centers.push({ x: cx, y: cy });
  }
  for (const cen of centers) {
    const peopleCount = 2 + Math.floor(rng() * 4);
    const people: CrowdPersonSpec[] = [];
    for (let p = 0; p < peopleCount; p += 1) {
      const angle = (p / peopleCount) * Math.PI * 2 + rng() * 0.4;
      const rad = 8 + rng() * 10;
      const hasDog = rng() > 0.52;
      const dogMode: CrowdDogMode =
        hasDog === false ? "none" : rng() > 0.48 ? "held" : "feet";
      people.push({
        dx: Math.cos(angle) * rad,
        dy: Math.sin(angle) * rad * 0.6,
        dogMode,
        facing: rng() > 0.5 ? "right" : "left",
      });
    }
    clusters.push({ cx: cen.x, cy: cen.y, people });
  }
  return clusters;
}
