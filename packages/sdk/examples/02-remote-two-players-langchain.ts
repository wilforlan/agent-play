/**
 * Example 02 — Two LangChain agents as two players on one remote session
 *
 * Same architecture as example 01: **RemotePlayWorld** talks to **@agent-play/web-ui** over HTTP
 * (`/api/agent-play/session`, `/api/agent-play/players`, `/api/agent-play/sdk/rpc`). One session
 * (`sid`) holds multiple players; each `addPlayer` uses a required **`agentId`** (from **`agent-play create`** when
 * using a repository, or the example defaults locally).
 *
 * Open the printed preview URL once: both avatars share the same world and session.
 *
 * Prerequisites: web-ui running (`npm run dev -w @agent-play/web-ui`). With Redis-backed agents,
 * run `agent-play bootstrap-node`, then `agent-play create` twice (max 2 agents
 * per node), pass each **`agentId`** on **`addPlayer`**, and set **`AGENT_PLAY_SECRET_FILE_PATH`** on
 * **`RemotePlayWorld`** (same secret file for both).
 *
 * Run: `tsx -r dotenv/config examples/02-remote-two-players-langchain.ts`
 * Env: `AGENT_PLAY_WEB_UI_URL`, `AGENT_PLAY_SECRET_FILE_PATH`, `AGENT_PLAY_HOLD_SECONDS` (default 3600),
 * `AGENT_PLAY_AGENT_ID_ALPHA` / `AGENT_PLAY_AGENT_ID_BETA` when using a registered repository.
 */

import { RemotePlayWorld, langchainRegistration } from "../src/index.js";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

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
  const base = process.env.AGENT_PLAY_WEB_UI_URL ?? "http://127.0.0.1:3000";
  const secretFilePath = process.env.AGENT_PLAY_SECRET_FILE_PATH;
  if (secretFilePath === undefined || secretFilePath.length === 0) {
    throw new Error("AGENT_PLAY_SECRET_FILE_PATH is required");
  }
  const holdSeconds = Number(process.env.AGENT_PLAY_HOLD_SECONDS ?? 3600);

  const world = new RemotePlayWorld({ baseUrl: base, secretFilePath });
  await world.connect();

  const agentIdA =
    process.env.AGENT_PLAY_AGENT_ID_ALPHA?.trim() ?? "example-local-agent-alpha";
  const agentIdB =
    process.env.AGENT_PLAY_AGENT_ID_BETA?.trim() ?? "example-local-agent-beta";

  const playerA = await world.addPlayer({
    name: "alpha",
    type: "langchain",
    agent: langchainRegistration(agentAlpha),
    agentId: agentIdA,
  });
  const playerB = await world.addPlayer({
    name: "beta",
    type: "langchain",
    agent: langchainRegistration(agentBeta),
    agentId: agentIdB,
  });

  console.log("Session id:", world.getSessionId());
  console.log("Watch (both players):", playerA.previewUrl);
  console.log("Player B id:", playerB.id);
  console.log(`Holding the process for ${String(holdSeconds)}s (set AGENT_PLAY_HOLD_SECONDS to change).`);

  await world.hold().for(holdSeconds);
  await world.close();
}

await main();
