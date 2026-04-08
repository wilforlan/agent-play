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
 * - If the server uses registered agents (Redis + repository), run `agent-play bootstrap-node`,
 *   then `agent-play create`, then pass **`agentId`** and set
 *   **`AGENT_PLAY_SECRET_FILE_PATH`** on **`RemotePlayWorld`** (see SDK `AddPlayerInput` and
 *   `RemotePlayWorldOptions` JSDoc).
 * - `OPENAI_API_KEY` is only needed if you extend this script to call the model; registration-only
 *   runs use a placeholder below.
 *
 * Run (from `packages/sdk` or via `npm run example` at repo root):
 *   `tsx -r dotenv/config examples/01-remote-web-ui-langchain.ts`
 *
 * Env: `AGENT_PLAY_WEB_UI_URL`, `AGENT_PLAY_SECRET_FILE_PATH`, `AGENT_PLAY_HOLD_SECONDS` (default 3600),
 * `AGENT_PLAY_AGENT_ID` when using a registered agent repository, optional `OPENAI_API_KEY`.
 */

import { RemotePlayWorld, langchainRegistration } from "../src/index.js";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

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

async function main() {
  const base = process.env.AGENT_PLAY_WEB_UI_URL ?? "http://127.0.0.1:3000";
  const secretFilePath = process.env.AGENT_PLAY_SECRET_FILE_PATH;
  if (secretFilePath === undefined || secretFilePath.length === 0) {
    throw new Error("AGENT_PLAY_SECRET_FILE_PATH is required");
  }
  const holdSeconds = Number(process.env.AGENT_PLAY_HOLD_SECONDS ?? 3600);

  const world = new RemotePlayWorld({ baseUrl: base, secretFilePath });
  world.onClose(() => {
    console.log("RemotePlayWorld closed.");
  });
  await world.connect();

  const agentId =
    process.env.AGENT_PLAY_AGENT_ID?.trim() ?? "example-local-agent-1";

  const player = await world.addPlayer({
    name: "remote-demo",
    type: "langchain",
    agent: langchainRegistration(agent),
    agentId,
  });

  console.log("Open the watch UI (session is server-side; UI resolves session via API):");
  console.log(player.previewUrl);
  console.log(`Holding the process for ${String(holdSeconds)}s (set AGENT_PLAY_HOLD_SECONDS to change).`);

  await world.hold().for(holdSeconds);
  await world.close();
}

await main();
