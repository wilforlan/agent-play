import { EventEmitter } from "node:events";
import fetch from "node-fetch";
import { agentPlayDebug } from "./agent-play-debug.js";

export const WORLD_JOURNEY_EVENT = "world:journey";

export const PLAYER_ADDED_EVENT = "world:player_added";

export const WORLD_INTERACTION_EVENT = "world:interaction" as const;

export const WORLD_AGENT_SIGNAL_EVENT = "world:agent_signal" as const;

export const WORLD_SPACE_TRANSITION_EVENT = "world:space_transition" as const;

export const WORLD_GEOGRAPHY_EVENT = "world:geography" as const;

/**
 * Fanout topic emitted when a space amenity's content (shop items,
 * supermarket items, car-wash cars) changes — additions, removals, and
 * sold-state transitions during a purchase.
 *
 * @remarks
 * Consumed by the client play-ui to re-render amenity stages without a full
 * snapshot resync (the next snapshot still carries the authoritative state).
 */
export const SPACE_AMENITY_CONTENT_UPDATED_EVENT =
  "space:amenity_content_updated" as const;

/**
 * Fanout topic emitted when a new player's wallet is auto-seeded to the
 * default starting balance.
 */
export const PLAYER_WALLET_SEEDED_EVENT = "player:wallet_seeded" as const;

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

export type WorldSpaceTransitionPayload = {
  playerId: string;
  from: {
    playerId: string;
    worldId: string;
    structureId?: string;
    spaceId?: string;
  };
  to: {
    playerId: string;
    worldId: string;
    structureId?: string;
    spaceId?: string;
  };
  at: string;
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
