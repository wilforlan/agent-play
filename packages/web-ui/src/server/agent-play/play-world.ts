import { randomUUID } from "node:crypto";
import type { PlayAgentInformation, PlatformAgentInformation } from "./@types/agent.js";
import type { Journey, PositionedStep, WorldJourneyUpdate } from "./@types/world.js";
import {
  configureAgentPlayDebug,
  agentPlayDebug,
  agentPlayVerbose,
} from "./agent-play-debug.js";
import {
  HttpPlayTransport,
  InMemoryPlayBus,
  PLAYER_ADDED_EVENT,
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  WORLD_FANOUT_PLAYER_ID,
} from "./play-transport.js";
import type {
  WorldAgentSignalPayload,
  WorldInteractionPayload,
  WorldInteractionRole,
} from "./play-transport.js";
import type { AgentRepository } from "./agent-repository.js";
import type { SessionStore } from "./session-store.js";
import {
  assertAgentToolContract,
  extractAssistToolNames,
} from "./agent-tool-contract.js";
import type { PreviewSnapshotJson } from "./preview-serialize.js";
import {
  serializeWorldJourneyUpdate,
  buildSnapshotWorldMap,
  type PreviewWorldMapAgentOccupantJson,
  type PreviewWorldMapMcpOccupantJson,
  type PreviewWorldMapHumanOccupantJson,
  type PreviewWorldMapOccupantJson,
  type WorldJourneyUpdateJson,
} from "./preview-serialize.js";
import type { RedisFanoutItem } from "./world-redis-sync.js";
import { runStoredWorldMutation } from "./world-mutation-pipeline.js";
import { clampWorldPosition, type WorldBounds } from "@agent-play/sdk";
import type { StoredAgentRecord } from "./agent-repository.js";
import { computeFreeMapCell, occupiedKeysFromSnapshot } from "./grid-allocate.js";
import { buildPlayerChainFanoutNotify } from "./player-chain/index.js";
import {
  emptySnapshot,
  ensureWorldSnapshot,
  upsertAgentOccupant,
  removeOccupantsForPlayer,
} from "./world-snapshot-helpers.js";

function clampPathToBounds(
  path: PositionedStep[],
  bounds: WorldBounds
): PositionedStep[] {
  return path.map((step) => {
    if (typeof step.x === "number" && typeof step.y === "number") {
      const c = clampWorldPosition({ x: step.x, y: step.y }, bounds);
      return { ...step, x: c.x, y: c.y };
    }
    return step;
  });
}

function journeyPathFromCellAndJourney(
  playerId: string,
  journey: Journey,
  cell: { x: number; y: number },
  bounds: WorldBounds
): PositionedStep[] {
  const placement = { x: cell.x, y: cell.y, id: `agent:${playerId}` };
  const pathRaw = journey.steps.map((step): PositionedStep => {
    if (step.type === "origin" || step.type === "structure") {
      return {
        ...step,
        x: placement.x,
        y: placement.y,
        structureId: placement.id,
      };
    }
    return {
      ...step,
      x: placement.x,
      y: placement.y,
      structureId: placement.id,
    };
  });
  return clampPathToBounds(pathRaw, bounds);
}

function snapshotWithOccupants(
  base: PreviewSnapshotJson,
  occupants: PreviewWorldMapOccupantJson[]
): PreviewSnapshotJson {
  return {
    ...base,
    worldMap: buildSnapshotWorldMap(occupants),
  };
}

function patchAgentLastUpdate(
  base: PreviewSnapshotJson,
  playerId: string,
  lastUpdate: WorldJourneyUpdateJson
): PreviewSnapshotJson {
  const occ = base.worldMap.occupants.map((o) => {
    if (o.kind === "agent" && o.agentId === playerId) {
      return {
        ...o,
        lastUpdate,
        stationary: false,
      };
    }
    return o;
  });
  return snapshotWithOccupants(base, occ);
}

export type AssistToolSpec = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type LangChainAgentRegistration = {
  type: "langchain";
  toolNames: string[];
  assistTools?: AssistToolSpec[];
};

export type P2aEnableFlag = "on" | "off";

export type AddPlayerInput = PlatformAgentInformation & {
  agent: LangChainAgentRegistration;
  mainNodeId?: string;
  password?: string;
  agentId: string;
  connectionId?: string;
  leaseTtlSeconds?: number;
  enableP2a?: P2aEnableFlag;
  realtimeWebrtc?: {
    clientSecret: string;
    expiresAt?: string;
    model: string;
    voice?: string;
  };
};

export type RegisteredAgentSummary = {
  agentId: string;
  name: string;
  toolNames: string[];
  zoneCount: number;
  yieldCount: number;
  flagged: boolean;
};

export type RegisteredPlayer = PlayAgentInformation & {
  previewUrl: string;
  registeredAgent: RegisteredAgentSummary;
  enableP2a: P2aEnableFlag;
  realtimeWebrtc?: {
    clientSecret: string;
    expiresAt?: string;
    model: string;
    voice?: string;
  };
};

function toRegisteredSummary(row: StoredAgentRecord): RegisteredAgentSummary {
  return {
    agentId: row.agentId,
    name: row.name,
    toolNames: [...row.toolNames],
    zoneCount: row.zoneCount,
    yieldCount: row.yieldCount,
    flagged: row.flagged,
  };
}

export type PlayWorldOptions = {
  previewBaseUrl?: string;
  playApiBase?: string;
  debug?: boolean;
  repository?: AgentRepository;
  sessionStore: SessionStore;
};

export const HUMAN_VIEWER_PLAYER_ID = "__human__";

type OccupantRefIndexValue =
  | PreviewWorldMapHumanOccupantJson
  | PreviewWorldMapAgentOccupantJson
  | PreviewWorldMapMcpOccupantJson;

function buildOccupantRefIndex(
  snap: PreviewSnapshotJson
): Map<string, OccupantRefIndexValue> {
  const byRef = new Map<string, OccupantRefIndexValue>();
  for (const occ of snap.worldMap.occupants) {
    if (occ.kind === "human") {
      byRef.set(`human:${occ.id}`, occ);
    } else if (occ.kind === "agent") {
      byRef.set(`agent:${occ.agentId}`, occ);
    } else {
      byRef.set(`mcp:${occ.id}`, occ);
    }
  }
  return byRef;
}

function resolveProximityFromPlayerRef(
  fromRaw: string,
  options: {
    byRef: Map<string, OccupantRefIndexValue>;
    snapshotMainNodeId: string | null;
    chainGenesisHumanId: string;
  }
): string {
  if (fromRaw.startsWith("human:") || fromRaw.startsWith("agent:")) {
    return fromRaw;
  }
  const { byRef, snapshotMainNodeId, chainGenesisHumanId } = options;
  if (fromRaw === HUMAN_VIEWER_PLAYER_ID) {
    return `human:${HUMAN_VIEWER_PLAYER_ID}`;
  }
  if (byRef.has(`human:${fromRaw}`)) {
    return `human:${fromRaw}`;
  }
  if (snapshotMainNodeId !== null && fromRaw === snapshotMainNodeId) {
    return `human:${fromRaw}`;
  }
  if (fromRaw === chainGenesisHumanId) {
    return `human:${fromRaw}`;
  }
  return `agent:${fromRaw}`;
}

export const MAX_WORLD_OCCUPANTS = 100;
const PRESENCE_LEASE_TTL_SECONDS_DEFAULT = 45;
const PRESENCE_SWEEP_INTERVAL_MS = 5_000;

export type RecordInteractionInput = {
  playerId: string;
  role: WorldInteractionRole;
  text: string;
};

export type ProximityActionKind = "assist" | "chat" | "zone" | "yield";

export type RecordProximityActionInput = {
  fromPlayerId: string;
  toPlayerId: string;
  action: ProximityActionKind;
};

const PROXIMITY_ACTION_LABEL: Record<ProximityActionKind, string> = {
  assist: "Assist",
  chat: "Chat",
  zone: "Zone",
  yield: "Yield",
};

export class PlayWorld {
  private readonly bus = new InMemoryPlayBus();
  private httpTransport: HttpPlayTransport | null = null;
  private readonly repository: AgentRepository | null;
  private readonly sessionStore: SessionStore;
  private mainNodeId: string | null = null;
  private presenceSweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: PlayWorldOptions) {
    this.repository = options.repository ?? null;
    this.sessionStore = options.sessionStore;
  }

  async start(): Promise<void> {
    configureAgentPlayDebug(
      this.options.debug !== undefined
        ? { debug: this.options.debug }
        : {}
    );
    const sid = await this.sessionStore.loadOrCreateSessionId();
    this.mainNodeId = this.sessionStore.playerChainGenesis;
    agentPlayDebug("play-world", "start", { sessionId: sid });
    if (this.options.playApiBase !== undefined) {
      this.httpTransport = new HttpPlayTransport({
        baseUrl: this.options.playApiBase,
        sessionId: this.sessionStore.getSessionId(),
      });
    }
    const existingSnapshot = await this.sessionStore.getSnapshotJson();
    if (existingSnapshot === null) {
      const initialSnapshot = emptySnapshot(this.sessionStore.playerChainGenesis);
      await this.sessionStore.persistSnapshot(initialSnapshot);
    }
    if (this.presenceSweepTimer === null) {
      this.presenceSweepTimer = setInterval(() => {
        void this.sweepStaleAgentOccupants();
      }, PRESENCE_SWEEP_INTERVAL_MS);
      this.presenceSweepTimer.unref?.();
    }
  }

  async isSessionSid(sid: string): Promise<boolean> {
    const trimmed = sid.trim();
    if (trimmed.length === 0) {
      return false;
    }
    try {
      if (trimmed === this.sessionStore.getSessionId()) {
        return true;
      }
    } catch {
      return false;
    }
    if (this.repository === null) {
      return false;
    }
    const node = await this.repository.getNode(trimmed);
    return node !== null && node.kind === "agent";
  }

  private metadataFanout(): RedisFanoutItem[] {
    return [
      {
        event: WORLD_AGENT_SIGNAL_EVENT,
        data: {
          playerId: WORLD_FANOUT_PLAYER_ID,
          kind: "metadata" as const,
          data: {},
        },
      },
    ];
  }

  async resetSession(): Promise<string> {
    this.sessionStore.getSessionId();
    const newSid = randomUUID();
    const prev = await this.sessionStore.getSnapshotJson();
    await this.sessionStore.replaceSessionWithNewSid(newSid);
    if (this.options.playApiBase !== undefined) {
      this.httpTransport = new HttpPlayTransport({
        baseUrl: this.options.playApiBase,
        sessionId: this.sessionStore.getSessionId(),
      });
    }
    const snap = emptySnapshot(this.sessionStore.playerChainGenesis);
    const { rev, merkleRootHex, merkleLeafCount } =
      await this.sessionStore.persistSnapshotReturningRev(snap);
    const playerChainNotify = buildPlayerChainFanoutNotify({
      prev,
      next: snap,
      playerChainGenesisUtf8: this.sessionStore.playerChainGenesis,
    });
    await this.sessionStore.publishWorldFanout(
      rev,
      WORLD_AGENT_SIGNAL_EVENT,
      {
        playerId: WORLD_FANOUT_PLAYER_ID,
        kind: "metadata",
        data: {},
      },
      {
        merkleRootHex,
        merkleLeafCount,
        ...(playerChainNotify !== undefined ? { playerChainNotify } : {}),
      }
    );
    agentPlayDebug("play-world", "resetSession", { sessionId: newSid });
    agentPlayVerbose("play-world", "resetSession complete", {
      newSidPrefix: `${newSid.slice(0, 8)}…`,
    });
    return newSid;
  }

  getPreviewUrl(): string {
    const base =
      this.options.previewBaseUrl ??
      process.env.PLAY_PREVIEW_BASE_URL ??
      "https://agent-play.vercel.app";
    const u = new URL(base.includes("://") ? base : `https://${base}`);
    u.search = "";
    return u.toString();
  }

  async getSnapshotJson(): Promise<PreviewSnapshotJson> {
    const mainNodeId = this.mainNodeId ?? this.sessionStore.playerChainGenesis;
    const raw = await this.sessionStore.getSnapshotJson();
    if (raw === null) {
      return emptySnapshot(mainNodeId);
    }
    return raw;
  }

  /**
   * Maps a raw proximity actor id to a stable ref: `human:…` or `agent:…`.
   * Used by the proximity-action API before {@link recordProximityAction}.
   */
  async normalizeProximityFromPlayerId(fromPlayerId: string): Promise<string> {
    const trimmed = fromPlayerId.trim();
    const snap = await this.getSnapshotJson();
    const byRef = buildOccupantRefIndex(snap);
    const snapshotMainNodeId =
      typeof snap.mainNodeId === "string" && snap.mainNodeId.trim().length > 0
        ? snap.mainNodeId.trim()
        : null;
    const chainGenesisHumanId =
      this.mainNodeId ?? this.sessionStore.playerChainGenesis;
    return resolveProximityFromPlayerRef(trimmed, {
      byRef,
      snapshotMainNodeId,
      chainGenesisHumanId,
    });
  }

  async recordProximityAction(
    input: RecordProximityActionInput
  ): Promise<void> {
    const snap = await this.getSnapshotJson();
    const byRef = buildOccupantRefIndex(snap);
    const snapshotMainNodeId =
      typeof snap.mainNodeId === "string" && snap.mainNodeId.trim().length > 0
        ? snap.mainNodeId.trim()
        : null;
    const chainGenesisHumanId =
      this.mainNodeId ?? this.sessionStore.playerChainGenesis;
    const fromRaw = input.fromPlayerId;
    const fromRef = resolveProximityFromPlayerRef(fromRaw, {
      byRef,
      snapshotMainNodeId,
      chainGenesisHumanId,
    });
    const toRef = input.toPlayerId.includes(":")
      ? input.toPlayerId
      : `agent:${input.toPlayerId}`;
    const syntheticViewerHuman = (
      id: string
    ): PreviewWorldMapHumanOccupantJson => ({
      kind: "human",
      id,
      name: "Viewer",
      x: 0,
      y: 0,
      interactive: false,
    });
    const fromOcc =
      byRef.get(fromRef) ??
      (fromRef === `human:${HUMAN_VIEWER_PLAYER_ID}`
        ? syntheticViewerHuman(HUMAN_VIEWER_PLAYER_ID)
        : fromRef.startsWith("human:")
          ? (() => {
              const hid = fromRef.slice("human:".length);
              if (
                hid.length > 0 &&
                (snapshotMainNodeId === hid || hid === chainGenesisHumanId)
              ) {
                return syntheticViewerHuman(hid);
              }
              return undefined;
            })()
          : undefined);
    const toOcc =
      byRef.get(toRef) ??
      (toRef === `human:${HUMAN_VIEWER_PLAYER_ID}`
        ? {
            kind: "human" as const,
            id: HUMAN_VIEWER_PLAYER_ID,
            name: "Viewer",
            x: 0,
            y: 0,
            interactive: false,
          }
        : undefined);
    if (fromOcc === undefined) {
      throw new Error(
        `recordProximityAction: unknown fromPlayerId "${input.fromPlayerId}"`
      );
    }
    if (toOcc === undefined) {
      throw new Error(
        `recordProximityAction: unknown toPlayerId "${input.toPlayerId}"`
      );
    }
    if (fromOcc.kind === "human" && toOcc.kind === "human") {
      throw new Error("recordProximityAction: human to human is not allowed");
    }
    if (toOcc.kind === "mcp" && (input.action === "zone" || input.action === "yield")) {
      throw new Error("recordProximityAction: zone/yield require an agent target");
    }
    const label = PROXIMITY_ACTION_LABEL[input.action];
    if (fromOcc.kind === "agent") {
      await this.recordInteraction({
        playerId: fromOcc.agentId,
        role: "user",
        text: `[proximity ${label}] toward ${toOcc.name}`,
      });
    }
    const sourceLabel =
      fromOcc.kind === "human" ? "viewer" : fromOcc.name;
    if (toOcc.kind === "agent") {
      await this.recordInteraction({
        playerId: toOcc.agentId,
        role: "tool",
        text:
          fromOcc.kind === "human"
            ? `Proximity viewer: ${label}`
            : `Proximity: ${sourceLabel} — ${label}`,
      });
    } else if (toOcc.kind === "mcp") {
      const payload: WorldInteractionPayload = {
        playerId: `mcp:${toOcc.id}`,
        role: "tool",
        text:
          fromOcc.kind === "human"
            ? `MCP proximity viewer: ${label}`
            : `MCP proximity: ${sourceLabel} — ${label}`,
        at: new Date().toISOString(),
        seq: 0,
      };
      this.bus.emit(WORLD_INTERACTION_EVENT, payload);
      void this.forwardHttp(WORLD_INTERACTION_EVENT, payload);
      const rev = await this.sessionStore.getSnapshotRev();
      await this.sessionStore.publishWorldFanout(
        rev,
        WORLD_INTERACTION_EVENT,
        payload
      );
    }
    if (
      toOcc.kind === "agent" &&
      (input.action === "assist" || input.action === "chat")
    ) {
      const sig: WorldAgentSignalPayload = {
        playerId: toOcc.agentId,
        kind: input.action,
        data: { fromPlayerId: fromRef },
      };
      this.emitAgentSignal(toOcc.agentId, {
        kind: input.action,
        data: { fromPlayerId: fromRef },
      });
      const rev = await this.sessionStore.getSnapshotRev();
      await this.sessionStore.publishWorldFanout(rev, WORLD_AGENT_SIGNAL_EVENT, sig);
    }
    if (toOcc.kind === "agent" && input.action === "zone") {
      await this.applyZoneIncrement(toOcc.agentId);
    }
    if (toOcc.kind === "agent" && input.action === "yield") {
      await this.applyYieldIncrement(toOcc.agentId);
    }
  }

  private emitAgentSignal(
    playerId: string,
    payload: Omit<WorldAgentSignalPayload, "playerId">
  ): void {
    const full: WorldAgentSignalPayload = { playerId, ...payload };
    this.bus.emit(WORLD_AGENT_SIGNAL_EVENT, full);
    void this.forwardHttp(WORLD_AGENT_SIGNAL_EVENT, full);
  }

  private async applyZoneIncrement(agentId: string): Promise<void> {
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const occ = base.worldMap.occupants.find(
          (o): o is PreviewWorldMapAgentOccupantJson =>
            o.kind === "agent" && o.agentId === agentId
        );
        if (occ === undefined) {
          throw new Error("applyZoneIncrement: unknown agent");
        }
        if (this.repository === null) {
          const zoneCount = (occ.zoneCount ?? 0) + 1;
          const flagged = zoneCount >= 100;
          const atZ = new Date().toISOString();
          const row: PreviewWorldMapAgentOccupantJson = {
            ...occ,
            zoneCount,
            flagged,
            onZone: { zoneCount, flagged, at: atZ },
          };
          const nextOccupants = upsertAgentOccupant(base.worldMap.occupants, row);
          const next = snapshotWithOccupants(base, nextOccupants);
          this.emitAgentSignal(agentId, { kind: "zone", data: { zoneCount, flagged } });
          return {
            next,
            fanout: [
              {
                event: WORLD_AGENT_SIGNAL_EVENT,
                data: {
                  playerId: agentId,
                  kind: "zone" as const,
                  data: { zoneCount, flagged },
                },
              },
            ],
          };
        }
        const nextStored = await this.repository.incrementZoneCount(agentId);
        if (nextStored === null) {
          return { next: base, fanout: this.metadataFanout() };
        }
        const row: PreviewWorldMapAgentOccupantJson = {
          ...occ,
          zoneCount: nextStored.zoneCount,
          yieldCount: nextStored.yieldCount,
          flagged: nextStored.flagged,
          onZone: {
            zoneCount: nextStored.zoneCount,
            flagged: nextStored.flagged,
            at: new Date().toISOString(),
          },
        };
        const nextOccupants = upsertAgentOccupant(base.worldMap.occupants, row);
        const next = snapshotWithOccupants(base, nextOccupants);
        this.emitAgentSignal(agentId, {
          kind: "zone",
          data: {
            zoneCount: nextStored.zoneCount,
            flagged: nextStored.flagged,
          },
        });
        return {
          next,
          fanout: [
            {
              event: WORLD_AGENT_SIGNAL_EVENT,
              data: {
                playerId: agentId,
                kind: "zone" as const,
                data: {
                  zoneCount: nextStored.zoneCount,
                  flagged: nextStored.flagged,
                },
              },
            },
          ],
        };
      },
    });
  }

  private async applyYieldIncrement(agentId: string): Promise<void> {
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const occ = base.worldMap.occupants.find(
          (o): o is PreviewWorldMapAgentOccupantJson =>
            o.kind === "agent" && o.agentId === agentId
        );
        if (occ === undefined) {
          throw new Error("applyYieldIncrement: unknown agent");
        }
        if (this.repository === null) {
          const yieldCount = (occ.yieldCount ?? 0) + 1;
          const flagged = occ.flagged ?? false;
          const atY = new Date().toISOString();
          const row: PreviewWorldMapAgentOccupantJson = {
            ...occ,
            yieldCount,
            onYield: { yieldCount, at: atY },
          };
          const nextOccupants = upsertAgentOccupant(base.worldMap.occupants, row);
          const next = snapshotWithOccupants(base, nextOccupants);
          this.emitAgentSignal(agentId, { kind: "yield", data: { yieldCount } });
          return {
            next,
            fanout: [
              {
                event: WORLD_AGENT_SIGNAL_EVENT,
                data: {
                  playerId: agentId,
                  kind: "yield" as const,
                  data: { yieldCount },
                },
              },
            ],
          };
        }
        const nextStored = await this.repository.incrementYieldCount(agentId);
        if (nextStored === null) {
          return { next: base, fanout: this.metadataFanout() };
        }
        const row: PreviewWorldMapAgentOccupantJson = {
          ...occ,
          zoneCount: nextStored.zoneCount,
          yieldCount: nextStored.yieldCount,
          flagged: nextStored.flagged,
          onYield: {
            yieldCount: nextStored.yieldCount,
            at: new Date().toISOString(),
          },
        };
        const nextOccupants = upsertAgentOccupant(base.worldMap.occupants, row);
        const next = snapshotWithOccupants(base, nextOccupants);
        this.emitAgentSignal(agentId, {
          kind: "yield",
          data: { yieldCount: nextStored.yieldCount },
        });
        return {
          next,
          fanout: [
            {
              event: WORLD_AGENT_SIGNAL_EVENT,
              data: {
                playerId: agentId,
                kind: "yield" as const,
                data: { yieldCount: nextStored.yieldCount },
              },
            },
          ],
        };
      },
    });
  }

  async recordInteraction(
    input: RecordInteractionInput
  ): Promise<WorldInteractionPayload | null> {
    const snap = await this.getSnapshotJson();
    if (
      !snap.worldMap.occupants.some(
        (o) => o.kind === "agent" && o.agentId === input.playerId
      )
    ) {
      throw new Error(
        `recordInteraction: unknown playerId "${input.playerId}"`
      );
    }
    const trimmed = input.text.trim();
    if (trimmed.length === 0) return null;
    const at = new Date().toISOString();
    const payload: WorldInteractionPayload = {
      playerId: input.playerId,
      role: input.role,
      text: trimmed.slice(0, 4000),
      at,
      seq: 0,
    };
    this.bus.emit(WORLD_INTERACTION_EVENT, payload);
    void this.forwardHttp(WORLD_INTERACTION_EVENT, payload);
    agentPlayDebug("play-world", "recordInteraction", {
      playerId: input.playerId,
      role: input.role,
    });
    const rev = await this.sessionStore.getSnapshotRev();
    await this.sessionStore.publishWorldFanout(
      rev,
      WORLD_INTERACTION_EVENT,
      payload
    );
    return payload;
  }

  async recordAssistToolInvocation(input: {
    targetPlayerId: string;
    toolName: string;
    args: Record<string, unknown>;
  }): Promise<void> {
    const { targetPlayerId, toolName, args } = input;
    const snap = await this.getSnapshotJson();
    const occ = snap.worldMap.occupants.find(
      (o): o is PreviewWorldMapAgentOccupantJson =>
        o.kind === "agent" && o.agentId === targetPlayerId
    );
    if (occ === undefined) {
      throw new Error(
        `recordAssistToolInvocation: unknown playerId "${targetPlayerId}"`
      );
    }
    const allowed = occ.assistTools ?? [];
    if (!allowed.some((t) => t.name === toolName)) {
      throw new Error(
        `recordAssistToolInvocation: "${toolName}" is not a registered assist_* tool for this player`
      );
    }
    const argStr = JSON.stringify(args);
    await this.recordInteraction({
      playerId: targetPlayerId,
      role: "user",
      text: `[assist] ${toolName}(${argStr})`,
    });
    await this.recordInteraction({
      playerId: targetPlayerId,
      role: "assistant",
      text: `Assist ${toolName}: received. Your agent process can execute the tool and stream results via the SDK.`,
    });
  }

  async addPlayer(input: AddPlayerInput): Promise<RegisteredPlayer> {
    this.sessionStore.getSessionId();
    assertAgentToolContract(input.agent.toolNames);
    const trimmedId = input.agentId.trim();
    if (trimmedId.length === 0) {
      throw new Error(
        'addPlayer: agentId is required (use an id from `agent-play create` when using a repository)'
      );
    }

    let registered: RegisteredPlayer | undefined;

    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        let stored: StoredAgentRecord | null = null;
        let playerId = trimmedId;

        if (this.repository !== null) {
          if (input.password === undefined || input.password.length === 0) {
            throw new Error(
              "addPlayer: password is required when repository is configured"
            );
          }
          const resolvedMainNodeId =
            input.mainNodeId !== undefined && input.mainNodeId.length > 0
              ? input.mainNodeId
              : await this.repository.findAccountIdForAgentNode(trimmedId);
          if (resolvedMainNodeId === null) {
            throw new Error(
              "addPlayer: unable to resolve main node for agentId"
            );
          }
          const row = await this.repository.getAgent(trimmedId);
          if (row === null) {
            const mainNode = await this.repository.getNode(resolvedMainNodeId);
            const attachedAgentIds = mainNode?.agentNodeIds ?? [];
            if (!attachedAgentIds.includes(trimmedId)) {
              throw new Error(
                "addPlayer: unknown agentId; create an agent node with `agent-play create-agent-node`"
              );
            }
            stored = null;
            playerId = trimmedId;
          } else {
            if (row.nodeId !== resolvedMainNodeId) {
              throw new Error("addPlayer: agent does not belong to mainNodeId");
            }
            stored = row;
            playerId = row.agentId;
          }
          const validPassword = await this.repository.verifyNodePassw(
            resolvedMainNodeId,
            input.password
          );
          if (!validPassword) {
            throw new Error("addPlayer: invalid password");
          }
        } else if (
          base.worldMap.occupants.some(
            (o) => o.kind === "agent" && o.agentId === playerId
          )
        ) {
          throw new Error(
            `addPlayer: agentId already present in session "${playerId}"`
          );
        }

        if (base.worldMap.occupants.length >= MAX_WORLD_OCCUPANTS) {
          throw new Error(
            `addPlayer: world occupant limit reached (${MAX_WORLD_OCCUPANTS})`
          );
        }

        const laneIndex = base.worldMap.occupants.filter(
          (o) => o.kind === "agent"
        ).length;
        const pos = computeFreeMapCell(
          occupiedKeysFromSnapshot(base),
          laneIndex
        );
        const registeredSummary: RegisteredAgentSummary =
          stored !== null
            ? toRegisteredSummary(stored)
            : {
                agentId: playerId,
                name: input.name,
                toolNames: [...input.agent.toolNames],
                zoneCount: 0,
                yieldCount: 0,
                flagged: false,
              };
        const effectiveToolNames =
          input.agent.toolNames.length > 0
            ? input.agent.toolNames
            : stored?.toolNames ?? [];
        const summaryName =
          input.name.trim().length > 0 ? input.name : (stored?.name ?? input.name);
        const summaryForWorld: RegisteredAgentSummary = {
          ...registeredSummary,
          name: summaryName,
          toolNames: [...effectiveToolNames],
        };

        const assistList =
          input.agent.assistTools !== undefined
            ? input.agent.assistTools.map((t) => ({ ...t }))
            : [];

        const row: PreviewWorldMapAgentOccupantJson = {
          kind: "agent",
          nodeId: stored?.nodeId ?? input.mainNodeId,
          agentId: playerId,
          name: summaryName,
          x: pos.x,
          y: pos.y,
          platform: input.type,
          toolNames: [...effectiveToolNames],
          stationary: true,
          assistToolNames: extractAssistToolNames(effectiveToolNames),
          hasChatTool: effectiveToolNames.includes("chat_tool"),
          enableP2a: input.enableP2a ?? "off",
          ...(input.realtimeWebrtc !== undefined
            ? { realtimeWebrtc: input.realtimeWebrtc }
            : {}),
        };
        if (assistList.length > 0) {
          row.assistTools = assistList;
        }
        if (stored !== null) {
          row.zoneCount = stored.zoneCount;
          row.yieldCount = stored.yieldCount;
          row.flagged = stored.flagged;
        }

        const nextOccupants = upsertAgentOccupant(
          base.worldMap.occupants,
          row
        );
        const next = snapshotWithOccupants(base, nextOccupants);

        const player: PlayAgentInformation = {
          id: playerId,
          name: summaryName,
          sid: this.sessionStore.getSessionId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        registered = {
          ...player,
          previewUrl: this.getPreviewUrl(),
          registeredAgent: summaryForWorld,
          enableP2a: input.enableP2a ?? "off",
        };

        const added = { player: row };
        this.bus.emit(PLAYER_ADDED_EVENT, added);
        void this.forwardHttp(PLAYER_ADDED_EVENT, added);

        agentPlayDebug("play-world", "addPlayer", {
          playerId: player.id,
          name: player.name,
          toolCount: effectiveToolNames.length,
        });

        return {
          next,
          fanout: [{ event: PLAYER_ADDED_EVENT, data: added }],
        };
      },
    });

    if (registered === undefined) {
      throw new Error("addPlayer failed");
    }
    if (
      input.connectionId !== undefined &&
      input.connectionId.length > 0
    ) {
      await this.sessionStore.upsertPresenceLease({
        playerId: registered.id,
        agentId: input.agentId,
        sid: registered.sid,
        connectionId: input.connectionId,
        ttlSeconds:
          input.leaseTtlSeconds ?? PRESENCE_LEASE_TTL_SECONDS_DEFAULT,
      });
    }
    return registered;
  }

  async heartbeatPlayerConnection(input: {
    playerId: string;
    connectionId: string;
    leaseTtlSeconds?: number;
  }): Promise<void> {
    const ok = await this.sessionStore.touchPresenceLease({
      playerId: input.playerId,
      connectionId: input.connectionId,
      ttlSeconds:
        input.leaseTtlSeconds ?? PRESENCE_LEASE_TTL_SECONDS_DEFAULT,
    });
    if (!ok) {
      throw new Error("heartbeat: unknown or stale connection");
    }
  }

  async disconnectPlayerConnection(input: {
    playerId: string;
    connectionId: string;
  }): Promise<void> {
    await this.sessionStore.removePresenceLease({
      playerId: input.playerId,
      connectionId: input.connectionId,
    });
    await this.removePlayer(input.playerId);
  }

  async recordJourney(playerId: string, journey: Journey): Promise<void> {
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const update = this.buildWorldJourneyUpdate(base, playerId, journey);
        const lastJson = serializeWorldJourneyUpdate(update);
        const next = patchAgentLastUpdate(base, playerId, lastJson);
        this.bus.emit(WORLD_JOURNEY_EVENT, update);
        void this.forwardHttp(WORLD_JOURNEY_EVENT, update);
        const signal: WorldAgentSignalPayload = {
          playerId,
          kind: "journey",
          data: { stepCount: journey.steps.length },
        };
        this.bus.emit(WORLD_AGENT_SIGNAL_EVENT, signal);
        void this.forwardHttp(WORLD_AGENT_SIGNAL_EVENT, signal);
        agentPlayDebug("play-world", "recordJourney", {
          playerId,
          stepCount: journey.steps.length,
        });
        return {
          next,
          fanout: [
            { event: WORLD_JOURNEY_EVENT, data: lastJson },
            { event: WORLD_AGENT_SIGNAL_EVENT, data: signal },
          ],
        };
      },
    });
  }

  private buildWorldJourneyUpdate(
    base: PreviewSnapshotJson,
    playerId: string,
    journey: Journey
  ): WorldJourneyUpdate {
    const occ = base.worldMap.occupants.find(
      (o): o is PreviewWorldMapAgentOccupantJson =>
        o.kind === "agent" && o.agentId === playerId
    );
    const cell = occ !== undefined ? { x: occ.x, y: occ.y } : { x: 0, y: 0 };
    const path = journeyPathFromCellAndJourney(
      playerId,
      journey,
      cell,
      base.worldMap.bounds
    );
    return { playerId, journey, path };
  }

  on(event: string, listener: (...args: unknown[]) => void): void {
    this.bus.on(event, listener);
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    this.bus.off(event, listener);
  }

  async removePlayer(id: string): Promise<void> {
    await this.sessionStore.removePresenceLease({ playerId: id });
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        const nextOccupants = removeOccupantsForPlayer(
          base.worldMap.occupants,
          id
        );
        const next = snapshotWithOccupants(base, nextOccupants);
        agentPlayDebug("play-world", "removePlayer", { playerId: id });
        return { next, fanout: this.metadataFanout() };
      },
    });
  }

  async registerMCP(options: { name: string; url?: string }): Promise<string> {
    let id = "";
    await runStoredWorldMutation({
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureWorldSnapshot(
          cached,
          this.sessionStore.playerChainGenesis
        );
        if (base.worldMap.occupants.length >= MAX_WORLD_OCCUPANTS) {
          throw new Error(
            `registerMCP: world occupant limit reached (${MAX_WORLD_OCCUPANTS})`
          );
        }
        id = randomUUID();
        const laneIndex = base.worldMap.occupants.length;
        const pos = computeFreeMapCell(
          occupiedKeysFromSnapshot(base),
          laneIndex
        );
        const mcpOcc = {
          kind: "mcp" as const,
          id,
          name: options.name,
          x: pos.x,
          y: pos.y,
          ...(options.url !== undefined ? { url: options.url } : {}),
        };
        const nextOccupants = [...base.worldMap.occupants, mcpOcc];
        const next = snapshotWithOccupants(base, nextOccupants);
        agentPlayDebug("play-world", "registerMCP", { name: options.name });
        return { next, fanout: this.metadataFanout() };
      },
    });
    return id;
  }

  async listMcpRegistrations(): Promise<
    readonly { id: string; name: string; url?: string }[]
  > {
    const snap = await this.getSnapshotJson();
    return snap.worldMap.occupants
      .filter((o) => o.kind === "mcp")
      .map((o) => ({ id: o.id, name: o.name, ...(o.url ? { url: o.url } : {}) }));
  }

  getSessionStore(): SessionStore {
    return this.sessionStore;
  }

  private async sweepStaleAgentOccupants(): Promise<void> {
    const snapshot = await this.getSnapshotJson();
    const staleAgentIds: string[] = [];
    for (const occ of snapshot.worldMap.occupants) {
      if (occ.kind !== "agent") continue;
      const hasLease = await this.sessionStore.hasPresenceLease(occ.agentId);
      if (!hasLease) {
        staleAgentIds.push(occ.agentId);
      }
    }
    for (const agentId of staleAgentIds) {
      await this.removePlayer(agentId);
    }
  }

  private forwardHttp(event: string, payload: unknown): Promise<void> {
    if (this.httpTransport === null) return Promise.resolve();
    return this.httpTransport.emit(event, payload).catch((err) => {
      agentPlayDebug("play-world", "forwardHttp", { event, payload, error: err });
      return undefined;
    });
  }
}
