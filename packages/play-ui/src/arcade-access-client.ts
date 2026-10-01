/**
 * @packageDocumentation
 * @module @agent-play/play-ui/arcade-access-client
 *
 * Browser clients for Maple Ave arcade access RPCs.
 *
 * @public
 */

export type ArcadeAccessPlan = "day" | "week";
export type ArcadeTender = "apu" | "apw";

export type ArcadeAccessPass = {
  readonly plan: ArcadeAccessPlan;
  readonly purchasedAt: string;
  readonly expiresAt: string;
  readonly tender: ArcadeTender;
  readonly apuCost: number;
  readonly apwCharged: number;
};

export type ArcadeAccessSnapshot = {
  readonly access: ArcadeAccessPass | null;
  readonly apwPerApu: number;
  readonly quotes: { readonly day: number; readonly week: number };
  readonly preferredTender: ArcadeTender;
  readonly wallet: {
    readonly playerId: string;
    readonly balanceUsd: number;
    readonly powerUps: number;
    readonly currency: "USD";
    readonly updatedAt: string;
  };
};

const parseWallet = (raw: unknown): ArcadeAccessSnapshot["wallet"] => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("[agent-play:arcade-access] unexpected wallet shape");
  }
  const w = raw as {
    playerId?: unknown;
    balanceUsd?: unknown;
    powerUps?: unknown;
    updatedAt?: unknown;
  };
  if (
    typeof w.playerId !== "string" ||
    typeof w.balanceUsd !== "number" ||
    typeof w.updatedAt !== "string"
  ) {
    throw new Error("[agent-play:arcade-access] unexpected wallet shape");
  }
  const powerUps =
    typeof w.powerUps === "number" && Number.isFinite(w.powerUps)
      ? Math.max(0, Math.floor(w.powerUps))
      : 0;
  return {
    playerId: w.playerId,
    balanceUsd: w.balanceUsd,
    powerUps,
    currency: "USD",
    updatedAt: w.updatedAt,
  };
};

const parsePass = (raw: unknown): ArcadeAccessPass | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  const p = raw as {
    plan?: unknown;
    purchasedAt?: unknown;
    expiresAt?: unknown;
    tender?: unknown;
    apuCost?: unknown;
    apwCharged?: unknown;
  };
  if (
    (p.plan !== "day" && p.plan !== "week") ||
    typeof p.purchasedAt !== "string" ||
    typeof p.expiresAt !== "string" ||
    (p.tender !== "apu" && p.tender !== "apw") ||
    typeof p.apuCost !== "number" ||
    typeof p.apwCharged !== "number"
  ) {
    return null;
  }
  return {
    plan: p.plan,
    purchasedAt: p.purchasedAt,
    expiresAt: p.expiresAt,
    tender: p.tender,
    apuCost: p.apuCost,
    apwCharged: p.apwCharged,
  };
};

export const getArcadeAccess = async (input: {
  sid: string;
  playerId: string;
  fetcher?: typeof fetch;
}): Promise<ArcadeAccessSnapshot> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "getArcadeAccess",
      payload: { playerId: input.playerId },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    access?: unknown;
    apwPerApu?: unknown;
    quotes?: unknown;
    preferredTender?: unknown;
    wallet?: unknown;
  };
  if (!response.ok) {
    const err =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(response.status)}`;
    throw new Error(`[agent-play:arcade-access] ${err}`);
  }
  const quotes = json.quotes as { day?: unknown; week?: unknown } | undefined;
  if (
    typeof quotes !== "object" ||
    quotes === null ||
    typeof quotes.day !== "number" ||
    typeof quotes.week !== "number"
  ) {
    throw new Error("[agent-play:arcade-access] unexpected quotes shape");
  }
  const preferredTender =
    json.preferredTender === "apu" || json.preferredTender === "apw"
      ? json.preferredTender
      : "apw";
  return {
    access: parsePass(json.access),
    apwPerApu:
      typeof json.apwPerApu === "number" && Number.isFinite(json.apwPerApu)
        ? json.apwPerApu
        : 0,
    quotes: { day: quotes.day, week: quotes.week },
    preferredTender,
    wallet: parseWallet(json.wallet),
  };
};

export const purchaseArcadeAccess = async (input: {
  sid: string;
  playerId: string;
  plan: ArcadeAccessPlan;
  fetcher?: typeof fetch;
}): Promise<{
  readonly wallet: ArcadeAccessSnapshot["wallet"];
  readonly access: ArcadeAccessPass;
  readonly tender: ArcadeTender;
}> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "purchaseArcadeAccess",
      payload: { playerId: input.playerId, plan: input.plan },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    wallet?: unknown;
    access?: unknown;
    tender?: unknown;
  };
  if (!response.ok) {
    const err =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(response.status)}`;
    throw new Error(`[agent-play:arcade-access] ${err}`);
  }
  const access = parsePass(json.access);
  if (access === null) {
    throw new Error("[agent-play:arcade-access] missing access after purchase");
  }
  const tender =
    json.tender === "apu" || json.tender === "apw" ? json.tender : access.tender;
  return {
    wallet: parseWallet(json.wallet),
    access,
    tender,
  };
};
