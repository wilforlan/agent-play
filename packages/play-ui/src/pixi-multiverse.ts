/**
 * @module @agent-play/play-ui/pixi-multiverse
 * pixi multiverse — preview canvas module (Pixi + DOM).
 */
import { Application } from "pixi.js";

export type PixiPreviewHandle = {
  app: Application;
  destroy: () => void;
};

export async function createPixiPreview(options: {
  width: number;
  height: number;
  parent: HTMLElement;
  backgroundColor: number;
  onTick: (dt: number) => void;
  onFrame: () => void;
}): Promise<PixiPreviewHandle> {
  const app = new Application();
  await app.init({
    width: options.width,
    height: options.height,
    backgroundColor: options.backgroundColor,
    antialias: false,
    resolution: 1,
    autoDensity: false,
    preference: "webgl",
  });
  const canvas = app.canvas as HTMLCanvasElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "agent-play multiverse preview");
  canvas.style.display = "block";
  canvas.style.margin = "0 auto";
  canvas.style.touchAction = "none";
  canvas.style.imageRendering = "pixelated";
  options.parent.appendChild(canvas);
  app.ticker.add(() => {
    const dt = app.ticker.deltaMS / 1000;
    options.onTick(Math.min(0.05, dt));
    options.onFrame();
  });
  return {
    app,
    destroy: () => {
      app.destroy(true, { children: true, texture: true });
      if (canvas.parentElement === options.parent) {
        options.parent.removeChild(canvas);
      }
    },
  };
}
