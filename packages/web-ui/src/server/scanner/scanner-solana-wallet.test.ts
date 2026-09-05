import { describe, expect, it } from "vitest";
import { solanaWalletKey } from "./scanner-keys.js";
import { readLinkedSolanaWallets } from "./scanner-solana-wallet.js";

describe("readLinkedSolanaWallets", () => {
  it("returns active Solana addresses for APU from/to nodes", async () => {
    const strings = new Map<string, string>();
    strings.set(
      solanaWalletKey("default", "seller-1"),
      JSON.stringify({
        nodeId: "seller-1",
        address: "SoSeller111",
        status: "active",
      }),
    );
    strings.set(
      solanaWalletKey("default", "buyer-1"),
      JSON.stringify({
        nodeId: "buyer-1",
        address: "SoBuyer222",
        status: "active",
      }),
    );
    const redis = {
      async get(key: string) {
        return strings.get(key) ?? null;
      },
    };

    await expect(
      readLinkedSolanaWallets({
        redis: redis as never,
        hostId: "default",
        from: "seller-1",
        to: "buyer-1",
      }),
    ).resolves.toEqual({ from: "SoSeller111", to: "SoBuyer222" });
  });
});
