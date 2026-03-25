import { existsSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { PlayWorld } from "../lib/play-world.js";
import { mountExpressPreview, defaultPreviewAssetsDir } from "./mount-express-preview.js";

describe("mountExpressPreview", () => {
  const assetsDir = defaultPreviewAssetsDir();

  beforeAll(() => {
    if (!existsSync(join(assetsDir, "index.html"))) {
      throw new Error(
        "preview-ui not built: run `npm run build:preview` from play-sdk root"
      );
    }
  });

  it("returns 400 for snapshot without sid", async () => {
    const app = express();
    const world = new PlayWorld({});
    await world.start();
    mountExpressPreview(app, world, { basePath: "/agent-play", assetsDir });
    const res = await request(app).get("/agent-play/snapshot.json");
    expect(res.status).toBe(400);
  });

  it("returns 403 for snapshot with wrong sid", async () => {
    const app = express();
    const world = new PlayWorld({});
    await world.start();
    mountExpressPreview(app, world, { basePath: "/agent-play", assetsDir });
    const res = await request(app)
      .get("/agent-play/snapshot.json")
      .query({ sid: "not-the-session" });
    expect(res.status).toBe(403);
  });

  it("returns snapshot JSON for valid sid", async () => {
    const app = express();
    const world = new PlayWorld({});
    await world.start();
    const sid = world.getSessionId();
    await world.addPlayer({
      name: "p1",
      type: "langchain",
      agent: { type: "langchain", toolNames: ["t"] },
    });
    mountExpressPreview(app, world, { basePath: "/agent-play", assetsDir });
    const res = await request(app)
      .get("/agent-play/snapshot.json")
      .query({ sid });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ sid, players: expect.any(Array) });
    expect(res.body.worldMap).toMatchObject({
      bounds: expect.any(Object),
      structures: expect.any(Array),
    });
    expect(res.body.players[0]).toMatchObject({
      playerId: expect.any(String),
      name: "p1",
    });
  });

  it("returns 403 for events with invalid sid", async () => {
    const app = express();
    const world = new PlayWorld({});
    await world.start();
    mountExpressPreview(app, world, { basePath: "/agent-play", assetsDir });
    const res = await request(app)
      .get("/agent-play/events")
      .query({ sid: "invalid" });
    expect(res.status).toBe(403);
  });
});
