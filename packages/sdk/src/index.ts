/**
 * @packageDocumentation
 * Public entry for **@agent-play/sdk** (Node.js and browser `browser` export).
 *
 * **Primary APIs**
 * - {@link RemotePlayWorld} — HTTP client: load **`nodeCredentials`** (`rootKey`, human **`passw`**) from **`~/.agent-play/credentials.json`** via **@agent-play/node-tools**, then **`connect`**, **`getWorldSnapshot`**, **`addAgent`**, **`subscribeIntercomCommands`** (for automation agents handling intercom **`forwarded`** commands), **`recordInteraction`**, **`recordJourney`**, **`registerMcp`**, **`hold`**, **`onClose`**.
 * - {@link langchainRegistration} — build LangChain **`agent`** payloads for **`addAgent`**.
 * - {@link clampWorldPosition}, {@link WorldBounds} — shared world bounds for server and canvas.
 *
 * **Events** — Session and world events: {@link WORLD_INTERACTION_EVENT}, {@link SESSION_CONNECTED_EVENT}, and related symbols from this module.
 *
 * **Transport** — **`RemotePlayWorld`** uses `fetch`; **`subscribeWorldState`** consumes SSE **`playerChainNotify`** and **`getPlayerChainNode`** for incremental merges.
 *
 * **Wire note** — Fanout and SSE use **`playerChainNotify`** (node references). Legacy **`playerChainDelta`**-style digests on the wire are not used; use **`getWorldSnapshot`** if you need a full snapshot only.
 */

export type {
  AddAgentInput,
  AddPlayerInput,
  AgentPlaySnapshot,
  AgentPlayWorldMap,
  AgentPlayWorldMapAgentOccupant,
  AgentPlayWorldMapBounds,
  AgentPlayWorldMapMcpOccupant,
  AssistToolFieldType,
  AssistToolParameterSpec,
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
  expandBoundsToMinimumPlayArea,
  MINIMUM_PLAY_WORLD_BOUNDS,
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
  type IntercomToolExecutor,
  type RemotePlayWorldConnectOptions,
  type RemotePlayWorldHold,
  type RemotePlayWorldLogging,
  type RemotePlayWorldNodeCredentials,
  type RemotePlayWorldOptions,
  type SubscribeIntercomCommandsOptions,
} from "./lib/remote-play-world.js";
export { intercomResultRecordFromLangChainInvokeOutput } from "./lib/intercom-langchain-chat-result.js";
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
