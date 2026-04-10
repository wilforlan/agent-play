/**
 * @packageDocumentation
 * Public entry for **@agent-play/sdk**.
 *
 * **Primary APIs**
 * - {@link import("./lib/remote-play-world.js").RemotePlayWorld} — HTTP client: **`nodeCredentials: { rootKey, passw }`** with human **`passw`** from **`~/.agent-play/credentials.json`** (see **@agent-play/node-tools** **`loadAgentPlayCredentialsFileFromPathSync`**), then `connect`, `getWorldSnapshot`, `addAgent` (preferred),
 *   `recordInteraction`, `recordJourney`, `registerMcp`, `hold`, `onClose`.
 * - {@link import("./platforms/langchain.js").langchainRegistration} — build `agent` payload for `addAgent`.
 * - {@link import("./lib/world-bounds.js").clampWorldPosition} / {@link import("./lib/world-bounds.js").WorldBounds} —
 *   shared bounds math for server and canvas.
 *
 * **Events and types** — Re-exported from {@link import("./world-events.js")} and {@link import("./public-types.js")}.
 *
 * **Transport** — `RemotePlayWorld` uses `fetch`; optional {@link import("./lib/remote-play-world.js").RemotePlayWorld#subscribeWorldState}
 * uses SSE **`playerChainNotify`** plus {@link import("./lib/remote-play-world.js").RemotePlayWorld#getPlayerChainNode} for incremental merges.
 *
 * **Breaking (server / wire)** — Fanout and SSE incremental payloads use **`playerChainNotify`** (node refs), not legacy **`playerChainDelta`** (per-leaf digests on the wire). Custom clients should migrate or fall back to **`getWorldSnapshot`** only.
 */

export type {
  AddAgentInput,
  AddPlayerInput,
  AgentPlaySnapshot,
  AgentPlayWorldMap,
  AgentPlayWorldMapAgentOccupant,
  AgentPlayWorldMapBounds,
  AgentPlayWorldMapMcpOccupant,
  AssistToolSpec,
  LangChainAgentRegistration,
  PlayerChainFanoutNotify,
  PlayerChainGenesisNode,
  PlayerChainHeaderNode,
  PlayerChainNodeResponse,
  PlayerChainNotifyNodeRef,
  PlayerChainOccupantPresentNode,
  PlayerChainOccupantRemovedNode,
  PlayAgentInformation,
  PlatformAgentInformation,
  RecordInteractionInput,
  RegisteredAgentSummary,
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
} from "./public-types.js";
export {
  PLAYER_ADDED_EVENT,
  SESSION_CLOSED_EVENT,
  SESSION_CONNECTED_EVENT,
  SESSION_INVALID_EVENT,
  SESSION_SSE_ERROR_EVENT,
  SESSION_SSE_OPEN_EVENT,
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  type RemotePlayWorldSessionEvent,
  type WorldAgentSignalPayload,
  type WorldInteractionPayload,
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
  type RemotePlayWorldConnectOptions,
  type RemotePlayWorldHold,
  type RemotePlayWorldNodeCredentials,
  type RemotePlayWorldOptions,
} from "./lib/remote-play-world.js";
export {
  mergeSnapshotWithPlayerChainNode,
  parsePlayerChainFanoutNotify,
  parsePlayerChainFanoutNotifyFromSsePayload,
  parsePlayerChainNodeRpcBody,
  sortNodeRefsForSerializedFetch,
} from "./lib/player-chain-merge.js";
export {
  PLAYER_CHAIN_GENESIS_STABLE_KEY,
  PLAYER_CHAIN_HEADER_STABLE_KEY,
} from "./lib/world-chain-keys.js";
export {
  type AgentPlayAgentNodeEntry,
  type AgentPlayCredentialsFile,
  loadAgentPlayCredentialsFileFromPath,
  loadAgentPlayCredentialsFileFromPathSync,
  loadRootKey,
  nodeCredentialsMaterialFromHumanPassphrase,
  parseAgentPlayCredentialsJson,
  resolveAgentPlayCredentialsPath,
} from "@agent-play/node-tools";
