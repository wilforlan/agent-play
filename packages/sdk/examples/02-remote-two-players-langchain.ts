/**
 * Example 02 — Two LangChain agents as two players on one remote session
 *
 * Same architecture as example 01: **RemotePlayWorld** talks to **@agent-play/web-ui** over HTTP
 * (`/api/agent-play/session`, `/api/agent-play/players`, `/api/agent-play/sdk/rpc`). One session
 * (`sid`) holds multiple players; each `addAgent` uses a required **`nodeId`** (agent node id from **`agent-play create`** when
 * using a repository, or the example defaults locally). The server stores it as `agentId`, and the SDK validates the node id with
 * `/api/nodes/validate` before calling `/api/agent-play/players`.
 *
 * Open the printed preview URL once: both avatars share the same world and session.
 *
 * Prerequisites: web-ui running (`npm run dev -w @agent-play/web-ui`). With Redis-backed agents,
 * run `agent-play bootstrap-node`, then `agent-play create` twice (max 2 agents
 * per node), pass each agent **`nodeId`** on **`addAgent`**, and set **`AGENT_PLAY_ROOT_KEY`** /
 * **`AGENT_PLAY_NODE_PASSW`** for **`RemotePlayWorld`** (same credentials for both registrations).
 *
 * Run: `tsx -r dotenv/config examples/02-remote-two-players-langchain.ts`
 * Env: default **`~/.agent-play/credentials.json`** (or `AGENT_PLAY_CREDENTIALS_PATH`), optional `AGENT_PLAY_WEB_UI_URL` /
 * `AGENT_PLAY_ROOT_KEY` / `AGENT_PLAY_NODE_PASSW` overrides, `AGENT_PLAY_HOLD_SECONDS` (default 3600),
 * `AGENT_PLAY_AGENT_NODE_ID_*` when using a registered repository.
 */

import {
  RemotePlayWorld,
  langchainRegistration,
  loadAgentPlayCredentialsFileFromPathSync,
  loadRootKey,
  resolveAgentPlayCredentialsPath,
} from "../src/index.js";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const EXAMPLE_MAIN_NODE_ID =
  "810be53fb0153087438401ecd63e72e56701d43307955d57af196ccae5cdbf81";

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "unused-registration-only",
  model: "gpt-4.1",
});

const chatToolAlpha = tool(
  ({ message }: { message: string }) => `alpha:${message}`,
  {
    name: "chat_tool",
    description: "Chat for alpha",
    schema: z.object({ message: z.string() }),
  }
);

const chatToolBeta = tool(
  ({ message }: { message: string }) => `beta:${message}`,
  {
    name: "chat_tool",
    description: "Chat for beta",
    schema: z.object({ message: z.string() }),
  }
);

const alphaOp = tool(
  () => "alpha-ok",
  {
    name: "alpha_op",
    description: "Alpha operation",
    schema: z.object({}),
  }
);

const betaOp = tool(
  () => "beta-ok",
  {
    name: "beta_op",
    description: "Beta operation",
    schema: z.object({}),
  }
);

const agentAlpha = createAgent({
  name: "agent-alpha",
  model,
  tools: [chatToolAlpha, alphaOp],
  systemPrompt: "Use alpha_op when the user asks for the alpha operation.",
});

const agentBeta = createAgent({
  name: "agent-beta",
  model,
  tools: [chatToolBeta, betaOp],
  systemPrompt: "Use beta_op when the user asks for the beta operation.",
});

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

  const world = new RemotePlayWorld({
    baseUrl: base,
    nodeCredentials: { rootKey, passw },
  });
  await world.connect({ mainNodeId: EXAMPLE_MAIN_NODE_ID });

  const nodeIdA =
    process.env.AGENT_PLAY_AGENT_NODE_ID_ALPHA?.trim() ??
    process.env.AGENT_PLAY_AGENT_ID_ALPHA?.trim() ??
    "example-local-agent-alpha";
  const nodeIdB =
    process.env.AGENT_PLAY_AGENT_NODE_ID_BETA?.trim() ??
    process.env.AGENT_PLAY_AGENT_ID_BETA?.trim() ??
    "example-local-agent-beta";

  const playerA = await world.addAgent({
    name: "alpha",
    type: "langchain",
    agent: langchainRegistration(agentAlpha),
    nodeId: nodeIdA,
  });
  const playerB = await world.addAgent({
    name: "beta",
    type: "langchain",
    agent: langchainRegistration(agentBeta),
    nodeId: nodeIdB,
  });

  console.log("Session id:", world.getSessionId());
  console.log("Watch (both players):", playerA.previewUrl);
  console.log("Player B id:", playerB.id);
  console.log(`Holding the process for ${String(holdSeconds)}s (set AGENT_PLAY_HOLD_SECONDS to change).`);

  await world.hold().for(holdSeconds);
  await world.close();
}

await main();
