/**
 * Example 05 — Express + Multiverse canvas preview (SDK mount)
 *
 * `mountExpressPreview` registers:
 * - `GET /agent-play/watch` — Vite-built preview (custom Canvas 2D engine in `preview-ui/`)
 * - `GET /agent-play/snapshot.json?sid=` — JSON snapshot for reconnect (ISO dates, structures, last journeys)
 * - `GET /agent-play/events?sid=` — SSE (`world:journey`, `world:player_added`, `world:structures`, `world:interaction`)
 *
 * Set `PlayWorld` `previewBaseUrl` to the **watch URL including `/agent-play/watch`** so `player.previewUrl`
 * matches where the canvas loads. The page reads `?sid=` from the query string.
 *
 * Run: `npm run build:preview && npm run example:sse`
 * Env: `OPENAI_API_KEY`, optional `PORT` (default 3333)
 */

import express from "express";
import {
  PlayWorld,
  attachLangChainInvoke,
  langchainRegistration,
  mountExpressPreview,
} from "../src/index.js";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 3333);
const PREVIEW_BASE = "/agent-play";

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4.1",
});

const ping = tool(
  () => "pong",
  {
    name: "ping",
    description: "Health ping",
    schema: z.object({}),
  }
);

const agent = createAgent({
  name: "sse-demo",
  model,
  tools: [ping],
  systemPrompt: "Use ping if the user says ping.",
});

const app = express();
const world = new PlayWorld({
  previewBaseUrl: `http://127.0.0.1:${PORT}${PREVIEW_BASE}/watch`,
});

await world.start();

const player = await world.addPlayer({
  name: "sse-demo",
  type: "langchain",
  agent: langchainRegistration(agent),
});
attachLangChainInvoke(agent, world, player.id);

mountExpressPreview(app, world, { basePath: PREVIEW_BASE });

app.listen(PORT, "127.0.0.1", async () => {
  console.log("Open in browser:", player.previewUrl);
  console.log(
    `Snapshot: http://127.0.0.1:${PORT}${PREVIEW_BASE}/snapshot.json?sid=${world.getSessionId()}`
  );
  await agent.invoke({
    messages: [{ role: "user", content: "ping the tool" }],
  });
});
