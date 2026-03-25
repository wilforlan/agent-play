/**
 * Example 04 — Environment-driven preview URL + optional HTTP forwarder
 *
 * - `PLAY_PREVIEW_BASE_URL`: merged into `PlayWorld` so `RegisteredPlayer.previewUrl` (and
 *   `getPreviewUrl()`) points your hosted “watch-only” UI at the right origin, with `sid` in the query.
 * - `playApiBase` on `PlayWorld`: when set, every `world:journey` and `world:player_added` event is
 *   also POSTed as JSON to `{playApiBase}/events` (stub contract for a remote agent-play service).
 *
 * Single-server mental model: your Node service hosts agents; the SDK is imported at startup;
 * keys and URLs come from env; admins open the generated link without controlling the agents.
 *
 * Run: `tsx -r dotenv/config examples/04-env-and-preview-link.ts`
 */

import { PlayWorld, langchainRegistration } from "../src/index.js";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const previewBaseUrl = process.env.PLAY_PREVIEW_BASE_URL;
const playApiBase = process.env.PLAY_API_BASE;

const worldOptions: ConstructorParameters<typeof PlayWorld>[0] = {};
if (previewBaseUrl !== undefined) worldOptions.previewBaseUrl = previewBaseUrl;
if (playApiBase !== undefined) worldOptions.playApiBase = playApiBase;

const world = new PlayWorld(worldOptions);
await world.start();

console.log("Session (sid):", world.getSessionId());
console.log("Watch URL:", world.getPreviewUrl());

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

console.log("Player preview:", player.previewUrl);
