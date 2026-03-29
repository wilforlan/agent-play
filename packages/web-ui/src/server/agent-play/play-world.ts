import { randomUUID } from "node:crypto";
import type { PlayAgentInformation, PlatformAgentInformation } from "./@types/agent.js";
import type {
  Journey,
  PositionedStep,
  WorldJourneyUpdate,
  WorldStructure,
} from "./@types/world.js";
import {
  configureAgentPlayDebug,
  agentPlayDebug,
  agentPlayVerbose,
} from "./agent-play-debug.js";
import { isToolMessage } from "@langchain/core/messages";
import { extractJourney } from "./journey-from-messages.js";
import { enrichJourneyPath, layoutStructuresFromTools } from "./structure-layout.js";
import {
  HttpPlayTransport,
  InMemoryPlayBus,
  PLAYER_ADDED_EVENT,
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  WORLD_STRUCTURES_EVENT,
} from "./play-transport.js";
import type {
  WorldAgentSignalPayload,
  WorldInteractionPayload,
  WorldInteractionRole,
  WorldStructuresPayload,
} from "./play-transport.js";
import type { AgentRepository } from "./agent-repository.js";
import type { RedisSessionStore } from "./redis-session-store.js";
import {
  assertAgentToolContract,
  extractAssistToolNames,
} from "./agent-tool-contract.js";
import type { PreviewSnapshotJson } from "./preview-serialize.js";
import { serializeWorldJourneyUpdate } from "./preview-serialize.js";
import { buildWorldMapFromPlayers } from "./world-map.js";
import { clampWorldPosition, type WorldBounds } from "./world-bounds.js";

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

export type LangChainAgentRegistration = {
  type: "langchain";
  toolNames: string[];
};

export type AddPlayerInput = PlatformAgentInformation & {
  agent: LangChainAgentRegistration;
  apiKey?: string;
};

export type RegisteredPlayer = PlayAgentInformation & {
  previewUrl: string;
  structures: WorldStructure[];
};

export type PlayWorldOptions = {
  previewBaseUrl?: string;
  playApiBase?: string;
  debug?: boolean;
  repository?: AgentRepository;
  sessionStore?: RedisSessionStore;
};

export const HUMAN_VIEWER_PLAYER_ID = "__human__";

const INTERACTION_LOG_CAP = 20;

type InteractionEntry = {
  role: WorldInteractionRole;
  text: string;
  at: string;
  seq: number;
};

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
  private readonly sessionStore: RedisSessionStore | null;
  private readonly agents = new Map<string, PlayAgentInformation>();
  private readonly structuresByPlayer = new Map<string, WorldStructure[]>();
  private readonly lastUpdateByPlayer = new Map<string, WorldJourneyUpdate>();
  private readonly playerOrder: string[] = [];
  private readonly playerTypes = new Map<string, string>();
  private readonly toolNamesByPlayer = new Map<string, string[]>();
  private readonly aggregateByPlayer = new Map<
    string,
    { zoneCount: number; yieldCount: number; flagged: boolean }
  >();
  private readonly interactionLogByPlayer = new Map<string, InteractionEntry[]>();
  private interactionSeq = 0;
  private readonly mcpServers: Array<{
    id: string;
    name: string;
    url?: string;
  }> = [];

  constructor(private readonly options: PlayWorldOptions = {}) {
    this.repository = options.repository ?? null;
    this.sessionStore = options.sessionStore ?? null;
  }

  async start(): Promise<void> {
    configureAgentPlayDebug(
      this.options.debug !== undefined
        ? { debug: this.options.debug }
        : {}
    );
    const sid =
      this.sessionStore !== null
        ? await this.sessionStore.loadOrCreateSessionId()
        : randomUUID();
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

  async resetSession(): Promise<string> {
    if (this.sessionId === null) {
      throw new Error("PlayWorld.start() must be called before resetSession");
    }
    this.agents.clear();
    this.structuresByPlayer.clear();
    this.lastUpdateByPlayer.clear();
    this.playerOrder.length = 0;
    this.playerTypes.clear();
    this.toolNamesByPlayer.clear();
    this.aggregateByPlayer.clear();
    this.interactionLogByPlayer.clear();
    this.interactionSeq = 0;
    this.mcpServers.length = 0;
    const newSid = randomUUID();
    this.sessionId = newSid;
    if (this.options.playApiBase !== undefined) {
      this.httpTransport = new HttpPlayTransport({
        baseUrl: this.options.playApiBase,
        sessionId: newSid,
      });
    }
    if (this.sessionStore !== null) {
      await this.sessionStore.replaceSessionWithNewSid(newSid);
    }
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
      "https://preview.agent-play.local/watch";
    const u = new URL(base.includes("://") ? base : `https://${base}`);
    u.search = "";
    return u.toString();
  }

  getSnapshotJson(): PreviewSnapshotJson {
    const sid = this.getSessionId();
    const players: PreviewSnapshotJson["players"] = [];
    for (const playerId of this.playerOrder) {
      const info = this.agents.get(playerId);
      if (!info) continue;
      const structures = this.structuresByPlayer.get(playerId) ?? [];
      const last = this.lastUpdateByPlayer.get(playerId);
      const type = this.playerTypes.get(playerId);
      const tools = this.toolNamesByPlayer.get(playerId) ?? [];
      const entry: PreviewSnapshotJson["players"][number] = {
        playerId,
        name: info.name,
        structures,
        stationary: true,
        assistToolNames: extractAssistToolNames(tools),
        hasChatTool: tools.includes("chat_tool"),
      };
      if (type !== undefined) entry.type = type;
      if (last !== undefined) {
        entry.lastUpdate = serializeWorldJourneyUpdate(last);
      }
      const log = this.interactionLogByPlayer.get(playerId);
      if (log !== undefined && log.length > 0) {
        entry.recentInteractions = log.map((row) => ({
          role: row.role,
          text: row.text,
          at: row.at,
          seq: row.seq,
        }));
      }
      const agg = this.aggregateByPlayer.get(playerId);
      if (agg !== undefined) {
        entry.zoneCount = agg.zoneCount;
        entry.yieldCount = agg.yieldCount;
        entry.flagged = agg.flagged;
      }
      players.push(entry);
    }
    const worldMap = buildWorldMapFromPlayers(
      players.map((row) => ({
        playerId: row.playerId,
        structures: row.structures,
      }))
    );
    const out: PreviewSnapshotJson = { sid, players, worldMap };
    if (this.mcpServers.length > 0) {
      out.mcpServers = this.mcpServers.map((m) => ({ ...m }));
    }
    return out;
  }

  recordProximityAction(input: RecordProximityActionInput): void {
    const fromHuman = input.fromPlayerId === HUMAN_VIEWER_PLAYER_ID;
    if (!fromHuman && !this.agents.has(input.fromPlayerId)) {
      throw new Error(
        `recordProximityAction: unknown fromPlayerId "${input.fromPlayerId}"`
      );
    }
    if (!this.agents.has(input.toPlayerId)) {
      throw new Error(
        `recordProximityAction: unknown toPlayerId "${input.toPlayerId}"`
      );
    }
    const toInfo = this.agents.get(input.toPlayerId);
    if (toInfo === undefined) {
      throw new Error("recordProximityAction: missing target agent");
    }
    const label = PROXIMITY_ACTION_LABEL[input.action];
    if (!fromHuman) {
      const fromInfo = this.agents.get(input.fromPlayerId);
      if (fromInfo === undefined) {
        throw new Error("recordProximityAction: missing source agent");
      }
      this.recordInteraction({
        playerId: input.fromPlayerId,
        role: "user",
        text: `[proximity ${label}] toward ${toInfo.name}`,
      });
    }
    this.recordInteraction({
      playerId: input.toPlayerId,
      role: "tool",
      text: fromHuman
        ? `Proximity viewer: ${label}`
        : `Proximity: ${this.agents.get(input.fromPlayerId)?.name ?? "?"} — ${label}`,
    });
    if (input.action === "assist" || input.action === "chat") {
      this.emitAgentSignal(input.toPlayerId, {
        kind: input.action,
        data: { fromPlayerId: input.fromPlayerId },
      });
    }
    if (input.action === "zone") {
      void this.applyZoneIncrement(input.toPlayerId);
    }
    if (input.action === "yield") {
      void this.applyYieldIncrement(input.toPlayerId);
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

  private async applyZoneIncrement(
    agentId: string
  ): Promise<void> {
    if (this.repository === null) {
      const o = this.aggregateByPlayer.get(agentId) ?? {
        zoneCount: 0,
        yieldCount: 0,
        flagged: false,
      };
      const zoneCount = o.zoneCount + 1;
      this.aggregateByPlayer.set(agentId, {
        zoneCount,
        yieldCount: o.yieldCount,
        flagged: zoneCount >= 100,
      });
      this.emitAgentSignal(agentId, { kind: "zone", data: { zoneCount } });
      return;
    }
    const next = await this.repository.incrementZoneCount(agentId);
    if (next !== null) {
      this.aggregateByPlayer.set(agentId, {
        zoneCount: next.zoneCount,
        yieldCount: next.yieldCount,
        flagged: next.flagged,
      });
      this.emitAgentSignal(agentId, {
        kind: "zone",
        data: { zoneCount: next.zoneCount, flagged: next.flagged },
      });
    }
  }

  private async applyYieldIncrement(
    agentId: string
  ): Promise<void> {
    if (this.repository === null) {
      const o = this.aggregateByPlayer.get(agentId) ?? {
        zoneCount: 0,
        yieldCount: 0,
        flagged: false,
      };
      const yieldCount = o.yieldCount + 1;
      this.aggregateByPlayer.set(agentId, {
        zoneCount: o.zoneCount,
        yieldCount,
        flagged: o.flagged,
      });
      this.emitAgentSignal(agentId, { kind: "yield", data: { yieldCount } });
      return;
    }
    const next = await this.repository.incrementYieldCount(agentId);
    if (next !== null) {
      this.aggregateByPlayer.set(agentId, {
        zoneCount: next.zoneCount,
        yieldCount: next.yieldCount,
        flagged: next.flagged,
      });
      this.emitAgentSignal(agentId, {
        kind: "yield",
        data: { yieldCount: next.yieldCount },
      });
    }
  }

  recordInteraction(input: RecordInteractionInput): void {
    if (!this.agents.has(input.playerId)) {
      throw new Error(
        `recordInteraction: unknown playerId "${input.playerId}"`
      );
    }
    const trimmed = input.text.trim();
    if (trimmed.length === 0) return;
    this.interactionSeq += 1;
    const seq = this.interactionSeq;
    const at = new Date().toISOString();
    const row: InteractionEntry = {
      role: input.role,
      text: trimmed.slice(0, 4000),
      at,
      seq,
    };
    const list = this.interactionLogByPlayer.get(input.playerId) ?? [];
    const next = [...list, row];
    while (next.length > INTERACTION_LOG_CAP) next.shift();
    this.interactionLogByPlayer.set(input.playerId, next);
    const payload: WorldInteractionPayload = {
      playerId: input.playerId,
      role: row.role,
      text: row.text,
      at: row.at,
      seq: row.seq,
    };
    this.bus.emit(WORLD_INTERACTION_EVENT, payload);
    void this.forwardHttp(WORLD_INTERACTION_EVENT, payload);
    agentPlayDebug("play-world", "recordInteraction", {
      playerId: input.playerId,
      role: input.role,
      seq,
    });
  }

  syncPlayerStructuresFromTools(playerId: string, toolNames: string[]): void {
    if (!this.agents.has(playerId)) {
      throw new Error(
        `syncPlayerStructuresFromTools: unknown playerId "${playerId}"`
      );
    }
    assertAgentToolContract(toolNames);
    this.toolNamesByPlayer.set(playerId, [...toolNames]);
    const laneIndex = this.playerOrder.indexOf(playerId);
    if (laneIndex < 0) {
      throw new Error(
        `syncPlayerStructuresFromTools: playerId not in player order "${playerId}"`
      );
    }
    const structures = layoutStructuresFromTools(toolNames, {
      playerId,
      laneIndex,
    });
    this.structuresByPlayer.set(playerId, structures);
    const prev = this.lastUpdateByPlayer.get(playerId);
    if (prev !== undefined) {
      const pathRaw = enrichJourneyPath(prev.journey, structures);
      const worldMap = buildWorldMapFromPlayers([
        { playerId, structures },
      ]);
      const path = clampPathToBounds(pathRaw, worldMap.bounds);
      this.lastUpdateByPlayer.set(playerId, {
        ...prev,
        structures,
        path,
      });
    }
    const info = this.agents.get(playerId);
    if (info === undefined) return;
    const type = this.playerTypes.get(playerId);
    const payload: WorldStructuresPayload = {
      playerId,
      name: info.name,
      structures,
    };
    if (type !== undefined) payload.type = type;
    this.bus.emit(WORLD_STRUCTURES_EVENT, payload);
    void this.forwardHttp(WORLD_STRUCTURES_EVENT, payload);
    agentPlayDebug("play-world", "syncPlayerStructuresFromTools", {
      playerId,
      toolCount: toolNames.length,
    });
  }

  async addPlayer(input: AddPlayerInput): Promise<RegisteredPlayer> {
    const sid = this.getSessionId();
    assertAgentToolContract(input.agent.toolNames);
    let playerId: string;
    if (this.repository !== null) {
      if (input.apiKey === undefined || input.apiKey.length === 0) {
        throw new Error(
          "addPlayer: apiKey is required when PlayWorld uses an AgentRepository"
        );
      }
      const verified = await this.repository.verifyApiKeyAndGetAgentId(
        input.apiKey
      );
      if (verified === null) {
        throw new Error("addPlayer: invalid apiKey");
      }
      playerId = verified;
    } else {
      playerId = randomUUID();
    }
    const laneIndex = this.playerOrder.length;
    const player: PlayAgentInformation = {
      id: playerId,
      name: input.name,
      sid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const structures = layoutStructuresFromTools(input.agent.toolNames, {
      playerId: player.id,
      laneIndex,
    });
    this.agents.set(player.id, player);
    this.structuresByPlayer.set(player.id, structures);
    this.playerOrder.push(player.id);
    this.playerTypes.set(player.id, input.type);
    this.toolNamesByPlayer.set(player.id, [...input.agent.toolNames]);
    if (this.repository !== null) {
      const stored = await this.repository.getAgent(playerId);
      if (stored !== null) {
        this.aggregateByPlayer.set(playerId, {
          zoneCount: stored.zoneCount,
          yieldCount: stored.yieldCount,
          flagged: stored.flagged,
        });
      }
    }
    const registered: RegisteredPlayer = {
      ...player,
      previewUrl: this.getPreviewUrl(),
      structures,
    };
    const added = {
      playerId: player.id,
      name: player.name,
      type: input.type,
      structures,
    };
    this.bus.emit(PLAYER_ADDED_EVENT, added);
    void this.forwardHttp(PLAYER_ADDED_EVENT, added);
    agentPlayDebug("play-world", "addPlayer", {
      playerId: player.id,
      name: player.name,
      toolCount: input.agent.toolNames.length,
    });
    return registered;
  }

  recordJourney(playerId: string, journey: Journey): void {
    const structures = this.structuresByPlayer.get(playerId) ?? [];
    const pathRaw = enrichJourneyPath(journey, structures);
    const worldMap = buildWorldMapFromPlayers([
      { playerId, structures },
    ]);
    const path = clampPathToBounds(pathRaw, worldMap.bounds);
    const payload: WorldJourneyUpdate = {
      playerId,
      journey,
      path,
      structures,
    };
    this.lastUpdateByPlayer.set(playerId, payload);
    this.bus.emit(WORLD_JOURNEY_EVENT, payload);
    void this.forwardHttp(WORLD_JOURNEY_EVENT, payload);
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
  }

  ingestInvokeResult(playerId: string, invokeResult: unknown): void {
    agentPlayDebug("play-world", "ingestInvokeResult", {
      playerId,
      hasMessages:
        invokeResult !== null &&
        typeof invokeResult === "object" &&
        Array.isArray((invokeResult as { messages?: unknown }).messages),
    });
    if (invokeResult === null || typeof invokeResult !== "object") return;
    const messages = (invokeResult as { messages?: unknown }).messages;
    if (!Array.isArray(messages)) return;
    this.appendToolInteractionsFromInvokeMessages(playerId, messages);
    const journey = extractJourney(messages);
    this.recordJourney(playerId, journey);
  }

  on(event: string, listener: (...args: unknown[]) => void): void {
    this.bus.on(event, listener);
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    this.bus.off(event, listener);
  }

  onWorldJourney(
    listener: (update: WorldJourneyUpdate) => void
  ): void {
    this.bus.on(WORLD_JOURNEY_EVENT, listener);
  }

  async removePlayer(id: string): Promise<void> {
    this.agents.delete(id);
    this.structuresByPlayer.delete(id);
    this.lastUpdateByPlayer.delete(id);
    this.interactionLogByPlayer.delete(id);
    this.playerTypes.delete(id);
    this.toolNamesByPlayer.delete(id);
    this.aggregateByPlayer.delete(id);
    const idx = this.playerOrder.indexOf(id);
    if (idx >= 0) this.playerOrder.splice(idx, 1);
    agentPlayDebug("play-world", "removePlayer", { playerId: id });
  }

  registerMCP(options: { name: string; url?: string }): string {
    const id = randomUUID();
    const row: { id: string; name: string; url?: string } = {
      id,
      name: options.name,
    };
    if (options.url !== undefined) {
      row.url = options.url;
    }
    this.mcpServers.push(row);
    agentPlayDebug("play-world", "registerMCP", { name: options.name });
    return id;
  }

  listMcpRegistrations(): readonly { id: string; name: string; url?: string }[] {
    return this.mcpServers.map((m) => ({ ...m }));
  }

  getPlayer(id: string): PlayAgentInformation | undefined {
    return this.agents.get(id);
  }

  private forwardHttp(event: string, payload: unknown): Promise<void> {
    if (this.httpTransport === null) return Promise.resolve();
    return this.httpTransport.emit(event, payload).catch((err) => {
      agentPlayDebug("play-world", "forwardHttp", { event, payload, error: err });
      return undefined;
    });
  }

  private appendToolInteractionsFromInvokeMessages(
    playerId: string,
    messages: unknown[]
  ): void {
    for (const m of messages) {
      if (!isToolMessage(m)) continue;
      const name =
        typeof (m as { name?: string }).name === "string"
          ? (m as { name: string }).name
          : "tool";
      const content = (m as { content?: unknown }).content;
      const text =
        typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content.map(String).join("")
            : content === undefined || content === null
              ? ""
              : String(content);
      const snippet = text.trim().slice(0, 240);
      if (snippet.length === 0) {
        this.recordInteraction({
          playerId,
          role: "tool",
          text: `${name} (done)`,
        });
      } else {
        this.recordInteraction({
          playerId,
          role: "tool",
          text: `${name}: ${snippet}`,
        });
      }
    }
  }
}
