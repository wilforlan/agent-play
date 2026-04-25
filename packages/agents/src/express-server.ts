import express from "express";
import {
  loadAgentPlayCredentialsFileFromPathSync,
  resolveAgentPlayCredentialsPath,
} from "@agent-play/node-tools";
import { getBuiltinsListenOptions } from "./builtins-server-listen.js";
import { loadAgentsPackageEnv } from "./load-agents-env.js";
import { registerBuiltinAgents } from "./register-builtins.js";

loadAgentsPackageEnv();

const { host: listenHost, port: sidecarPort } = getBuiltinsListenOptions();
const mainNodeIdEnv = process.env.AGENT_PLAY_MAIN_NODE_ID?.trim();

const credentialsForDisplay = loadAgentPlayCredentialsFileFromPathSync(
  resolveAgentPlayCredentialsPath()
);
const envWebUi = process.env.AGENT_PLAY_WEB_UI_URL?.trim();
const registrationTarget =
  (envWebUi !== undefined && envWebUi.length > 0
    ? envWebUi
    : credentialsForDisplay?.serverUrl ?? "http://127.0.0.1:3000"
  ).replace(/\/$/, "");

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    target: registrationTarget,
  });
});

app.listen(sidecarPort, listenHost, () => {
  console.log(
    `[agent-play/agents] sidecar http://${listenHost}:${String(sidecarPort)}/health → registering built-ins against ${registrationTarget}`
  );
  void registerBuiltinAgents({
    ...(mainNodeIdEnv !== undefined && mainNodeIdEnv.length > 0
      ? { mainNodeId: mainNodeIdEnv, enableP2a: "on" }
      : { enableP2a: "on" }),
  })
    .then(async (world) => {
      console.log("[agent-play/agents] built-in agents registered via SDK");
      await world.hold().for(30 * 60);
    })
    .catch((err: unknown) => {
      console.error("[agent-play/agents] registration failed", err);
    });
});
