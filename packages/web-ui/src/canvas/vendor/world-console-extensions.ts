/**
 * @packageDocumentation
 * @module @agent-play/play-ui/world-console-extensions
 *
 * Augments the `world.*` browser console object with the stage-switch,
 * wallet, and amenity-authoring helpers introduced by the world-switch
 * release.
 *
 * The module is host-agnostic: it accepts the controller, the snapshot
 * lookup, and the network surface as injected dependencies so it can be
 * exercised in isolation under vitest.
 *
 * @see ./main.ts for the production wiring.
 * @see ../../docs/aql/language-reference.md for the AQL equivalent
 *      commands.
 */

import type {
  EnterOptions,
  StageController,
  StageHandle,
  StageId,
} from "./stage-controller.js";
import type { WalletDto } from "./wallet-client.js";

/**
 * Stage factory dependencies the host injects for the console API.
 *
 * @public
 */
export type WorldStageFactories = {
  buildYard(spaceId: string): Promise<StageHandle> | StageHandle;
  buildAmenity(input: {
    spaceId: string;
    kind: "shop" | "supermarket" | "car_wash";
  }): Promise<StageHandle> | StageHandle;
};

/**
 * RPC surface the console helpers call through.
 *
 * @public
 */
export type WorldRpcSurface = {
  getWallet(playerId: string): Promise<WalletDto>;
  setWallet(input: { playerId: string; balanceUsd: number }): Promise<WalletDto>;
  adjustWallet(input: {
    playerId: string;
    deltaUsd: number;
  }): Promise<WalletDto>;
  addShopItem(input: {
    spaceId: string;
    type: "book" | "music" | "coffee";
    name: string;
    description: string;
    priceUsd: number;
  }): Promise<void>;
  addSupermarketItem(input: {
    spaceId: string;
    row: 1 | 2 | 3 | 4;
    column?: 1 | 2 | 3 | 4 | 5;
    name: string;
    description: string;
    priceUsd: number;
  }): Promise<void>;
  addCarWashCar(input: {
    spaceId: string;
    slot?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    name: string;
    model: string;
    year: number;
    priceUsd: number;
    colorHex: string;
  }): Promise<void>;
};

/**
 * Shape of the `world.*` extensions installed by {@link installWorldExtensions}.
 *
 * @public
 */
export type WorldConsoleExtensions = {
  enter: {
    space(spaceId: string): Promise<StageId>;
    amenity(
      spaceId: string,
      kind: "shop" | "supermarket" | "car_wash"
    ): Promise<StageId>;
    back(): Promise<StageId | null>;
  };
  wallet: {
    get(playerId: string): Promise<WalletDto>;
    set(playerId: string, balanceUsd: number): Promise<WalletDto>;
    adjust(playerId: string, deltaUsd: number): Promise<WalletDto>;
  };
  amenity: {
    shop: {
      add(input: {
        spaceId: string;
        type: "book" | "music" | "coffee";
        name: string;
        description: string;
        priceUsd: number;
      }): Promise<void>;
    };
    supermarket: {
      add(input: {
        spaceId: string;
        row: 1 | 2 | 3 | 4;
        column?: 1 | 2 | 3 | 4 | 5;
        name: string;
        description: string;
        priceUsd: number;
      }): Promise<void>;
    };
    carWash: {
      add(input: {
        spaceId: string;
        slot?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
        name: string;
        model: string;
        year: number;
        priceUsd: number;
        colorHex: string;
      }): Promise<void>;
    };
  };
};

/**
 * Build the console-API extensions object.
 *
 * @example
 * ```ts
 * const ext = createWorldConsoleExtensions({
 *   controller,
 *   factories,
 *   rpc,
 * });
 * Object.assign(globalThis.world, ext);
 * ```
 *
 * @public
 */
export const createWorldConsoleExtensions = (deps: {
  controller: StageController;
  factories: WorldStageFactories;
  rpc: WorldRpcSurface;
}): WorldConsoleExtensions => {
  const enterStage = async (
    handle: StageHandle,
    options?: EnterOptions
  ): Promise<StageId> => {
    await deps.controller.enter(handle, options);
    return handle.id;
  };

  return {
    enter: {
      space: async (spaceId) => {
        const yard = await Promise.resolve(deps.factories.buildYard(spaceId));
        return enterStage(yard);
      },
      amenity: async (spaceId, kind) => {
        const amenity = await Promise.resolve(
          deps.factories.buildAmenity({ spaceId, kind })
        );
        return enterStage(amenity);
      },
      back: async () => {
        await deps.controller.back();
        return deps.controller.current()?.id ?? null;
      },
    },
    wallet: {
      get: (playerId) => deps.rpc.getWallet(playerId),
      set: (playerId, balanceUsd) =>
        deps.rpc.setWallet({ playerId, balanceUsd }),
      adjust: (playerId, deltaUsd) =>
        deps.rpc.adjustWallet({ playerId, deltaUsd }),
    },
    amenity: {
      shop: { add: (input) => deps.rpc.addShopItem(input) },
      supermarket: { add: (input) => deps.rpc.addSupermarketItem(input) },
      carWash: { add: (input) => deps.rpc.addCarWashCar(input) },
    },
  };
};
