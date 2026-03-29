/**
 * Example 04 — Environment-driven preview URL + optional HTTP forwarder (Express)
 *
 * - `PLAY_PREVIEW_BASE_URL`: if set, used as `PlayWorld.previewBaseUrl` so `previewUrl` / `getPreviewUrl()`
 *   point at your hosted watch UI. If unset, defaults to this server’s watch URL.
 * - `PLAY_API_BASE`: when set, bus events are also POSTed to `{PLAY_API_BASE}/events` (remote bridge).
 *
 * Same Express + `mountExpressPreview` stack as examples 02, 03, 05, 06. Build the preview bundle
 * before opening the browser.
 *
 * Run: `npm run build:preview && npm run example:04`
 * Env: optional `PLAY_PREVIEW_BASE_URL`, `PLAY_API_BASE`, `PORT` (default 3333), `OPENAI_API_KEY`
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

const playApiBase = process.env.PLAY_API_BASE;
const previewBaseUrlFromEnv = process.env.PLAY_PREVIEW_BASE_URL;
const previewBaseUrl =
  previewBaseUrlFromEnv !== undefined && previewBaseUrlFromEnv.length > 0
    ? previewBaseUrlFromEnv
    : `http://127.0.0.1:${PORT}${PREVIEW_BASE}/watch`;

const worldOptions: ConstructorParameters<typeof PlayWorld>[0] = {
  previewBaseUrl,
};
if (playApiBase !== undefined && playApiBase.length > 0) {
  worldOptions.playApiBase = playApiBase;
}

const app = express();
const world = new PlayWorld(worldOptions);

await world.start();

console.log("Session (sid):", world.getSessionId());
console.log("Watch URL (computed):", world.getPreviewUrl());
if (playApiBase !== undefined && playApiBase.length > 0) {
  console.log("HTTP forwarder: events also POST to", `${playApiBase.replace(/\/$/, "")}/events`);
}

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4.1",
});

const noop = tool(
  () => "ok",
  {
    name: "noop",
    description: "No-op for registration demo",
    schema: z.object({}),
  }
);

const agent = createAgent({
  name: "env-demo",
  model,
  tools: [noop],
  systemPrompt: "Reply briefly; noop is only for structure layout.",
});

const player = await world.addPlayer({
  name: "env-demo",
  type: "langchain",
  agent: langchainRegistration(agent),
});

await attachLangChainInvoke(agent, world, player.id);

mountExpressPreview(app, world, { basePath: PREVIEW_BASE });

app.listen(PORT, "127.0.0.1", async () => {
  console.log("Registered player preview:", player.previewUrl);
  console.log(
    `Express: snapshot http://127.0.0.1:${PORT}${PREVIEW_BASE}/snapshot.json?sid=${world.getSessionId()}`
  );
  await agent.invoke({
    messages: [{ role: "user", content: "Say hello in one short sentence." }],
  });
  console.log("Done. Server still running — Ctrl+C to exit.");
});
