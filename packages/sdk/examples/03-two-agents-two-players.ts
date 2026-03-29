/**
 * Example 03 — Two LangChain agents as two “players”
 *
 * PlayWorld is session-scoped. Each `addPlayer` registers a distinct `playerId` and its own
 * structure layout (from that agent’s tool set). `attachLangChainInvoke` per agent tags journeys
 * with the correct `playerId`, so the canvas shows two agents with independent paths.
 *
 * Uses the same Express + `mountExpressPreview` pattern as example 06: static preview, SSE, and
 * `snapshot.json` under `/agent-play`. Open the printed URL after `npm run build:preview`.
 *
 * Run: `npm run build:preview && npm run example:03`
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

const app = express();
const world = new PlayWorld({
  previewBaseUrl: `http://127.0.0.1:${PORT}${PREVIEW_BASE}/watch`,
});

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

await attachLangChainInvoke(agentAlpha, world, playerA.id);
await attachLangChainInvoke(agentBeta, world, playerB.id);

mountExpressPreview(app, world, { basePath: PREVIEW_BASE });

world.onWorldJourney((u) => {
  console.log(`[world:journey] ${u.playerId}:`, u.journey.steps.map((s) => s.type));
});

app.listen(PORT, "127.0.0.1", async () => {
  console.log("Preview (both players share one session):", playerA.previewUrl);
  console.log(
    `Snapshot: http://127.0.0.1:${PORT}${PREVIEW_BASE}/snapshot.json?sid=${world.getSessionId()}`
  );
  await agentAlpha.invoke({
    messages: [{ role: "user", content: "Run alpha operation." }],
  });
  await agentBeta.invoke({
    messages: [{ role: "user", content: "Run beta operation." }],
  });
  console.log("Done. Server still running — open the preview URL or Ctrl+C to exit.");
});
