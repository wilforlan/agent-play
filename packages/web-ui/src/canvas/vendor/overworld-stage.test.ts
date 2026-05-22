import { describe, expect, it, vi } from "vitest";
import { createOverworldStage } from "./overworld-stage.js";
import type { StageRoot } from "./stage-controller.js";

const makeRoot = (): StageRoot => ({ alpha: 1, scale: { x: 1, y: 1 } });

describe("createOverworldStage", () => {
  it("returns a stage handle with id 'overworld' and the supplied root", () => {
    const root = makeRoot();
    const stage = createOverworldStage({ root });
    expect(stage.id).toBe("overworld");
    expect(stage.root).toBe(root);
  });

  it("calls the optional lifecycle hooks supplied by the host", () => {
    const root = makeRoot();
    const attach = vi.fn();
    const detach = vi.fn();
    const destroy = vi.fn();
    const stage = createOverworldStage({ root, attach, detach, destroy });

    stage.attach();
    stage.detach();
    stage.destroy();

    expect(attach).toHaveBeenCalledOnce();
    expect(detach).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("falls back to no-op lifecycle hooks when none are provided", () => {
    const stage = createOverworldStage({ root: makeRoot() });
    expect(() => {
      stage.attach();
      stage.detach();
      stage.destroy();
    }).not.toThrow();
  });
});
