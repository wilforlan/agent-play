/**
 * Example 01 — Minimal LangChain + RemotePlayWorld (web-ui server)
 *
 * Start the Next.js app first: `npm run dev -w @agent-play/web-ui` (with Redis/admin if you use API keys).
 *
 * What this shows
 * - One LangChain agent, one session on the server, one player registration over HTTP.
 * - `langchainRegistration(agent)` builds the `{ type: "langchain", toolNames }` payload for `addPlayer`.
 * - `attachLangChainInvoke` wraps `invoke`; writes go to the server via RPC, journeys stream on WebSocket.
 *
 * Run: `tsx -r dotenv/config examples/01-langchain-minimal-invoke.ts`
 * Env: `AGENT_PLAY_WEB_UI_URL` (default http://127.0.0.1:3000), `OPENAI_API_KEY` for real model calls
 */

import {
  RemotePlayWorld,
  attachLangChainInvoke,
  langchainRegistration,
} from "../src/index.js";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4.1",
});

const increment = tool(
  ({ n }: { n: number }) => String(n + 1),
  {
    name: "increment",
    description: "Add one to a number",
    schema: z.object({ n: z.number() }),
  }
);

const agent = createAgent({
  name: "minimal-agent",
  model,
  tools: [increment],
  systemPrompt: "Use increment when the user asks to bump a number.",
});

async function main() {
  const base = process.env.AGENT_PLAY_WEB_UI_URL ?? "http://127.0.0.1:3000";
  const world = new RemotePlayWorld({ baseUrl: base });
  await world.start();

  const player = await world.addPlayer({
    name: "minimal-agent",
    type: "langchain",
    agent: langchainRegistration(agent),
  });

  await attachLangChainInvoke(agent, world, player.id);

  world.onWorldJourney((update) => {
    console.log("[world:journey]", {
      playerId: update.playerId,
      path: update.path.map((step) => ({
        kind: step.type,
        x: "x" in step ? step.x : undefined,
        y: "y" in step ? step.y : undefined,
        label:
          step.type === "structure"
            ? step.toolName
            : step.type === "origin"
              ? "home"
              : "destination",
      })),
    });
  });

  const result = await agent.invoke({
    messages: [{ role: "user", content: "Increment 41 using the tool." }],
  });

  console.log("Result:", result);

  console.log("Preview link:", player.previewUrl);
  await world.close();
}

await main();
