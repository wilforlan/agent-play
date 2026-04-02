/**
 * @packageDocumentation
 * Public entry for **@agent-play/sdk**.
 *
 * **Primary APIs**
 * - {@link import("./lib/remote-play-world.js").RemotePlayWorld} — HTTP client: `start`, `addPlayer`,
 *   `recordInteraction`, `recordJourney`, `syncPlayerStructuresFromTools`, `registerMcp`, `hold`, `onClose`.
 * - {@link import("./platforms/langchain.js").langchainRegistration} — build `agent` payload for `addPlayer`.
 * - {@link import("./lib/world-bounds.js").clampWorldPosition} / {@link import("./lib/world-bounds.js").WorldBounds} —
 *   shared bounds math for server and canvas.
 *
 * **Events and types** — Re-exported from {@link import("./world-events.js")} and {@link import("./public-types.js")}.
 *
 * **Transport** — The SDK uses `fetch` only (no SSE in this package); the browser watch UI subscribes to SSE separately.
 */

export type {
  AddPlayerInput,
  AssistToolSpec,
  LangChainAgentRegistration,
  PlayAgentInformation,
  PlatformAgentInformation,
  RecordInteractionInput,
  RegisteredPlayer,
  WorldInteractionRole,
  YieldEventInfo,
  ZoneEventInfo,
} from "./public-types.js";
export type {
  DestinationJourneyStep,
  Journey,
  JourneyStep,
  OriginJourneyStep,
  PositionedStep,
  StructureJourneyStep,
  WorldJourneyUpdate,
  WorldStructure,
  WorldStructureKind,
} from "./public-types.js";
export {
  PLAYER_ADDED_EVENT,
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  WORLD_STRUCTURES_EVENT,
  type WorldAgentSignalPayload,
  type WorldInteractionPayload,
  type WorldStructuresPayload,
} from "./world-events.js";
export {
  clampWorldPosition,
  boundsContain,
  type WorldBounds,
} from "./lib/world-bounds.js";
export {
  agentPlayDebug,
  configureAgentPlayDebug,
  isAgentPlayDebugEnabled,
  resetAgentPlayDebug,
} from "./lib/agent-play-debug.js";
export { langchainRegistration } from "./platforms/langchain.js";
export {
  RemotePlayWorld,
  type RemotePlayWorldHold,
  type RemotePlayWorldOptions,
} from "./lib/remote-play-world.js";
