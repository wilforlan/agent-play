/**
 * Browser clients for Elm Street annual school-fee RPCs.
 */

export type EducationTender = "apu" | "apw";

export type EducationTuitionEnrollment = {
  readonly facultyId: string;
  readonly pathId: string;
  readonly tier: "foundation" | "intermediate" | "advanced";
  readonly purchasedAt: string;
  readonly expiresAt: string;
  readonly tender: EducationTender;
  readonly apuCost: number;
  readonly apwCharged: number;
};

export type EducationTuitionSnapshot = {
  readonly enrollment: EducationTuitionEnrollment | null;
  readonly apwPerApu: number;
  readonly quoteApw: number;
  readonly apuCost: number;
  readonly preferredTender: EducationTender;
  readonly path: {
    readonly title: string;
    readonly tier: "foundation" | "intermediate" | "advanced";
    readonly summary: string;
  };
  readonly wallet: {
    readonly playerId: string;
    readonly balanceUsd: number;
    readonly powerUps: number;
    readonly currency: "USD";
    readonly updatedAt: string;
  };
};

const parseWallet = (raw: unknown): EducationTuitionSnapshot["wallet"] => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("[agent-play:education-tuition] unexpected wallet shape");
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
    throw new Error("[agent-play:education-tuition] unexpected wallet shape");
  }
  return {
    playerId: w.playerId,
    balanceUsd: w.balanceUsd,
    powerUps:
      typeof w.powerUps === "number" && Number.isFinite(w.powerUps)
        ? Math.max(0, Math.floor(w.powerUps))
        : 0,
    currency: "USD",
    updatedAt: w.updatedAt,
  };
};

const parseEnrollment = (raw: unknown): EducationTuitionEnrollment | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  if (
    typeof e.facultyId !== "string" ||
    typeof e.pathId !== "string" ||
    (e.tier !== "foundation" &&
      e.tier !== "intermediate" &&
      e.tier !== "advanced") ||
    typeof e.purchasedAt !== "string" ||
    typeof e.expiresAt !== "string" ||
    (e.tender !== "apu" && e.tender !== "apw") ||
    typeof e.apuCost !== "number" ||
    typeof e.apwCharged !== "number"
  ) {
    return null;
  }
  return {
    facultyId: e.facultyId,
    pathId: e.pathId,
    tier: e.tier,
    purchasedAt: e.purchasedAt,
    expiresAt: e.expiresAt,
    tender: e.tender,
    apuCost: e.apuCost,
    apwCharged: e.apwCharged,
  };
};

export const getEducationTuition = async (input: {
  sid: string;
  playerId: string;
  facultyId: string;
  pathId: string;
  fetcher?: typeof fetch;
}): Promise<EducationTuitionSnapshot> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "getEducationTuition",
      payload: {
        playerId: input.playerId,
        facultyId: input.facultyId,
        pathId: input.pathId,
      },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const err =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(response.status)}`;
    throw new Error(`[agent-play:education-tuition] ${err}`);
  }
  const path = json.path as
    | { title?: unknown; tier?: unknown; summary?: unknown }
    | undefined;
  if (
    typeof path !== "object" ||
    path === null ||
    typeof path.title !== "string" ||
    typeof path.summary !== "string" ||
    (path.tier !== "foundation" &&
      path.tier !== "intermediate" &&
      path.tier !== "advanced")
  ) {
    throw new Error("[agent-play:education-tuition] unexpected path shape");
  }
  return {
    enrollment: parseEnrollment(json.enrollment),
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
        : 0,
    preferredTender:
      json.preferredTender === "apu" || json.preferredTender === "apw"
        ? json.preferredTender
        : "apw",
    path: {
      title: path.title,
      tier: path.tier,
      summary: path.summary,
    },
    wallet: parseWallet(json.wallet),
  };
};

export const purchaseEducationTuition = async (input: {
  sid: string;
  playerId: string;
  facultyId: string;
  pathId: string;
  fetcher?: typeof fetch;
}): Promise<{
  readonly wallet: EducationTuitionSnapshot["wallet"];
  readonly enrollment: EducationTuitionEnrollment;
  readonly tender: EducationTender;
}> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "purchaseEducationTuition",
      payload: {
        playerId: input.playerId,
        facultyId: input.facultyId,
        pathId: input.pathId,
      },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const err =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(response.status)}`;
    throw new Error(`[agent-play:education-tuition] ${err}`);
  }
  const enrollment = parseEnrollment(json.enrollment);
  if (enrollment === null) {
    throw new Error(
      "[agent-play:education-tuition] missing enrollment after purchase"
    );
  }
  return {
    wallet: parseWallet(json.wallet),
    enrollment,
    tender:
      json.tender === "apu" || json.tender === "apw"
        ? json.tender
        : enrollment.tender,
  };
};

export const listEducationTuition = async (input: {
  sid: string;
  playerId: string;
  facultyId?: string;
  fetcher?: typeof fetch;
}): Promise<readonly EducationTuitionEnrollment[]> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "listEducationTuition",
      payload: {
        playerId: input.playerId,
        facultyId: input.facultyId,
      },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    enrollments?: unknown;
  };
  if (!response.ok) {
    const err =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(response.status)}`;
    throw new Error(`[agent-play:education-tuition] ${err}`);
  }
  if (!Array.isArray(json.enrollments)) {
    return [];
  }
  return json.enrollments
    .map((row) => parseEnrollment(row))
    .filter((row): row is EducationTuitionEnrollment => row !== null);
};
