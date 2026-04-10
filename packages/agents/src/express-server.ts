import express from "express";
import {
  loadAgentPlayCredentialsFileFromPathSync,
  loadRootKey,
  resolveAgentPlayCredentialsPath,
} from "@agent-play/node-tools";
import { registerBuiltinAgents } from "./register-builtins.js";

const sidecarPort = Number(process.env.AGENT_PLAY_BUILTINS_PORT ?? "3100");
const webUiRaw = process.env.AGENT_PLAY_WEB_UI_URL ?? "http://127.0.0.1:3000";
const webUiBaseUrl = webUiRaw.replace(/\/$/, "");
const rootKeyEnv = process.env.AGENT_PLAY_ROOT_KEY?.trim();
const passwEnv = process.env.AGENT_PLAY_NODE_PASSW;

const app = express();

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    target: webUiBaseUrl,
  });
});

app.listen(sidecarPort, "127.0.0.1", () => {
  const credFile = loadAgentPlayCredentialsFileFromPathSync(
    resolveAgentPlayCredentialsPath()
  );
  const hasEnvCreds =
    rootKeyEnv !== undefined &&
    rootKeyEnv.length > 0 &&
    typeof passwEnv === "string" &&
    passwEnv.length > 0;
  let nodeCredentials: { rootKey: string; passw: string };
  if (hasEnvCreds) {
    nodeCredentials = { rootKey: rootKeyEnv, passw: passwEnv };
  } else if (credFile !== null) {
    nodeCredentials = { rootKey: loadRootKey(), passw: credFile.passw };
  } else {
    console.error(
      "[agent-play/agents] run `agent-play create-main-node` (~/.agent-play/credentials.json) or set AGENT_PLAY_ROOT_KEY + AGENT_PLAY_NODE_PASSW"
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `[agent-play/agents] sidecar http://127.0.0.1:${String(sidecarPort)}/health → registering built-ins against ${webUiBaseUrl}`
  );
  void registerBuiltinAgents({
    baseUrl: webUiBaseUrl,
    nodeCredentials,
  })
    .then(() => {
      console.log("[agent-play/agents] built-in agents registered via SDK");
    })
    .catch((err: unknown) => {
      console.error("[agent-play/agents] registration failed", err);
    });
});
