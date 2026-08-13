import {
  GEOGRAPHY_MEMBER_CAP,
  GEOGRAPHY_MESH_DEGREE_MAX,
  WORLD_GEOGRAPHY_MEMBERSHIP_EVENT,
  WORLD_GEOGRAPHY_NEIGHBORS_EVENT,
  WORLD_GEOGRAPHY_SIGNAL_EVENT,
  selectAoiNeighbors,
  type AoiSelectionState,
  type GeographyMember,
  type GeographyNeighborsPayload,
  type GeographySignalBody,
  GeographyMemberSchema,
} from "@agent-play/geography-mesh";

export {
  GEOGRAPHY_MEMBER_CAP,
  GEOGRAPHY_MESH_DEGREE_MAX,
  WORLD_GEOGRAPHY_MEMBERSHIP_EVENT,
  WORLD_GEOGRAPHY_NEIGHBORS_EVENT,
  WORLD_GEOGRAPHY_SIGNAL_EVENT,
};

export const GEOGRAPHY_MEMBERSHIP_REDIS_TTL_SECONDS = 300;

export type GeographyMembershipJoinResult =
  | {
      ok: true;
      memberCount: number;
      joined: boolean;
      prev: Map<string, GeographyMember>;
      next: Map<string, GeographyMember>;
    }
  | {
      ok: false;
      error: "cap_reached";
      memberCount: number;
      cap: number;
    };

export function parseGeographyMember(
  raw: Record<string, unknown>
): GeographyMember {
  return GeographyMemberSchema.parse(raw);
}

export function computeNeighborsForMember(options: {
  selfId: string;
  members: ReadonlyMap<string, GeographyMember>;
  previous?: AoiSelectionState;
  nowMs?: number;
}): GeographyNeighborsPayload & { selection: AoiSelectionState } {
  const nowMs = options.nowMs ?? Date.now();
  const self = options.members.get(options.selfId);
  const memberList = [...options.members.values()].map((m) => ({
    humanId: m.humanId,
    x: m.x,
    y: m.y,
    ...(m.stage !== undefined ? { stage: m.stage } : {}),
  }));
  const selection = selectAoiNeighbors({
    selfId: options.selfId,
    selfPos: { x: self?.x ?? 0, y: self?.y ?? 0 },
    ...(self?.stage !== undefined ? { selfStage: self.stage } : {}),
    members: memberList,
    degreeMax: GEOGRAPHY_MESH_DEGREE_MAX,
    nowMs,
    ...(options.previous !== undefined ? { previous: options.previous } : {}),
  });
  return {
    humanId: options.selfId,
    neighborIds: selection.neighborIds,
    truncated: selection.truncated,
    memberCount: options.members.size,
    selection,
  };
}

export function computeAllNeighborPayloads(options: {
  members: ReadonlyMap<string, GeographyMember>;
  previousByHumanId?: ReadonlyMap<string, AoiSelectionState>;
  nowMs?: number;
}): GeographyNeighborsPayload[] {
  const payloads: GeographyNeighborsPayload[] = [];
  for (const humanId of options.members.keys()) {
    const computed = computeNeighborsForMember({
      selfId: humanId,
      members: options.members,
      previous: options.previousByHumanId?.get(humanId),
      nowMs: options.nowMs,
    });
    payloads.push({
      humanId: computed.humanId,
      neighborIds: computed.neighborIds,
      truncated: computed.truncated,
      memberCount: computed.memberCount,
    });
  }
  return payloads;
}

export async function publishGeographyMembershipFanout(options: {
  store: {
    getSnapshotRev: () => Promise<number>;
    publishWorldFanout: (
      rev: number,
      event: string,
      data: unknown
    ) => Promise<void>;
  };
  data: Record<string, unknown>;
}): Promise<void> {
  const rev = await options.store.getSnapshotRev();
  await options.store.publishWorldFanout(
    rev,
    WORLD_GEOGRAPHY_MEMBERSHIP_EVENT,
    options.data
  );
}

export async function publishGeographyNeighborsFanout(options: {
  store: {
    getSnapshotRev: () => Promise<number>;
    publishWorldFanout: (
      rev: number,
      event: string,
      data: unknown
    ) => Promise<void>;
  };
  payloads: GeographyNeighborsPayload[];
}): Promise<void> {
  if (options.payloads.length === 0) {
    return;
  }
  const rev = await options.store.getSnapshotRev();
  await options.store.publishWorldFanout(
    rev,
    WORLD_GEOGRAPHY_NEIGHBORS_EVENT,
    { neighbors: options.payloads }
  );
}

export async function publishGeographySignalFanout(options: {
  store: {
    getSnapshotRev: () => Promise<number>;
    publishWorldFanout: (
      rev: number,
      event: string,
      data: unknown
    ) => Promise<void>;
  };
  signal: GeographySignalBody;
}): Promise<void> {
  const rev = await options.store.getSnapshotRev();
  await options.store.publishWorldFanout(
    rev,
    WORLD_GEOGRAPHY_SIGNAL_EVENT,
    options.signal
  );
}
