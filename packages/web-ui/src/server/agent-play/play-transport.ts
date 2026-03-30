import { EventEmitter } from "node:events";
import fetch from "node-fetch";
import type { WorldStructure } from "./@types/world.js";
import { agentPlayDebug } from "./agent-play-debug.js";

export const WORLD_JOURNEY_EVENT = "world:journey";

export const PLAYER_ADDED_EVENT = "world:player_added";

export const WORLD_STRUCTURES_EVENT = "world:structures";

export const WORLD_INTERACTION_EVENT = "world:interaction" as const;

export const WORLD_AGENT_SIGNAL_EVENT = "world:agent_signal" as const;

export const WORLD_FANOUT_PLAYER_ID = "__world__";

export type WorldAgentSignalPayload = {
  playerId: string;
  kind: "zone" | "yield" | "assist" | "chat" | "metadata" | "journey";
  data?: Record<string, unknown>;
};

export type WorldInteractionRole = "user" | "assistant" | "tool";

export type WorldInteractionPayload = {
  playerId: string;
  role: WorldInteractionRole;
  text: string;
  at: string;
  seq: number;
};

export type WorldStructuresPayload = {
  playerId: string;
  name: string;
  structures: WorldStructure[];
  type?: string;
};

export class InMemoryPlayBus extends EventEmitter {
  override emit(name: string | symbol, ...args: unknown[]): boolean {
    return super.emit(name, ...args);
  }
}

export type HttpTransportOptions = {
  baseUrl: string;
  sessionId: string;
};

export class HttpPlayTransport {
  constructor(private readonly options: HttpTransportOptions) {}

  async emit(name: string, payload: unknown): Promise<void> {
    const base = this.options.baseUrl.replace(/\/$/, "");
    const url = `${base}/events`;
    const bodyPreview =
      typeof payload === "object" && payload !== null
        ? JSON.stringify(payload).slice(0, 500)
        : String(payload);
    agentPlayDebug("http-transport", "emit", { url, event: name, bodyPreview });
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: name,
        sid: this.options.sessionId,
        payload,
      }),
    });
  }
}
