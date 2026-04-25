import express from "express";
import {
  loadAgentPlayCredentialsFileFromPathSync,
  resolveAgentPlayCredentialsPath,
} from "@agent-play/node-tools";
import { getBuiltinsListenOptions } from "./builtins-server-listen.js";
import { loadAgentsPackageEnv } from "./load-agents-env.js";
import { registerBuiltinAgents } from "./register-builtins.js";
import { mintOpenAiRealtimeClientSecret } from "./openai-realtime-client-secret.js";

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

app.post("/v1/realtime/client-secret", async (req, res) => {
  if (process.env.P2A_WEBRTC_ENABLED !== "1") {
    res.status(503).json({ error: "P2A_WEBRTC_DISABLED" });
    return;
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (apiKey.length === 0) {
    res.status(503).json({ error: "OPENAI_API_KEY_MISSING" });
    return;
  }
  const body = req.body as Record<string, unknown> | undefined;
  const agentName =
    typeof body?.agentName === "string" ? body.agentName : undefined;
  const model = typeof body?.model === "string" ? body.model : undefined;
  const voice = typeof body?.voice === "string" ? body.voice : undefined;
  const instructions =
    typeof body?.instructions === "string" ? body.instructions : undefined;
  try {
    const minted = await mintOpenAiRealtimeClientSecret({
      apiKey,
      agentName,
      model,
      voice,
      instructions,
    });
    res.json(minted);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(502).json({ error: "MINT_FAILED", message });
  }
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
