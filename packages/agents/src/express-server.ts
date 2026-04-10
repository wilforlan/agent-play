import express from "express";
import { loadAgentsPackageEnv } from "./load-agents-env.js";
import { registerBuiltinAgents } from "./register-builtins.js";

loadAgentsPackageEnv();

const sidecarPort = Number(process.env.AGENT_PLAY_BUILTINS_PORT ?? "3100");
const webUiRaw = process.env.AGENT_PLAY_WEB_UI_URL ?? "http://127.0.0.1:3000";
const webUiBaseUrl = webUiRaw.replace(/\/$/, "");
const mainNodeIdEnv = process.env.AGENT_PLAY_MAIN_NODE_ID?.trim();

const app = express();

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    target: webUiBaseUrl,
  });
});

app.listen(sidecarPort, "127.0.0.1", () => {
  console.log(
    `[agent-play/agents] sidecar http://127.0.0.1:${String(sidecarPort)}/health → registering built-ins against ${webUiBaseUrl}`
  );
  void registerBuiltinAgents({
    ...(mainNodeIdEnv !== undefined && mainNodeIdEnv.length > 0
      ? { mainNodeId: mainNodeIdEnv }
      : {}),
  })
    .then(async (world) => {
      console.log("[agent-play/agents] built-in agents registered via SDK");
      await world.hold().for(30 * 60);
    })
    .catch((err: unknown) => {
      console.error("[agent-play/agents] registration failed", err);
    });
});
