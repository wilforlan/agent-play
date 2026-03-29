/**
 * Example 01 — Minimal LangChain + PlayWorld
 *
 * What this shows
 * - One LangChain agent, one PlayWorld session, one player registration.
 * - `langchainRegistration(agent)` builds the `{ type: "langchain", toolNames }` payload that
 *   `addPlayer` needs before the canvas knows which “structures” (tool nodes) exist.
 * - `attachLangChainInvoke` replaces `agent.invoke` in place: after the real model run completes,
 *   the SDK reads `result.messages`, extracts a journey (origin → tools → destination), and
 *   emits `world:journey` on the in-memory bus so a watcher (or SSE bridge) can animate movement.
 *
 * Run: `tsx -r dotenv/config examples/01-langchain-minimal-invoke.ts`
 * Env: `OPENAI_API_KEY` (optional if your model is mocked; required for real calls)
 */

import {
  PlayWorld,
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
  const world = new PlayWorld({});
  await world.start();

  const player = await world.addPlayer({
    name: "minimal-agent",
    type: "langchain",
    agent: langchainRegistration(agent),
  });

  attachLangChainInvoke(agent, world, player.id);

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

  console.log("Preview link for a hosted watch UI:", player.previewUrl);
}

await main();
