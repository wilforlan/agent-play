/**
 * Example 01 — LangChain agent against the hosted web UI (session + RPC)
 *
 * App shape today: **@agent-play/web-ui** serves `/api/agent-play/session`, player registration,
 * SDK RPC, SSE events, and the watch canvas at `/agent-play/watch`. This script uses only the
 * public SDK (`RemotePlayWorld` + `langchainRegistration`); it does not embed Express or `PlayWorld`.
 *
 * Prerequisites
 * - Start the app: `npm run dev -w @agent-play/web-ui` (from repo root). Optional: Redis for
 *   durable sessions; see docs for `REDIS_URL`.
 * - Run **`agent-play create-main-node`** so **`~/.agent-play/credentials.json`** exists (human **`passw`**).
 *   This script loads it via **`loadAgentPlayCredentialsFileFromPathSync`**, with **`AGENT_PLAY_ROOT_KEY`** /
 *   **`AGENT_PLAY_NODE_PASSW`** as optional overrides. **`passw`** is hashed with **`hashNodePassword`** (see
 *   **`nodeCredentialsMaterialFromHumanPassphrase`** in **@agent-play/node-tools**) before node id derivation.
 *   For agent nodes under a main account, **`connect({ mainNodeId })`** uses the parent main node id (see
 *   `EXAMPLE_MAIN_NODE_ID` below).
 * - If the server uses registered agents (Redis + repository), run `agent-play bootstrap-node`,
 *   then `agent-play create-agent-node`, and pass **`AGENT_PLAY_AGENT_NODE_ID`** for `addAgent`.
 *   The SDK validates that agent node id via `/api/nodes/validate` before registration.
 * - `OPENAI_API_KEY` is only needed if you extend this script to call the model; registration-only
 *   runs use a placeholder below.
 *
 * Run (from `packages/sdk` or via `npm run example` at repo root):
 *   `tsx -r dotenv/config examples/01-remote-web-ui-langchain.ts`
 *
 * Env: `AGENT_PLAY_WEB_UI_URL`, optional `AGENT_PLAY_CREDENTIALS_PATH`, optional overrides `AGENT_PLAY_ROOT_KEY` /
 * `AGENT_PLAY_NODE_PASSW`, `AGENT_PLAY_HOLD_SECONDS` (default 3600), `AGENT_PLAY_AGENT_NODE_ID` when using Redis,
 * optional `OPENAI_API_KEY`.
 */

import {
  RemotePlayWorld,
  type IntercomToolExecutor,
  langchainRegistration,
  loadAgentPlayCredentialsFileFromPathSync,
  loadRootKey,
  resolveAgentPlayCredentialsPath,
} from "../src/index.js";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

/** Example parent main node id (replace with your deployment’s main id when using agent credentials). */
const EXAMPLE_MAIN_NODE_ID =
  "810be53fb0153087438401ecd63e72e56701d43307955d57af196ccae5cdbf81";

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "unused-registration-only",
  model: "gpt-4.1",
});

const chatTool = tool(
  ({ message }: { message: string }) => `echo:${message}`,
  {
    name: "chat_tool",
    description: "Record chat for the play world",
    schema: z.object({ message: z.string() }),
  }
);

const increment = tool(
  ({ n }: { n: number }) => String(n + 1),
  {
    name: "increment",
    description: "Add one to a number",
    schema: z.object({ n: z.number() }),
  }
);

const agent = createAgent({
  name: "remote-demo",
  model,
  tools: [chatTool, increment],
  systemPrompt: "Use increment when the user asks to bump a number.",
});

const executeIntercomTool: IntercomToolExecutor = ({ toolName, args }) => {
  if (toolName === "chat_tool") {
    const text = typeof args.text === "string" ? args.text : "";
    return { message: `echo:${text}` };
  }
  if (toolName === "increment") {
    const n = args.n;
    const num = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(num)) {
      throw new Error("increment: n must be a finite number");
    }
    return { result: String(num + 1) };
  }
  throw new Error(`unknown tool for intercom: ${toolName}`);
};

async function main() {
  const stored = loadAgentPlayCredentialsFileFromPathSync(
    resolveAgentPlayCredentialsPath()
  );
  const rootKey =
    process.env.AGENT_PLAY_ROOT_KEY?.trim() ??
    (stored === null ? "" : loadRootKey());
  const passw =
    typeof process.env.AGENT_PLAY_NODE_PASSW === "string" &&
    process.env.AGENT_PLAY_NODE_PASSW.length > 0
      ? process.env.AGENT_PLAY_NODE_PASSW
      : (stored?.passw ?? "");
  const base = (
    process.env.AGENT_PLAY_WEB_UI_URL ??
    stored?.serverUrl ??
    "http://127.0.0.1:3000"
  ).replace(/\/$/, "");
  if (rootKey.length === 0 || passw.length === 0) {
    throw new Error(
      "Missing credentials: run `agent-play create-main-node` or set AGENT_PLAY_ROOT_KEY + AGENT_PLAY_NODE_PASSW"
    );
  }
  const holdSeconds = Number(process.env.AGENT_PLAY_HOLD_SECONDS ?? 3600);

  const world = new RemotePlayWorld();
  let closeIntercom: (() => void) | undefined;
  world.onClose(() => {
    closeIntercom?.();
    console.log("RemotePlayWorld closed.");
  });
  await world.connect({ mainNodeId: EXAMPLE_MAIN_NODE_ID });

  const agentNodeId =
    process.env.AGENT_PLAY_AGENT_NODE_ID?.trim() ??
    process.env.AGENT_PLAY_AGENT_ID?.trim() ??
    "4fda036ff28e27a1df7529ebd765bc23dec4228b1e9be3fff4cea57bbc9b8dc4";

  const player = await world.addAgent({
    name: "francis",
    type: "langchain",
    agent: langchainRegistration(agent),
    nodeId: agentNodeId,
  });

  closeIntercom = world.subscribeIntercomCommands({
    playerId: player.id,
    executeTool: executeIntercomTool,
  }).close;

  console.log("Open the watch UI (session is server-side; UI resolves session via API):");
  console.log(player.previewUrl);
  console.log(`Holding the process for ${String(holdSeconds)}s (set AGENT_PLAY_HOLD_SECONDS to change).`);

  await world.hold().for(holdSeconds);
  await world.close();
}

await main();
