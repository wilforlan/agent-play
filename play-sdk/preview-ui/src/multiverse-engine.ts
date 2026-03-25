export type MultiversePalette = {
  background: string;
  grid: string;
  structureTool: string;
  structureHome: string;
  agent: string;
  calloutBg: string;
  text: string;
  textMuted: string;
  stroke: string;
};

export const defaultMultiversePalette: MultiversePalette = {
  background: "#1a1c2e",
  grid: "rgba(100, 118, 140, 0.15)",
  structureTool: "#3b82f6",
  structureHome: "#f59e0b",
  agent: "#22d3ee",
  calloutBg: "rgba(15, 23, 42, 0.88)",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  stroke: "#334155",
};

export type MultiverseBoard = {
  width: number;
  height: number;
  palette: MultiversePalette;
};

export type MultiverseLoop = {
  init: () => void | Promise<void>;
  update: (dtSeconds: number) => void;
  render: (ctx: CanvasRenderingContext2D, board: MultiverseBoard) => void;
};

export type StartMultiverseOptions = {
  width: number;
  height: number;
  parent?: HTMLElement;
  palette?: Partial<MultiversePalette>;
  loop: MultiverseLoop;
};

function mergePalette(
  partial?: Partial<MultiversePalette>
): MultiversePalette {
  return { ...defaultMultiversePalette, ...partial };
}

export function structureFill(kind: string, palette: MultiversePalette): string {
  return kind === "home" ? palette.structureHome : palette.structureTool;
}

export function startMultiverse(options: StartMultiverseOptions): void {
  const { width, height, parent = document.body, loop } = options;
  const palette = mergePalette(options.palette);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "agent-play multiverse preview");
  canvas.style.cssText =
    "display:block;margin:0 auto;touch-action:none;image-rendering:pixelated;image-rendering:crisp-edges;";
  parent.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("Multiverse engine: could not acquire 2d context");
  }
  ctx.imageSmoothingEnabled = false;

  const board: MultiverseBoard = { width, height, palette };
  let last = performance.now();

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    loop.update(dt);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
    loop.render(ctx, board);
    requestAnimationFrame(frame);
  };

  void Promise.resolve(loop.init()).then(() => {
    requestAnimationFrame(frame);
  });
}
