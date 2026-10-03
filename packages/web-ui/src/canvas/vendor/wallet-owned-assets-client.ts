import type { WalletDto } from "./wallet-client.js";

export type OwnedAssetRefDto = {
  readonly spaceId: string;
  readonly amenityKind: "shop" | "supermarket" | "car_wash";
  readonly itemId: string;
};

export type OwnedAssetItemDto = {
  readonly id: string;
  readonly name?: string;
  readonly model?: string;
  readonly year?: number;
  readonly colorHex?: string;
  readonly type?: string;
  readonly description?: string;
  readonly priceUsd: number;
  readonly sale: {
    readonly status: "available" | "sold" | "transfer_available";
    readonly soldToPlayerId?: string;
    readonly transferListing?: {
      readonly listingId: string;
      readonly sellerPlayerId: string;
      readonly priceUsd: number;
      readonly listedAt: string;
      readonly updatedAt: string;
    };
  };
};

export type OwnedAssetEntryDto = {
  readonly ref: OwnedAssetRefDto;
  readonly item: OwnedAssetItemDto;
};

export type ListOwnedAssetsResult = {
  readonly wallet: WalletDto;
  readonly assets: ReadonlyArray<OwnedAssetEntryDto>;
};

const postRpc = async (input: {
  sid: string;
  op: string;
  payload: Record<string, unknown>;
  fetcher?: typeof fetch;
}): Promise<unknown> => {
  const fetcher = input.fetcher ?? fetch;
  const res = await fetcher(
    `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: input.op, payload: input.payload }),
    }
  );
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error =
      typeof json === "object" &&
      json !== null &&
      typeof (json as { error?: unknown }).error === "string"
        ? (json as { error: string }).error
        : "UNKNOWN";
    throw new Error(error);
  }
  return json;
};

export const fetchOwnedAssets = async (input: {
  sid: string;
  playerId: string;
  fetcher?: typeof fetch;
}): Promise<ListOwnedAssetsResult> => {
  const json = await postRpc({
    sid: input.sid,
    op: "listOwnedAssets",
    payload: { playerId: input.playerId },
    fetcher: input.fetcher,
  });
  const body = json as {
    wallet?: WalletDto;
    assets?: OwnedAssetEntryDto[];
  };
  if (body.wallet === undefined || !Array.isArray(body.assets)) {
    throw new Error("UNKNOWN");
  }
  return { wallet: body.wallet, assets: body.assets };
};

export const createTransferListingRequest = async (input: {
  sid: string;
  playerId: string;
  spaceId: string;
  amenityKind: OwnedAssetRefDto["amenityKind"];
  itemId: string;
  priceUsd: number;
  fetcher?: typeof fetch;
}): Promise<OwnedAssetItemDto> => {
  const itemRefKind =
    input.amenityKind === "car_wash" ? "carwash" : input.amenityKind;
  const json = await postRpc({
    sid: input.sid,
    op: "createTransferListing",
    payload: {
      playerId: input.playerId,
      spaceId: input.spaceId,
      amenityKind: input.amenityKind,
      itemRef: { kind: itemRefKind, id: input.itemId },
      priceUsd: input.priceUsd,
    },
    fetcher: input.fetcher,
  });
  const body = json as { item?: OwnedAssetItemDto };
  if (body.item === undefined) {
    throw new Error("UNKNOWN");
  }
  return body.item;
};

export const updateTransferListingPriceRequest = async (input: {
  sid: string;
  playerId: string;
  spaceId: string;
  amenityKind: OwnedAssetRefDto["amenityKind"];
  itemId: string;
  priceUsd: number;
  fetcher?: typeof fetch;
}): Promise<OwnedAssetItemDto> => {
  const itemRefKind =
    input.amenityKind === "car_wash" ? "carwash" : input.amenityKind;
  const json = await postRpc({
    sid: input.sid,
    op: "updateTransferListingPrice",
    payload: {
      playerId: input.playerId,
      spaceId: input.spaceId,
      amenityKind: input.amenityKind,
      itemRef: { kind: itemRefKind, id: input.itemId },
      priceUsd: input.priceUsd,
    },
    fetcher: input.fetcher,
  });
  const body = json as { item?: OwnedAssetItemDto };
  if (body.item === undefined) {
    throw new Error("UNKNOWN");
  }
  return body.item;
};

export const cancelTransferListingRequest = async (input: {
  sid: string;
  playerId: string;
  spaceId: string;
  amenityKind: OwnedAssetRefDto["amenityKind"];
  itemId: string;
  fetcher?: typeof fetch;
}): Promise<OwnedAssetItemDto> => {
  const itemRefKind =
    input.amenityKind === "car_wash" ? "carwash" : input.amenityKind;
  const json = await postRpc({
    sid: input.sid,
    op: "cancelTransferListing",
    payload: {
      playerId: input.playerId,
      spaceId: input.spaceId,
      amenityKind: input.amenityKind,
      itemRef: { kind: itemRefKind, id: input.itemId },
    },
    fetcher: input.fetcher,
  });
  const body = json as { item?: OwnedAssetItemDto };
  if (body.item === undefined) {
    throw new Error("UNKNOWN");
  }
  return body.item;
};
