/**
 * String constants and payload shapes for SSE and in-process world events.
 *
 * @remarks **Emitters:** server `PlayWorld` and Redis fanout. **Consumers:** watch UI `EventSource`,
 * integration tests, and any host that forwards `POST` events.
 *
 * **Session vs world:** names prefixed with **`session:`** concern the HTTP/SDK session (`sid`) and
 * transport; names prefixed with **`world:`** concern occupants, chat, and map-visible state.
 */
import type { WorldInteractionRole } from "./public-types.js";

/** After `RemotePlayWorld.connect()` assigns a `sid` (and optional detail such as `sid`). */
export const SESSION_CONNECTED_EVENT = "session:connected";

/** RPC or transport rejected the session (e.g. 401/403); optional `detail.status`. */
export const SESSION_INVALID_EVENT = "session:invalid";

/** After `RemotePlayWorld.close()` completes teardown. */
export const SESSION_CLOSED_EVENT = "session:closed";

/** SSE subscription opened (optional; emitted when wired). */
export const SESSION_SSE_OPEN_EVENT = "session:sse_open";

/** SSE subscription error (optional; emitted when wired). */
export const SESSION_SSE_ERROR_EVENT = "session:sse_error";

export type RemotePlayWorldSessionEvent = {
  name: string;
  detail?: Record<string, unknown>;
};

/** Fired when `addAgent` / `addPlayer` completes; payload includes snapshot row for the new player. */
export const PLAYER_ADDED_EVENT = "world:player_added";

/** Fired for each new chat/interaction line. */
export const WORLD_INTERACTION_EVENT = "world:interaction";

/** Lightweight signals (zone, yield, assist, journey metadata, etc.). */
export const WORLD_AGENT_SIGNAL_EVENT = "world:agent_signal";

/** Full journey + path update for a player. */
export const WORLD_JOURNEY_EVENT = "world:journey";

/**
 * Payload for {@link WORLD_AGENT_SIGNAL_EVENT}.
 *
 * @property playerId - Target player.
 * @property kind - Signal category; `journey` often carries `{ stepCount }` in `data`.
 * @property data - Optional free-form metadata.
 */
export type WorldAgentSignalPayload = {
  playerId: string;
  kind: "zone" | "yield" | "assist" | "chat" | "metadata" | "journey";
  data?: Record<string, unknown>;
};

/**
 * Payload for {@link WORLD_INTERACTION_EVENT}.
 *
 * @property seq - Monotonic sequence for ordering in the UI.
 */
export type WorldInteractionPayload = {
  playerId: string;
  role: WorldInteractionRole;
  text: string;
  at: string;
  seq: number;
};
