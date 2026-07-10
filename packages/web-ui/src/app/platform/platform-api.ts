import { withInflightDedup } from "./platform-request-dedup";

export type PlatformAuth = {
  serverUrl: string;
  nodeId: string;
  passwordMaterial: string;
  spaceCatalogId: string;
  spaceName: string;
  sid: string;
  platformServiceKey: string | null;
};

export type InspectSpacePayload = {
  catalog: unknown;
  logs: unknown[];
};

export type PlatformSpaceOverview = {
  spaceId: string;
  generatedAt: string;
  gmvUsd: number;
  gmvUsd24h: number;
  purchaseCount: number;
  purchaseCount24h: number;
  itemsAvailable: number;
  itemsSold: number;
  byAmenityKind: ReadonlyArray<{ kind: string; purchases: number; gmvUsd: number }>;
};

export type PlatformSpacePurchaseRow = {
  id: string;
  at: string;
  playerId: string;
  amenityKind: string;
  itemRef: { kind: string; id: string };
  priceUsd: number | null;
};

const platformAuthKey = (auth: PlatformAuth): string =>
  `${auth.spaceCatalogId}:${auth.nodeId}`;

const rpcHeaders = (auth: PlatformAuth): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-node-id": auth.nodeId,
    "x-node-passw": auth.passwordMaterial,
  };
  if (auth.platformServiceKey !== null && auth.platformServiceKey.length > 0) {
    headers["x-agent-service-key"] = auth.platformServiceKey;
  }
  return headers;
};

export async function postPlatformRpc<T = Record<string, unknown>>(input: {
  auth: PlatformAuth;
  op: string;
  payload?: Record<string, unknown>;
  dedupeKey?: string;
}): Promise<{ ok: boolean; status: number; json: T }> {
  const execute = async (): Promise<{ ok: boolean; status: number; json: T }> => {
    const base = input.auth.serverUrl.replace(/\/$/, "");
    const res = await fetch(
      `${base}/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.auth.sid)}`,
      {
        method: "POST",
        headers: rpcHeaders(input.auth),
        body: JSON.stringify({
          op: input.op,
          ...(input.payload !== undefined ? { payload: input.payload } : {}),
        }),
      }
    );
    const json = (await res.json()) as T;
    return { ok: res.ok, status: res.status, json };
  };
  if (input.dedupeKey !== undefined && input.dedupeKey.length > 0) {
    return withInflightDedup(input.dedupeKey, execute);
  }
  return execute();
}

export async function fetchInspectSpace(auth: PlatformAuth): Promise<InspectSpacePayload> {
  return withInflightDedup(`inspectSpace:${platformAuthKey(auth)}`, async () => {
    const result = await postPlatformRpc<InspectSpacePayload>({
      auth,
      op: "inspectSpace",
      payload: { spaceId: auth.spaceCatalogId },
    });
    if (!result.ok) {
      const err = result.json as { error?: string };
      throw new Error(typeof err.error === "string" ? err.error : "Failed to load space");
    }
    return {
      catalog: result.json.catalog,
      logs: Array.isArray(result.json.logs) ? result.json.logs : [],
    };
  });
}

export async function fetchPlatformOverview(
  auth: PlatformAuth
): Promise<PlatformSpaceOverview> {
  return withInflightDedup(`overview:${platformAuthKey(auth)}`, async () => {
    const base = auth.serverUrl.replace(/\/$/, "");
    const res = await fetch(
      `${base}/api/platform/spaces/${encodeURIComponent(auth.spaceCatalogId)}/overview`,
      { headers: rpcHeaders(auth) }
    );
    const json = (await res.json()) as PlatformSpaceOverview & { error?: string };
    if (!res.ok) {
      throw new Error(typeof json.error === "string" ? json.error : "Overview unavailable");
    }
    return json;
  });
}

export async function fetchPlatformPurchases(
  auth: PlatformAuth,
  options?: { sinceMs?: number; limit?: number }
): Promise<{ purchases: PlatformSpacePurchaseRow[]; generatedAt: string }> {
  const sinceMs = options?.sinceMs;
  const limit = options?.limit;
  const dedupeKey = `purchases:${platformAuthKey(auth)}:${sinceMs ?? ""}:${limit ?? ""}`;
  return withInflightDedup(dedupeKey, async () => {
    const base = auth.serverUrl.replace(/\/$/, "");
    const params = new URLSearchParams();
    if (sinceMs !== undefined) {
      params.set("sinceMs", String(sinceMs));
    }
    if (limit !== undefined) {
      params.set("limit", String(limit));
    }
    const qs = params.toString();
    const res = await fetch(
      `${base}/api/platform/spaces/${encodeURIComponent(auth.spaceCatalogId)}/purchases${qs.length > 0 ? `?${qs}` : ""}`,
      { headers: rpcHeaders(auth) }
    );
    const json = (await res.json()) as {
      purchases?: PlatformSpacePurchaseRow[];
      generatedAt?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(typeof json.error === "string" ? json.error : "Purchases unavailable");
    }
    return {
      purchases: Array.isArray(json.purchases) ? json.purchases : [],
      generatedAt:
        typeof json.generatedAt === "string" ? json.generatedAt : new Date().toISOString(),
    };
  });
}

export type SpaceWallet = {
  playerId: string;
  balanceUsd: number;
  powerUps: number;
  updatedAt: string;
};

export async function fetchSpaceWallet(auth: PlatformAuth): Promise<SpaceWallet> {
  return withInflightDedup(`spaceWallet:${platformAuthKey(auth)}`, async () => {
    const result = await postPlatformRpc<{
      wallet?: SpaceWallet;
      error?: string;
    }>({
      auth,
      op: "getPlayerWallet",
      payload: { playerId: auth.nodeId },
    });
    if (!result.ok) {
      throw new Error(
        typeof result.json.error === "string" ? result.json.error : "Space wallet unavailable"
      );
    }
    const wallet = result.json.wallet;
    if (wallet === undefined) {
      throw new Error("Space wallet unavailable");
    }
    return wallet;
  });
}

export type SpaceWalletSummary = {
  wallet: SpaceWallet;
  gmvUsd: number;
};

export async function fetchSpaceWalletSummary(auth: PlatformAuth): Promise<SpaceWalletSummary> {
  return withInflightDedup(`spaceWalletSummary:${platformAuthKey(auth)}`, async () => {
    const [wallet, overview] = await Promise.all([
      fetchSpaceWallet(auth),
      fetchPlatformOverview(auth),
    ]);
    return { wallet, gmvUsd: overview.gmvUsd };
  });
}

export type InspectAmenityItemRow = {
  id: string;
  name: string;
  priceUsd: number;
  sale: { status: string };
};

export async function fetchInspectAmenityItems(
  auth: PlatformAuth,
  kind: string
): Promise<InspectAmenityItemRow[]> {
  return withInflightDedup(`inspectAmenity:${platformAuthKey(auth)}:${kind}`, async () => {
    const result = await postPlatformRpc<{
      items?: InspectAmenityItemRow[];
      error?: string;
    }>({
      auth,
      op: "inspectAmenity",
      payload: { spaceId: auth.spaceCatalogId, kind },
    });
    if (!result.ok) {
      throw new Error(
        typeof result.json.error === "string" ? result.json.error : "Failed to load items"
      );
    }
    const list = Array.isArray(result.json.items) ? result.json.items : [];
    return list.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      priceUsd: Number(item.priceUsd),
      sale: item.sale,
    }));
  });
}

export async function loginPlatform(input: {
  serverUrl: string;
  nodeId: string;
  passphraseMaterial: string;
  rootKey: string;
  platformServiceKey?: string;
}): Promise<PlatformAuth> {
  const trimmedUrl = input.serverUrl.trim();
  const trimmedNode = input.nodeId.trim();
  const base = trimmedUrl.replace(/\/$/, "");

  const validated = await fetch(`${base}/api/nodes/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-node-id": trimmedNode,
      "x-node-passw": input.passphraseMaterial,
    },
    body: JSON.stringify({ nodeId: trimmedNode, rootKey: input.rootKey.toLowerCase() }),
  });
  const validatedJson = (await validated.json()) as { ok?: boolean; reason?: string };
  if (!validated.ok || validatedJson.ok !== true) {
    throw new Error(
      typeof validatedJson.reason === "string"
        ? validatedJson.reason
        : `Validation failed (${validated.status})`
    );
  }

  const nodesRes = await fetch(`${base}/api/nodes`, {
    headers: {
      "x-node-id": trimmedNode,
      "x-node-passw": input.passphraseMaterial,
    },
  });
  const nodesJson = (await nodesRes.json()) as {
    mainNode?: { kind?: string; spaceId?: string; displayName?: string; name?: string };
    error?: string;
  };
  if (!nodesRes.ok) {
    throw new Error(typeof nodesJson.error === "string" ? nodesJson.error : "Unauthorized");
  }
  const mainNode = nodesJson.mainNode;
  if (mainNode?.kind !== "space") {
    throw new Error("This dashboard expects a space node id (kind space).");
  }
  const spaceCatalogId =
    typeof mainNode.spaceId === "string" && mainNode.spaceId.length > 0
      ? mainNode.spaceId
      : null;
  if (spaceCatalogId === null) {
    throw new Error("Space node record is missing spaceId.");
  }

  const sessionRes = await fetch(`${base}/api/agent-play/session`);
  const sessionJson = (await sessionRes.json()) as { sid?: string; error?: string };
  if (!sessionRes.ok || typeof sessionJson.sid !== "string" || sessionJson.sid.length === 0) {
    throw new Error(
      typeof sessionJson.error === "string" ? sessionJson.error : "Session request failed"
    );
  }

  const spaceName =
    typeof mainNode.displayName === "string" && mainNode.displayName.length > 0
      ? mainNode.displayName
      : typeof mainNode.name === "string" && mainNode.name.length > 0
        ? mainNode.name
        : spaceCatalogId;

  return {
    serverUrl: trimmedUrl,
    nodeId: trimmedNode,
    passwordMaterial: input.passphraseMaterial,
    spaceCatalogId,
    spaceName,
    sid: sessionJson.sid,
    platformServiceKey:
      input.platformServiceKey !== undefined && input.platformServiceKey.trim().length > 0
        ? input.platformServiceKey.trim()
        : null,
  };
}
