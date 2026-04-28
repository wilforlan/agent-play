import { loadEnv } from "./load-env.js";
import { registerAgents } from "./register-agents.js";

export async function startServer(): Promise<void> {
  loadEnv();
  const { world, registeredAgentIds } = await registerAgents();
  console.log(`Registered ${String(registeredAgentIds.length)} agent(s):`);
  for (const id of registeredAgentIds) {
    console.log(`  - ${id}`);
  }
  await world.hold().for(30 * 60);
}
