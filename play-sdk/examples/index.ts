/**
 * Quick smoke: same idea as `01-langchain-minimal-invoke.ts`.
 * Prefer the numbered examples in this folder (see README.md).
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

const agent = createAgent({
  name: "stub",
  model,
  tools: [
    tool(
      ({ q }: { q: string }) => `ok:${q}`,
      {
        name: "demo",
        description: "demo",
        schema: z.object({ q: z.string() }),
      }
    ),
  ],
  systemPrompt: "You are a demo agent.",
});

const worldOptions =
  process.env.PLAY_PREVIEW_BASE_URL !== undefined
    ? { previewBaseUrl: process.env.PLAY_PREVIEW_BASE_URL }
    : {};
const world = new PlayWorld(worldOptions);
await world.start();

const player = await world.addPlayer({
  name: "langchain-agent",
  type: "langchain",
  agent: langchainRegistration(agent),
});

attachLangChainInvoke(agent, world, player.id);

world.onWorldJourney((update) => {
  console.log(
    "Journey:",
    update.path.map((p) => ({ type: p.type, x: p.x, y: p.y }))
  );
});

await agent.invoke({
  messages: [{ role: "user", content: "call demo with q=test" }],
});
