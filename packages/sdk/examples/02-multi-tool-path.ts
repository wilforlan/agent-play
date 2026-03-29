/**
 * Example 02 — Multi-tool journey (maps to “Live Tracks”)
 *
 * When the model issues multiple tool calls in one turn, the journey extractor produces one
 * `structure` step per tool, in order. Each step gets coordinates from `layoutStructuresFromTools`
 * (stable grid by sorted tool name), so the preview can interpolate motion: Home → Tool A → Tool B → Home.
 *
 * This follows the typical flow: HumanMessage → AIMessage with tool_calls → ToolMessages → final AIMessage.
 *
 * Express + `mountExpressPreview` matches examples 03–06: build the preview UI first, then open the
 * printed watch URL.
 *
 * Run: `npm run build:preview && npm run example:02`
 * Env: `OPENAI_API_KEY`, optional `PORT` (default 3333)
 */

import express from "express";
import {
  attachLangChainInvoke,
  langchainRegistration,
} from "../src/index.js";
import { PlayWorld } from "../../web-ui/src/server/agent-play/play-world.js";
import { mountExpressPreview } from "../../web-ui/src/server/agent-play/preview/mount-express-preview.js";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 3333);
const PREVIEW_BASE = "/agent-play";

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

const app = express();
const world = new PlayWorld({
  previewBaseUrl: `http://127.0.0.1:${PORT}${PREVIEW_BASE}/watch`,
});

await world.start();

const player = await world.addPlayer({
  name: "langchain-agent",
  type: "langchain",
  agent: langchainRegistration(agent),
});

await attachLangChainInvoke(agent, world, player.id);

mountExpressPreview(app, world, { basePath: PREVIEW_BASE });

world.onWorldJourney((u) => {
  console.log("Ordered path for the 2D map:", u.path);
});

app.listen(PORT, "127.0.0.1", async () => {
  console.log("Open in browser:", player.previewUrl);
  console.log(
    `Snapshot: http://127.0.0.1:${PORT}${PREVIEW_BASE}/snapshot.json?sid=${world.getSessionId()}`
  );
  await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "Search for information about the capital of France and calculate 2 + 2.",
      },
    ],
  });
  console.log("Done. Server still running — open the preview URL or Ctrl+C to exit.");
});
