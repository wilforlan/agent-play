import express from "express";
import { loadEnv } from "./load-env.js";
import { registerAgents } from "./register-agents.js";

export async function startServer(): Promise<void> {
  loadEnv();
  const port = Number(process.env.PORT ?? "3100");
  const host = process.env.HOST ?? "0.0.0.0";

  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  const { world, registeredAgentIds } = await registerAgents();
  console.log(`Registered ${String(registeredAgentIds.length)} agent(s):`);
  for (const id of registeredAgentIds) {
    console.log(`  - ${id}`);
  }

  app.listen(port, host, () => {
    console.log(`[starter-express] listening on http://${host}:${String(port)}`);
  });

  await world.hold().for(30 * 60);
}
