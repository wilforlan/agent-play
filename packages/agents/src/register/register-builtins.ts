import type { AgentPlaySnapshot, P2aEnableFlag } from "@agent-play/sdk";
import {
  agentPlayDebug,
  langchainRegistration,
  RemotePlayWorld,
} from "@agent-play/sdk";
import type { BuiltinAgentDefinition } from "../builtins/types.js";
import { getBuiltinAgentDefinitions } from "../builtins/definitions.js";
import { executeToolCapability } from "../tool-handlers/execute-tool-capability.js";
import { resolveAgentsRemotePlayWorldOptions } from "../resolve-agents-remote-play-world-options.js";

function resolveSkippedBuiltinPlayerId(
  snap: AgentPlaySnapshot,
  def: BuiltinAgentDefinition
): string | undefined {
  for (const o of snap.worldMap.occupants) {
    if (o.kind !== "agent") {
      continue;
    }
    if (o.agentId === def.id) {
      return o.agentId;
    }
  }
  for (const o of snap.worldMap.occupants) {
    if (o.kind !== "agent") {
      continue;
    }
    if (o.name === def.name) {
      return o.agentId;
    }
  }
  return undefined;
}

export type RegisterBuiltinAgentsOptions = {
  skipExistingByName?: boolean;
  mainNodeId?: string;
  /** Default **`enableP2a`** for builtins when the definition omits it. */
  enableP2a?: P2aEnableFlag;
};

const DEFAULT_MAIN_NODE_ID =
  "87b6637b010478e48a83a8d445041ae4df5d607df7932153cdfee5c601e8e39e";

function resolveEnableP2aForBuiltin(
  def: BuiltinAgentDefinition,
  options: RegisterBuiltinAgentsOptions
): P2aEnableFlag {
  return def.enableP2a ?? options.enableP2a ?? "off";
}

export async function registerBuiltinAgents(
  options: RegisterBuiltinAgentsOptions = {}
): Promise<RemotePlayWorld> {
  const skipExisting = options.skipExistingByName !== false;
  const mainNodeId = options.mainNodeId?.trim() || DEFAULT_MAIN_NODE_ID;
  const world = new RemotePlayWorld({
    logging: "on",
    ...resolveAgentsRemotePlayWorldOptions(),
  });
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  if (
    process.env.P2A_WEBRTC_ENABLED === "1" &&
    openAiApiKey !== undefined &&
    openAiApiKey.length > 0
  ) {
    world.initAudio({
      openai: {
        apiKey: openAiApiKey,
      },
    });
  }
  agentPlayDebug("register-builtins", "p2a_audio_bridge_deprecated", {
    via: "sdk-or-agents-endpoint",
  });
  await world.connect({ mainNodeId });
  const snap = await world.getWorldSnapshot();
  let existingNames = new Set<string>();
  if (skipExisting) {
    for (const o of snap.worldMap.occupants) {
      if (o.kind === "agent") {
        existingNames.add(o.name);
      }
    }
  }
  const intercomPlayerIds: string[] = [];
  for (const def of getBuiltinAgentDefinitions()) {
    const skipAdd = skipExisting && existingNames.has(def.name);
    if (!skipAdd) {
      const enableP2a = resolveEnableP2aForBuiltin(def, options);
      const registered = await world.addAgent({
        name: def.name,
        type: def.type,
        agent: langchainRegistration(def.agent),
        nodeId: def.id,
        enableP2a,
      });
      intercomPlayerIds.push(registered.id);
      continue;
    }
    const playerId = resolveSkippedBuiltinPlayerId(snap, def);
    if (playerId !== undefined) {
      intercomPlayerIds.push(playerId);
    }
  }
  let closeIntercom: () => void = () => {};
  if (intercomPlayerIds.length > 0) {
    const chatAgentsByPlayerId = new Map(
      getBuiltinAgentDefinitions()
        .filter((def) => intercomPlayerIds.includes(def.id))
        .map((def) => [def.id, def.agent] as const)
    );
    closeIntercom = world.subscribeIntercomCommands({
      playerIds: intercomPlayerIds,
      executeTool: executeToolCapability,
      chatAgentsByPlayerId,
    }).close;
  }
  world.onClose(() => {
    closeIntercom();
  });
  return world;
}
