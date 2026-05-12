import { describe, expect, it, vi } from "vitest";
import {
  createWorldConsoleExtensions,
  type WorldRpcSurface,
  type WorldStageFactories,
} from "./world-console-extensions.js";
import {
  createStageController,
  type StageHandle,
  type StageId,
} from "./stage-controller.js";

const makeStub = (id: StageId): StageHandle => ({
  id,
  root: { alpha: 1, scale: { x: 1, y: 1 } },
  attach: () => {},
  detach: () => {},
  destroy: () => {},
});

const makeStubParent = () => {
  const children: unknown[] = [];
  return {
    children,
    addChild: (c: unknown) => {
      children.push(c);
    },
    removeChild: (c: unknown) => {
      const idx = children.indexOf(c);
      if (idx >= 0) children.splice(idx, 1);
    },
  };
};

const mockRpc = (): WorldRpcSurface => ({
  getWallet: vi.fn(async (_playerId: string) => ({
    playerId: "p1",
    balanceUsd: 70,
    currency: "USD" as const,
    updatedAt: "now",
  })),
  setWallet: vi.fn(async (input: { playerId: string; balanceUsd: number }) => ({
    playerId: input.playerId,
    balanceUsd: input.balanceUsd,
    currency: "USD" as const,
    updatedAt: "now",
  })),
  adjustWallet: vi.fn(
    async (input: { playerId: string; deltaUsd: number }) => ({
      playerId: input.playerId,
      balanceUsd: 70 + input.deltaUsd,
      currency: "USD" as const,
      updatedAt: "now",
    })
  ),
  addShopItem: vi.fn(async () => {}),
  addSupermarketItem: vi.fn(async () => {}),
  addCarWashCar: vi.fn(async () => {}),
});

const advance = async (
  controller: ReturnType<typeof createStageController>,
  promise: Promise<unknown>
): Promise<void> => {
  for (let i = 0; i < 60; i += 1) {
    controller.update(40);
    const settled = await Promise.race([
      promise.then(() => "done" as const),
      Promise.resolve("pending" as const),
    ]);
    if (settled === "done") return;
  }
  await promise;
};

describe("world-console-extensions", () => {
  it("enter.space delegates to the yard factory and the controller", async () => {
    const parent = makeStubParent();
    const controller = createStageController({ parent, durationMs: 30 });
    await advance(controller, controller.enter(makeStub("overworld")));

    const yardHandle = makeStub("spaceYard");
    const factories: WorldStageFactories = {
      buildYard: vi.fn(() => yardHandle),
      buildAmenity: vi.fn(() => makeStub("amenityShop")),
    };
    const ext = createWorldConsoleExtensions({
      controller,
      factories,
      rpc: mockRpc(),
    });
    const result = ext.enter.space("space-1");
    await advance(controller, result);
    expect(factories.buildYard).toHaveBeenCalledWith("space-1");
    expect(controller.current()?.id).toBe("spaceYard");
  });

  it("enter.amenity passes the kind to the factory", async () => {
    const parent = makeStubParent();
    const controller = createStageController({ parent, durationMs: 30 });
    await advance(controller, controller.enter(makeStub("overworld")));
    await advance(controller, controller.enter(makeStub("spaceYard")));

    const factories: WorldStageFactories = {
      buildYard: vi.fn(() => makeStub("spaceYard")),
      buildAmenity: vi.fn(() => makeStub("amenityCarWash")),
    };
    const ext = createWorldConsoleExtensions({
      controller,
      factories,
      rpc: mockRpc(),
    });
    const result = ext.enter.amenity("space-1", "car_wash");
    await advance(controller, result);
    expect(factories.buildAmenity).toHaveBeenCalledWith({
      spaceId: "space-1",
      kind: "car_wash",
    });
    expect(controller.current()?.id).toBe("amenityCarWash");
  });

  it("enter.back pops the current stage and returns the new top id", async () => {
    const parent = makeStubParent();
    const controller = createStageController({ parent, durationMs: 30 });
    await advance(controller, controller.enter(makeStub("overworld")));
    await advance(controller, controller.enter(makeStub("spaceYard")));
    const ext = createWorldConsoleExtensions({
      controller,
      factories: {
        buildYard: () => makeStub("spaceYard"),
        buildAmenity: () => makeStub("amenityShop"),
      },
      rpc: mockRpc(),
    });
    const back = ext.enter.back();
    await advance(controller, back);
    await expect(back).resolves.toBe("overworld");
  });

  it("wallet helpers dispatch to the RPC surface", async () => {
    const rpc = mockRpc();
    const ext = createWorldConsoleExtensions({
      controller: createStageController({ parent: makeStubParent() }),
      factories: {
        buildYard: () => makeStub("spaceYard"),
        buildAmenity: () => makeStub("amenityShop"),
      },
      rpc,
    });
    await ext.wallet.get("p1");
    expect(rpc.getWallet).toHaveBeenCalledWith("p1");
    await ext.wallet.set("p1", 50);
    expect(rpc.setWallet).toHaveBeenCalledWith({
      playerId: "p1",
      balanceUsd: 50,
    });
    await ext.wallet.adjust("p1", -10);
    expect(rpc.adjustWallet).toHaveBeenCalledWith({
      playerId: "p1",
      deltaUsd: -10,
    });
  });

  it("amenity.* helpers route to the matching RPC op", async () => {
    const rpc = mockRpc();
    const ext = createWorldConsoleExtensions({
      controller: createStageController({ parent: makeStubParent() }),
      factories: {
        buildYard: () => makeStub("spaceYard"),
        buildAmenity: () => makeStub("amenityShop"),
      },
      rpc,
    });

    await ext.amenity.shop.add({
      spaceId: "s1",
      type: "book",
      name: "n",
      description: "d",
      priceUsd: 9,
    });
    expect(rpc.addShopItem).toHaveBeenCalled();

    await ext.amenity.supermarket.add({
      spaceId: "s1",
      row: 1,
      name: "Apple",
      description: "fresh",
      priceUsd: 1,
    });
    expect(rpc.addSupermarketItem).toHaveBeenCalled();

    await ext.amenity.carWash.add({
      spaceId: "s1",
      name: "GT",
      model: "350",
      year: 2024,
      priceUsd: 1000,
      colorHex: "#ff0000",
    });
    expect(rpc.addCarWashCar).toHaveBeenCalled();
  });
});
