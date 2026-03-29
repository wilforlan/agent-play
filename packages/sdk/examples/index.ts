/**
 * Quick smoke: same idea as `01-langchain-minimal-invoke.ts`.
 * Prefer the numbered examples in this folder (see README.md).
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

const base = process.env.AGENT_PLAY_WEB_UI_URL ?? "http://127.0.0.1:3000";
const world = new RemotePlayWorld({ baseUrl: base });
await world.start();

const player = await world.addPlayer({
  name: "langchain-agent",
  type: "langchain",
  agent: langchainRegistration(agent),
});

await attachLangChainInvoke(agent, world, player.id);

world.onWorldJourney((update) => {
  console.log(
    "Journey:",
    update.path.map((p) => ({ type: p.type, x: p.x, y: p.y }))
  );
});

await agent.invoke({
  messages: [{ role: "user", content: "call demo with q=test" }],
});

await world.close();
