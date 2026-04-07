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
import type { WorldSessionStore } from "./world-session-store.js";
import { MemorySessionStore } from "./memory-session-store.js";
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
  ensureSnapshotSid,
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
  return { sid: base.sid, worldMap: buildSnapshotWorldMap(occ) };
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

export type AddPlayerInput = PlatformAgentInformation & {
  agent: LangChainAgentRegistration;
  apiKey?: string;
  agentId: string;
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
  sessionStore?: WorldSessionStore;
};

export const HUMAN_VIEWER_PLAYER_ID = "__human__";

export const MAX_WORLD_OCCUPANTS = 100;

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
  private sessionId: string | null = null;
  private readonly bus = new InMemoryPlayBus();
  private httpTransport: HttpPlayTransport | null = null;
  private readonly repository: AgentRepository | null;
  private readonly sessionStore: WorldSessionStore;

  constructor(private readonly options: PlayWorldOptions = {}) {
    this.repository = options.repository ?? null;
    this.sessionStore = options.sessionStore ?? new MemorySessionStore();
  }

  async start(): Promise<void> {
    configureAgentPlayDebug(
      this.options.debug !== undefined
        ? { debug: this.options.debug }
        : {}
    );
    const sid = await this.sessionStore.loadOrCreateSessionId();
    this.sessionId = sid;
    agentPlayDebug("play-world", "start", { sessionId: sid });
    if (this.options.playApiBase !== undefined) {
      this.httpTransport = new HttpPlayTransport({
        baseUrl: this.options.playApiBase,
        sessionId: sid,
      });
    }
  }

  getSessionId(): string {
    if (this.sessionId === null) {
      throw new Error("PlayWorld.start() must be called before using the world");
    }
    return this.sessionId;
  }

  isSessionSid(sid: string): boolean {
    if (this.sessionId === null) return false;
    return sid.trim() === this.sessionId;
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
    if (this.sessionId === null) {
      throw new Error("PlayWorld.start() must be called before resetSession");
    }
    const newSid = randomUUID();
    this.sessionId = newSid;
    if (this.options.playApiBase !== undefined) {
      this.httpTransport = new HttpPlayTransport({
        baseUrl: this.options.playApiBase,
        sessionId: newSid,
      });
    }
    const prev = await this.sessionStore.getSnapshotJson();
    await this.sessionStore.replaceSessionWithNewSid(newSid);
    const snap = emptySnapshot(newSid);
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
    const sid = this.getSessionId();
    const raw = await this.sessionStore.getSnapshotJson();
    if (raw === null) {
      return emptySnapshot(sid);
    }
    if (raw.sid !== sid) {
      return emptySnapshot(sid);
    }
    return raw;
  }

  async recordProximityAction(
    input: RecordProximityActionInput
  ): Promise<void> {
    const snap = await this.getSnapshotJson();
    const byRef = new Map<
      string,
      | PreviewWorldMapHumanOccupantJson
      | PreviewWorldMapAgentOccupantJson
      | PreviewWorldMapMcpOccupantJson
    >();
    for (const occ of snap.worldMap.occupants) {
      if (occ.kind === "human") {
        byRef.set(`human:${occ.id}`, occ);
      } else if (occ.kind === "agent") {
        byRef.set(`agent:${occ.agentId}`, occ);
      } else {
        byRef.set(`mcp:${occ.id}`, occ);
      }
    }
    const fromRef = input.fromPlayerId.startsWith("human:")
      ? input.fromPlayerId
      : input.fromPlayerId === HUMAN_VIEWER_PLAYER_ID
        ? `human:${HUMAN_VIEWER_PLAYER_ID}`
        : `agent:${input.fromPlayerId}`;
    const toRef = input.toPlayerId.includes(":")
      ? input.toPlayerId
      : `agent:${input.toPlayerId}`;
    const fromOcc = byRef.get(fromRef);
    const toOcc = byRef.get(toRef);
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
        data: { fromPlayerId: input.fromPlayerId },
      };
      this.emitAgentSignal(toOcc.agentId, {
        kind: input.action,
        data: { fromPlayerId: input.fromPlayerId },
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
      sid: this.getSessionId(),
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureSnapshotSid(cached, this.getSessionId());
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
          const next: PreviewSnapshotJson = {
            sid: base.sid,
            worldMap: buildSnapshotWorldMap(nextOccupants),
          };
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
        const next: PreviewSnapshotJson = {
          sid: base.sid,
          worldMap: buildSnapshotWorldMap(nextOccupants),
        };
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
      sid: this.getSessionId(),
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureSnapshotSid(cached, this.getSessionId());
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
          const next: PreviewSnapshotJson = {
            sid: base.sid,
            worldMap: buildSnapshotWorldMap(nextOccupants),
          };
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
        const next: PreviewSnapshotJson = {
          sid: base.sid,
          worldMap: buildSnapshotWorldMap(nextOccupants),
        };
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
    const sid = this.getSessionId();
    assertAgentToolContract(input.agent.toolNames);
    const trimmedId = input.agentId.trim();
    if (trimmedId.length === 0) {
      throw new Error(
        'addPlayer: agentId is required (use an id from `agent-play create` when using a repository)'
      );
    }

    let registered: RegisteredPlayer | undefined;

    await runStoredWorldMutation({
      sid,
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureSnapshotSid(cached, sid);
        let stored: StoredAgentRecord | null = null;
        let playerId = trimmedId;

        if (this.repository !== null) {
          if (input.apiKey === undefined || input.apiKey.length === 0) {
            throw new Error(
              "addPlayer: register an agent first with `agent-play create` (after `agent-play login`), then pass the printed apiKey and agentId"
            );
          }
          const userId = await this.repository.verifyApiKeyForUser(input.apiKey);
          if (userId === null) {
            throw new Error("addPlayer: invalid apiKey");
          }
          const row = await this.repository.getAgent(trimmedId);
          if (row === null) {
            throw new Error(
              "addPlayer: unknown agentId; create an agent with `agent-play create` after `agent-play login`"
            );
          }
          if (row.userId !== userId) {
            throw new Error(
              "addPlayer: agentId does not belong to this API key; use an agent id from your account"
            );
          }
          stored = row;
          playerId = row.agentId;
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

        const assistList =
          input.agent.assistTools !== undefined
            ? input.agent.assistTools.map((t) => ({ ...t }))
            : [];

        const row: PreviewWorldMapAgentOccupantJson = {
          kind: "agent",
          agentId: playerId,
          name: input.name,
          x: pos.x,
          y: pos.y,
          platform: input.type,
          toolNames: [...input.agent.toolNames],
          stationary: true,
          assistToolNames: extractAssistToolNames(input.agent.toolNames),
          hasChatTool: input.agent.toolNames.includes("chat_tool"),
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
        const next: PreviewSnapshotJson = {
          sid: base.sid,
          worldMap: buildSnapshotWorldMap(nextOccupants),
        };

        const player: PlayAgentInformation = {
          id: playerId,
          name: input.name,
          sid,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        registered = {
          ...player,
          previewUrl: this.getPreviewUrl(),
          registeredAgent: registeredSummary,
        };

        const added = { player: row };
        this.bus.emit(PLAYER_ADDED_EVENT, added);
        void this.forwardHttp(PLAYER_ADDED_EVENT, added);

        agentPlayDebug("play-world", "addPlayer", {
          playerId: player.id,
          name: player.name,
          toolCount: input.agent.toolNames.length,
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
    return registered;
  }

  async recordJourney(playerId: string, journey: Journey): Promise<void> {
    await runStoredWorldMutation({
      sid: this.getSessionId(),
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureSnapshotSid(cached, this.getSessionId());
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
    await runStoredWorldMutation({
      sid: this.getSessionId(),
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureSnapshotSid(cached, this.getSessionId());
        const nextOccupants = removeOccupantsForPlayer(
          base.worldMap.occupants,
          id
        );
        const next: PreviewSnapshotJson = {
          sid: base.sid,
          worldMap: buildSnapshotWorldMap(nextOccupants),
        };
        agentPlayDebug("play-world", "removePlayer", { playerId: id });
        return { next, fanout: this.metadataFanout() };
      },
    });
  }

  async registerMCP(options: { name: string; url?: string }): Promise<string> {
    let id = "";
    await runStoredWorldMutation({
      sid: this.getSessionId(),
      store: this.sessionStore,
      mutate: async (cached) => {
        const base = ensureSnapshotSid(cached, this.getSessionId());
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
        const next: PreviewSnapshotJson = {
          sid: base.sid,
          worldMap: buildSnapshotWorldMap(nextOccupants),
        };
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

  getSessionStore(): WorldSessionStore {
    return this.sessionStore;
  }

  private forwardHttp(event: string, payload: unknown): Promise<void> {
    if (this.httpTransport === null) return Promise.resolve();
    return this.httpTransport.emit(event, payload).catch((err) => {
      agentPlayDebug("play-world", "forwardHttp", { event, payload, error: err });
      return undefined;
    });
  }
}
