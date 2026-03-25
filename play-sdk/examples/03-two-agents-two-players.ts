/**
 * Example 03 — Two LangChain agents as two “players”
 *
 * PlayWorld is session-scoped. Each `addPlayer` call registers a distinct `player.id` and its own
 * structure layout (from that agent’s tool set). When you attach invoke for each agent, journeys are
 * tagged with the correct `playerId`, so a multi-agent canvas can render two sprites with
 * independent paths (Multi-Agent Interactions foundation).
 *
 * Run: `tsx -r dotenv/config examples/03-two-agents-two-players.ts`
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

const alphaTool = tool(
  () => "alpha-ok",
  {
    name: "alpha_op",
    description: "Alpha operation",
    schema: z.object({}),
  }
);

const betaTool = tool(
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
  tools: [alphaTool],
  systemPrompt: "Use alpha_op when asked.",
});

const agentBeta = createAgent({
  name: "agent-beta",
  model,
  tools: [betaTool],
  systemPrompt: "Use beta_op when asked.",
});

async function main() {
  const world = new PlayWorld({});
  await world.start();

  const playerA = await world.addPlayer({
    name: "alpha",
    type: "langchain",
    agent: langchainRegistration(agentAlpha),
  });
  const playerB = await world.addPlayer({
    name: "beta",
    type: "langchain",
    agent: langchainRegistration(agentBeta),
  });

  attachLangChainInvoke(agentAlpha, world, playerA.id);
  attachLangChainInvoke(agentBeta, world, playerB.id);

  world.onWorldJourney((u) => {
    console.log(`Journey for ${u.playerId}:`, u.journey.steps.map((s) => s.type));
  });

  await agentAlpha.invoke({
    messages: [{ role: "user", content: "Run alpha operation." }],
  });
  await agentBeta.invoke({
    messages: [{ role: "user", content: "Run beta operation." }],
  });
}

await main();
