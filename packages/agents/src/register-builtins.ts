import { RemotePlayWorld } from "@agent-play/sdk";
import { getBuiltinAgentDefinitions } from "./builtin-langchain-agents.js";

export type RegisterBuiltinAgentsOptions = {
  baseUrl: string;
  apiKey: string;
  /**
   * When true (default), skips `addPlayer` for built-ins whose `name` already appears on the snapshot.
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
  const apiKey = options.apiKey;
  const skipExisting = options.skipExistingByName !== false;
  const world = new RemotePlayWorld({ baseUrl, apiKey });
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
      await world.addPlayer({
        name: def.name,
        type: def.type,
        agent: def.agent,
        agentId: def.id,
      });
    }
  } finally {
    await world.close();
  }
}
