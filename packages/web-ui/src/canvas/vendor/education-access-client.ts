/**
 * @packageDocumentation
 * @module @agent-play/play-ui/education-access-client
 *
 * Browser clients for Elm Street education center day-pass RPCs.
 *
 * @public
 */

export type EducationTender = "apu" | "apw";

export type EducationAccessPass = {
  readonly facultyId?: string;
  readonly centerId?: string;
  readonly utcDay: string;
  readonly purchasedAt: string;
  readonly expiresAt: string;
  readonly tender: EducationTender;
  readonly apuCost: number;
  readonly apwCharged: number;
};

export type EducationAccessSnapshot = {
  readonly access: EducationAccessPass | null;
  readonly apwPerApu: number;
  readonly quoteApw: number;
  readonly apuCost: number;
  readonly preferredTender: EducationTender;
  readonly wallet: {
    readonly playerId: string;
    readonly balanceUsd: number;
    readonly powerUps: number;
    readonly currency: "USD";
    readonly updatedAt: string;
  };
};

const parseWallet = (raw: unknown): EducationAccessSnapshot["wallet"] => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("[agent-play:education-access] unexpected wallet shape");
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
    throw new Error("[agent-play:education-access] unexpected wallet shape");
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

const parsePass = (raw: unknown): EducationAccessPass | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  const p = raw as {
    facultyId?: unknown;
    centerId?: unknown;
    utcDay?: unknown;
    purchasedAt?: unknown;
    expiresAt?: unknown;
    tender?: unknown;
    apuCost?: unknown;
    apwCharged?: unknown;
  };
  if (
    (typeof p.facultyId !== "string" && typeof p.centerId !== "string") ||
    typeof p.utcDay !== "string" ||
    typeof p.purchasedAt !== "string" ||
    typeof p.expiresAt !== "string" ||
    (p.tender !== "apu" && p.tender !== "apw") ||
    typeof p.apuCost !== "number" ||
    typeof p.apwCharged !== "number"
  ) {
    return null;
  }
  return {
    facultyId:
      typeof p.facultyId === "string"
        ? p.facultyId
        : typeof p.centerId === "string"
          ? p.centerId
          : undefined,
    centerId: typeof p.centerId === "string" ? p.centerId : undefined,
    utcDay: p.utcDay,
    purchasedAt: p.purchasedAt,
    expiresAt: p.expiresAt,
    tender: p.tender,
    apuCost: p.apuCost,
    apwCharged: p.apwCharged,
  };
};

export const getEducationAccess = async (input: {
  sid: string;
  playerId: string;
  centerId: string;
  fetcher?: typeof fetch;
}): Promise<EducationAccessSnapshot> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "getEducationAccess",
      payload: {
        playerId: input.playerId,
        facultyId: input.centerId,
        centerId: input.centerId,
      },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    access?: unknown;
    apwPerApu?: unknown;
    quoteApw?: unknown;
    apuCost?: unknown;
    preferredTender?: unknown;
    wallet?: unknown;
  };
  if (!response.ok) {
    const err =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(response.status)}`;
    throw new Error(`[agent-play:education-access] ${err}`);
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
    quoteApw:
      typeof json.quoteApw === "number" && Number.isFinite(json.quoteApw)
        ? json.quoteApw
        : 0,
    apuCost:
      typeof json.apuCost === "number" && Number.isFinite(json.apuCost)
        ? Math.max(0, Math.floor(json.apuCost))
        : 5,
    preferredTender,
    wallet: parseWallet(json.wallet),
  };
};

export const purchaseEducationAccess = async (input: {
  sid: string;
  playerId: string;
  centerId: string;
  fetcher?: typeof fetch;
}): Promise<{
  readonly wallet: EducationAccessSnapshot["wallet"];
  readonly access: EducationAccessPass;
  readonly tender: EducationTender;
}> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "purchaseEducationAccess",
      payload: {
        playerId: input.playerId,
        facultyId: input.centerId,
        centerId: input.centerId,
      },
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
    throw new Error(`[agent-play:education-access] ${err}`);
  }
  const access = parsePass(json.access);
  if (access === null) {
    throw new Error(
      "[agent-play:education-access] missing access after purchase"
    );
  }
  const tender =
    json.tender === "apu" || json.tender === "apw" ? json.tender : access.tender;
  return {
    wallet: parseWallet(json.wallet),
    access,
    tender,
  };
};
