import { RemotePlayWorld } from "@agent-play/sdk";
import { getBuiltinAgentDefinitions } from "../builtins/definitions.js";

export type RegisterBuiltinAgentsOptions = {
  skipExistingByName?: boolean;
  mainNodeId?: string;
};

const DEFAULT_MAIN_NODE_ID =
  "87b6637b010478e48a83a8d445041ae4df5d607df7932153cdfee5c601e8e39e";

export async function registerBuiltinAgents(
  options: RegisterBuiltinAgentsOptions = {}
): Promise<RemotePlayWorld> {
  const skipExisting = options.skipExistingByName !== false;
  const mainNodeId = options.mainNodeId?.trim() || DEFAULT_MAIN_NODE_ID;
  const world = new RemotePlayWorld();
  await world.connect({ mainNodeId });
  let existingNames = new Set<string>();
  if (skipExisting) {
    const snap = await world.getWorldSnapshot();
    for (const o of snap.worldMap.occupants) {
      if (o.kind === "agent") {
        existingNames.add(o.name);
      }
    }
  }
  for (const def of getBuiltinAgentDefinitions()) {
    if (existingNames.has(def.name)) continue;
    await world.addAgent({
      name: def.name,
      type: def.type,
      agent: def.agent,
      nodeId: def.id,
    });
  }
  return world;
}
