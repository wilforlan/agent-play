import { randomUUID } from "node:crypto";
import type { PlayAgentInformation, PlatformAgentInformation } from "../@types/agent.js";
import type { Journey, WorldJourneyUpdate, WorldStructure } from "../@types/world.js";
import { configureAgentPlayDebug, agentPlayDebug } from "./agent-play-debug.js";
import { isToolMessage } from "@langchain/core/messages";
import { extractJourney } from "./journey-from-messages.js";
import { enrichJourneyPath, layoutStructuresFromTools } from "./structure-layout.js";
import {
  HttpPlayTransport,
  InMemoryPlayBus,
  PLAYER_ADDED_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  WORLD_STRUCTURES_EVENT,
} from "./play-transport.js";
import type {
  WorldInteractionPayload,
  WorldInteractionRole,
  WorldStructuresPayload,
} from "./play-transport.js";
import type { PreviewSnapshotJson } from "./preview-serialize.js";
import { serializeWorldJourneyUpdate } from "./preview-serialize.js";
import { buildWorldMapFromPlayers } from "./world-map.js";

export type LangChainAgentRegistration = {
  type: "langchain";
  toolNames: string[];
};

export type AddPlayerInput = PlatformAgentInformation & {
  agent: LangChainAgentRegistration;
};

export type RegisteredPlayer = PlayAgentInformation & {
  previewUrl: string;
  structures: WorldStructure[];
};

export type PlayWorldOptions = {
  previewBaseUrl?: string;
  playApiBase?: string;
  debug?: boolean;
};

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

export class PlayWorld {
  private sessionId: string | null = null;
  private readonly bus = new InMemoryPlayBus();
  private httpTransport: HttpPlayTransport | null = null;
  private readonly agents = new Map<string, PlayAgentInformation>();
  private readonly structuresByPlayer = new Map<string, WorldStructure[]>();
  private readonly lastUpdateByPlayer = new Map<string, WorldJourneyUpdate>();
  private readonly playerOrder: string[] = [];
  private readonly playerTypes = new Map<string, string>();
  private readonly interactionLogByPlayer = new Map<string, InteractionEntry[]>();
  private interactionSeq = 0;

  constructor(private readonly options: PlayWorldOptions = {}) {}

  async start(): Promise<void> {
    configureAgentPlayDebug(
      this.options.debug !== undefined
        ? { debug: this.options.debug }
        : {}
    );
    this.sessionId = randomUUID();
    agentPlayDebug("play-world", "start", { sessionId: this.sessionId });
    if (this.options.playApiBase !== undefined) {
      this.httpTransport = new HttpPlayTransport({
        baseUrl: this.options.playApiBase,
        sessionId: this.sessionId,
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
    return sid === this.sessionId;
  }

  getPreviewUrl(): string {
    const base =
      this.options.previewBaseUrl ??
      process.env.PLAY_PREVIEW_BASE_URL ??
      "https://preview.agent-play.local/watch";
    const sid = this.getSessionId();
    const u = new URL(base.includes("://") ? base : `https://${base}`);
    u.searchParams.set("sid", sid);
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
      const entry: PreviewSnapshotJson["players"][number] = {
        playerId,
        name: info.name,
        structures,
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
      players.push(entry);
    }
    const worldMap = buildWorldMapFromPlayers(
      players.map((row) => ({
        playerId: row.playerId,
        structures: row.structures,
      }))
    );
    return { sid, players, worldMap };
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
      const path = enrichJourneyPath(prev.journey, structures);
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
    const laneIndex = this.playerOrder.length;
    const player: PlayAgentInformation = {
      id: randomUUID(),
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
    const path = enrichJourneyPath(journey, structures);
    const payload: WorldJourneyUpdate = {
      playerId,
      journey,
      path,
      structures,
    };
    this.lastUpdateByPlayer.set(playerId, payload);
    this.bus.emit(WORLD_JOURNEY_EVENT, payload);
    void this.forwardHttp(WORLD_JOURNEY_EVENT, payload);
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
    const idx = this.playerOrder.indexOf(id);
    if (idx >= 0) this.playerOrder.splice(idx, 1);
    agentPlayDebug("play-world", "removePlayer", { playerId: id });
  }

  getPlayer(id: string): PlayAgentInformation | undefined {
    return this.agents.get(id);
  }

  private forwardHttp(event: string, payload: unknown): Promise<void> {
    if (this.httpTransport === null) return Promise.resolve();
    return this.httpTransport.emit(event, payload).catch(() => undefined);
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
