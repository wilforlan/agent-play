import express from "express";
import { registerBuiltinAgents } from "./register-builtins.js";

const sidecarPort = Number(process.env.AGENT_PLAY_BUILTINS_PORT ?? "3100");
const webUiRaw = process.env.AGENT_PLAY_WEB_UI_URL ?? "http://127.0.0.1:3000";
const webUiBaseUrl = webUiRaw.replace(/\/$/, "");
const secretFilePath = process.env.AGENT_PLAY_SECRET_FILE_PATH;
const rootFilePath = process.env.AGENT_PLAY_ROOT_FILE_PATH;

const app = express();

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    target: webUiBaseUrl,
  });
});

app.listen(sidecarPort, "127.0.0.1", () => {
  if (typeof secretFilePath !== "string" || secretFilePath.length === 0) {
    console.error("[agent-play/agents] AGENT_PLAY_SECRET_FILE_PATH is required");
    process.exitCode = 1;
    return;
  }
  console.log(
    `[agent-play/agents] sidecar http://127.0.0.1:${String(sidecarPort)}/health → registering built-ins against ${webUiBaseUrl}`
  );
  void registerBuiltinAgents({
    baseUrl: webUiBaseUrl,
    secretFilePath,
    rootFilePath,
  })
    .then(() => {
      console.log("[agent-play/agents] built-in agents registered via SDK");
    })
    .catch((err: unknown) => {
      console.error("[agent-play/agents] registration failed", err);
    });
});
