/**
 * Example 02 — Multi-tool journey (maps to “Live Tracks”)
 *
 * When the model issues multiple tool calls in one turn, the journey extractor produces one
 * `structure` step per tool, in order. Each step gets coordinates from `layoutStructuresFromTools`
 * (stable grid by sorted tool name), so the admin UI can interpolate motion: Home → Tool A → Tool B → Home.
 *
 * This matches the message flow documented in ../about.md: HumanMessage → AIMessage with
 * tool_calls → ToolMessages → final AIMessage with natural-language content.
 *
 * Run: `tsx -r dotenv/config examples/02-multi-tool-path.ts`
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

const search = tool(
  ({ query }: { query: string }) => `Results for: ${query}`,
  {
    name: "search",
    description: "Search for information",
    schema: z.object({
      query: z.string().describe("The query to search for"),
    }),
  }
);

const calculate = tool(
  ({ expression }: { expression: string }) => `Result of: ${expression}`,
  {
    name: "calculate",
    description: "Evaluate a math expression",
    schema: z.object({
      expression: z.string().describe("The expression"),
    }),
  }
);

const agent = createAgent({
  name: "langchain-agent",
  model,
  tools: [search, calculate],
  systemPrompt:
    "You are a helpful assistant that can search and calculate. Use tools when needed.",
});

async function main() {
  const world = new PlayWorld({});
  await world.start();

  const player = await world.addPlayer({
    name: "langchain-agent",
    type: "langchain",
    agent: langchainRegistration(agent),
  });

  attachLangChainInvoke(agent, world, player.id);

  world.onWorldJourney((u) => {
    console.log("Ordered path for the 2D map:", u.path);
  });

  await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "Search for information about the capital of France and calculate 2 + 2.",
      },
    ],
  });
}

await main();
