import { RemotePlayWorld } from "@agent-play/sdk";
import { getBuiltinAgentDefinitions } from "./builtin-langchain-agents.js";

export type RegisterBuiltinAgentsOptions = {
  baseUrl: string;
  /**
   * `rootKey` from `.root` and human **`passw`** from **`~/.agent-play/credentials.json`** (same as **`RemotePlayWorldNodeCredentials`**).
   */
  nodeCredentials: { rootKey: string; passw: string };
  /**
   * When true (default), skips `addAgent` for built-ins whose `name` already appears on the snapshot.
   */
  skipExistingByName?: boolean;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export async function registerBuiltinAgents(
  options: RegisterBuiltinAgentsOptions
): Promise<void> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const skipExisting = options.skipExistingByName !== false;
  const world = new RemotePlayWorld({
    baseUrl,
    nodeCredentials: options.nodeCredentials,
  });
  try {
    await world.connect();
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
  } finally {
    await world.close();
  }
}
