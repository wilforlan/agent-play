import express from "express";
import {
  PlayWorld,
  createRedisAgentRepository,
  mountExpressPreview,
} from "../src/index.js";

const PORT = Number(process.env.PORT ?? 3333);
const PREVIEW_BASE = "/agent-play";
const redisUrl = process.env.REDIS_URL;

const repository =
  typeof redisUrl === "string" && redisUrl.length > 0
    ? createRedisAgentRepository({
        redisUrl,
        hostId: process.env.AGENT_PLAY_HOST_ID ?? "default",
      })
    : null;

const world = new PlayWorld({
  previewBaseUrl: `http://127.0.0.1:${PORT}${PREVIEW_BASE}/watch`,
  repository: repository ?? undefined,
});

await world.start();

const app = express();
mountExpressPreview(app, world, { basePath: PREVIEW_BASE });

app.listen(PORT, "127.0.0.1", () => {
  const sid = world.getSessionId();
  console.log(
    `Preview: http://127.0.0.1:${PORT}${PREVIEW_BASE}/watch?sid=${sid}`
  );
  console.log(
    `Snapshot: http://127.0.0.1:${PORT}${PREVIEW_BASE}/snapshot.json?sid=${sid}`
  );
});

process.on("SIGINT", () => {
  void Promise.resolve()
    .then(() => repository?.close())
    .finally(() => {
      process.exit(0);
    });
});
