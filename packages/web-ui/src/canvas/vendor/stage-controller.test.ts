import { describe, expect, it } from "vitest";
import {
  createStageController,
  type StageHandle,
  type StageRoot,
} from "./stage-controller.js";

type RecordedEvent =
  | { kind: "attach"; id: string }
  | { kind: "detach"; id: string }
  | { kind: "destroy"; id: string };

const createRecorder = () => {
  const events: RecordedEvent[] = [];
  const makeStage = (id: StageHandle["id"]): StageHandle => {
    const root: StageRoot = { alpha: 1, scale: { x: 1, y: 1 } };
    return {
      id,
      root,
      attach: () => events.push({ kind: "attach", id }),
      detach: () => events.push({ kind: "detach", id }),
      destroy: () => events.push({ kind: "destroy", id }),
    };
  };
  return { events, makeStage };
};

const createStubParent = () => {
  const children: StageRoot[] = [];
  return {
    children,
    addChild: (root: StageRoot) => {
      children.push(root);
    },
    removeChild: (root: StageRoot) => {
      const idx = children.indexOf(root);
      if (idx >= 0) children.splice(idx, 1);
    },
  };
};

describe("stage-controller", () => {
  it("mounts the first stage immediately and runs the fade-in tween", async () => {
    const parent = createStubParent();
    const { events, makeStage } = createRecorder();
    const controller = createStageController({ parent, durationMs: 100 });

    const overworld = makeStage("overworld");
    const entered = controller.enter(overworld);

    expect(events).toEqual([{ kind: "attach", id: "overworld" }]);
    expect(parent.children).toContain(overworld.root);
    expect(overworld.root.alpha).toBeCloseTo(0);
    expect(overworld.root.scale.x).toBeCloseTo(1.04);

    controller.update(50);
    expect(overworld.root.alpha).toBeGreaterThan(0);
    expect(overworld.root.alpha).toBeLessThan(1);

    controller.update(60);
    await entered;

    expect(overworld.root.alpha).toBeCloseTo(1);
    expect(overworld.root.scale.x).toBeCloseTo(1);
    expect(controller.current()?.id).toBe("overworld");
  });

  it("eases out the previous stage and eases in the next, keeping history by default", async () => {
    const parent = createStubParent();
    const { events, makeStage } = createRecorder();
    const controller = createStageController({ parent, durationMs: 100 });

    const overworld = makeStage("overworld");
    await stepToCompletion(controller, controller.enter(overworld));

    const yard = makeStage("spaceYard");
    const transition = controller.enter(yard);

    controller.update(50);
    expect(overworld.root.alpha).toBeLessThan(1);
    expect(overworld.root.alpha).toBeGreaterThan(0);
    expect(parent.children).toContain(overworld.root);
    expect(parent.children).not.toContain(yard.root);

    controller.update(60);

    expect(parent.children).not.toContain(overworld.root);
    expect(parent.children).toContain(yard.root);
    expect(events).toContainEqual({ kind: "detach", id: "overworld" });
    expect(events).toContainEqual({ kind: "attach", id: "spaceYard" });
    expect(events).not.toContainEqual({ kind: "destroy", id: "overworld" });

    controller.update(110);
    await transition;
    expect(yard.root.alpha).toBeCloseTo(1);
    expect(yard.root.scale.x).toBeCloseTo(1);
    expect(controller.current()?.id).toBe("spaceYard");
  });

  it("destroys the current stage when entering without keeping history", async () => {
    const parent = createStubParent();
    const { events, makeStage } = createRecorder();
    const controller = createStageController({ parent, durationMs: 50 });

    await stepToCompletion(controller, controller.enter(makeStage("overworld")));
    await stepToCompletion(
      controller,
      controller.enter(makeStage("spaceYard"), { keepHistory: false })
    );

    expect(events).toContainEqual({ kind: "destroy", id: "overworld" });
    expect(controller.current()?.id).toBe("spaceYard");
  });

  it("back() destroys the current stage and reattaches the previous", async () => {
    const parent = createStubParent();
    const { events, makeStage } = createRecorder();
    const controller = createStageController({ parent, durationMs: 50 });

    const overworld = makeStage("overworld");
    const yard = makeStage("spaceYard");

    await stepToCompletion(controller, controller.enter(overworld));
    await stepToCompletion(controller, controller.enter(yard));
    await stepToCompletion(controller, controller.back());

    expect(events).toContainEqual({ kind: "destroy", id: "spaceYard" });
    expect(events).toContainEqual({ kind: "attach", id: "overworld" });
    expect(parent.children).toContain(overworld.root);
    expect(parent.children).not.toContain(yard.root);
    expect(controller.current()?.id).toBe("overworld");
  });

  it("back() rejects when there is no previous stage", async () => {
    const parent = createStubParent();
    const { makeStage } = createRecorder();
    const controller = createStageController({ parent, durationMs: 50 });

    await stepToCompletion(controller, controller.enter(makeStage("overworld")));
    await expect(controller.back()).rejects.toThrow();
  });

  it("destroy() tears down every stage in the stack", async () => {
    const parent = createStubParent();
    const { events, makeStage } = createRecorder();
    const controller = createStageController({ parent, durationMs: 30 });

    await stepToCompletion(controller, controller.enter(makeStage("overworld")));
    await stepToCompletion(controller, controller.enter(makeStage("spaceYard")));

    controller.destroy();

    expect(events.filter((e) => e.kind === "destroy").map((e) => e.id)).toEqual(
      ["spaceYard", "overworld"]
    );
    expect(controller.current()).toBeNull();
    expect(parent.children).toHaveLength(0);
  });
});

const stepToCompletion = async (
  controller: ReturnType<typeof createStageController>,
  promise: Promise<void>
): Promise<void> => {
  for (let step = 0; step < 50; step += 1) {
    controller.update(50);
    const settled = await Promise.race([
      promise.then(() => "done" as const),
      Promise.resolve("pending" as const),
    ]);
    if (settled === "done") return;
  }
  await promise;
};
