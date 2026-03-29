import type { WorldInteractionRole, WorldStructure } from "./public-types.js";

export const PLAYER_ADDED_EVENT = "world:player_added";

export const WORLD_STRUCTURES_EVENT = "world:structures";

export const WORLD_INTERACTION_EVENT = "world:interaction";

export const WORLD_AGENT_SIGNAL_EVENT = "world:agent_signal";

export const WORLD_JOURNEY_EVENT = "world:journey";

export type WorldAgentSignalPayload = {
  playerId: string;
  kind: "zone" | "yield" | "assist" | "chat" | "metadata" | "journey";
  data?: Record<string, unknown>;
};

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
