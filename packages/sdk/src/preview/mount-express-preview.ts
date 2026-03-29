import type { Express, Request, Response } from "express";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorldJourneyUpdate } from "../@types/world.js";
import { agentPlayDebug } from "../lib/agent-play-debug.js";
import { serializeWorldJourneyUpdate } from "../lib/preview-serialize.js";
import type { PlayWorld } from "../lib/play-world.js";
import {
  PLAYER_ADDED_EVENT,
  WORLD_AGENT_SIGNAL_EVENT,
  WORLD_INTERACTION_EVENT,
  WORLD_JOURNEY_EVENT,
  WORLD_STRUCTURES_EVENT,
} from "../lib/play-transport.js";

export type MountExpressPreviewOptions = {
  basePath?: string;
  assetsDir?: string;
};

const mountPreviewDir = dirname(fileURLToPath(import.meta.url));

export function defaultPreviewAssetsDir(): string {
  return join(mountPreviewDir, "..", "..", "..", "play-ui", "dist");
}

function requireValidSid(
  world: PlayWorld,
  req: Request,
  res: Response
): string | null {
  const sid = req.query.sid;
  if (typeof sid !== "string" || sid.length === 0) {
    agentPlayDebug("mount-preview", "requireValidSid missing sid", {
      path: req.path,
    });
    res.status(400).json({ error: "missing sid" });
    return null;
  }
  if (!world.isSessionSid(sid)) {
    agentPlayDebug("mount-preview", "requireValidSid invalid sid", {
      path: req.path,
    });
    res.status(403).json({ error: "invalid sid" });
    return null;
  }
  return sid;
}

export function mountExpressPreview(
  app: Express,
  world: PlayWorld,
  options: MountExpressPreviewOptions = {}
): void {
  const base = (options.basePath ?? "/agent-play").replace(/\/$/, "");
  const assetsDir = options.assetsDir ?? defaultPreviewAssetsDir();

  app.get(`${base}/snapshot.json`, (req, res) => {
    agentPlayDebug("mount-preview", "GET snapshot.json");
    if (requireValidSid(world, req, res) === null) return;
    res.json(world.getSnapshotJson());
  });

  app.get(`${base}/events`, (req, res) => {
    agentPlayDebug("mount-preview", "GET events SSE open");
    if (requireValidSid(world, req, res) === null) return;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const ping = setInterval(() => {
      res.write(": ping\n\n");
    }, 30000);

    const onJourney = (payload: unknown) => {
      const update = payload as WorldJourneyUpdate;
      const data = serializeWorldJourneyUpdate(update);
      res.write(
        `event: ${WORLD_JOURNEY_EVENT}\ndata: ${JSON.stringify(data)}\n\n`
      );
    };

    const onPlayer = (payload: unknown) => {
      res.write(
        `event: ${PLAYER_ADDED_EVENT}\ndata: ${JSON.stringify(payload)}\n\n`
      );
    };

    const onStructures = (payload: unknown) => {
      res.write(
        `event: ${WORLD_STRUCTURES_EVENT}\ndata: ${JSON.stringify(payload)}\n\n`
      );
    };

    const onInteraction = (payload: unknown) => {
      res.write(
        `event: ${WORLD_INTERACTION_EVENT}\ndata: ${JSON.stringify(payload)}\n\n`
      );
    };

    const onAgentSignal = (payload: unknown) => {
      res.write(
        `event: ${WORLD_AGENT_SIGNAL_EVENT}\ndata: ${JSON.stringify(payload)}\n\n`
      );
    };

    world.on(WORLD_JOURNEY_EVENT, onJourney);
    world.on(PLAYER_ADDED_EVENT, onPlayer);
    world.on(WORLD_STRUCTURES_EVENT, onStructures);
    world.on(WORLD_INTERACTION_EVENT, onInteraction);
    world.on(WORLD_AGENT_SIGNAL_EVENT, onAgentSignal);

    req.on("close", () => {
      agentPlayDebug("mount-preview", "GET events SSE closed");
      clearInterval(ping);
      world.off(WORLD_JOURNEY_EVENT, onJourney);
      world.off(PLAYER_ADDED_EVENT, onPlayer);
      world.off(WORLD_STRUCTURES_EVENT, onStructures);
      world.off(WORLD_INTERACTION_EVENT, onInteraction);
      world.off(WORLD_AGENT_SIGNAL_EVENT, onAgentSignal);
    });
  });

  app.options(`${base}/proximity-action`, (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
  });

  app.post(
    `${base}/proximity-action`,
    express.json(),
    (req: Request, res: Response) => {
      agentPlayDebug("mount-preview", "POST proximity-action");
      const sid = requireValidSid(world, req, res);
      if (sid === null) return;
      const body = req.body as {
        fromPlayerId?: unknown;
        toPlayerId?: unknown;
        action?: unknown;
      };
      if (
        typeof body.fromPlayerId !== "string" ||
        typeof body.toPlayerId !== "string" ||
        typeof body.action !== "string"
      ) {
        res.status(400).json({ error: "invalid body" });
        return;
      }
      const action = body.action;
      if (
        action !== "assist" &&
        action !== "chat" &&
        action !== "zone" &&
        action !== "yield"
      ) {
        res.status(400).json({ error: "invalid action" });
        return;
      }
      try {
        world.recordProximityAction({
          fromPlayerId: body.fromPlayerId,
          toPlayerId: body.toPlayerId,
          action,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(400).json({ error: msg });
        return;
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json({ ok: true });
    }
  );

  app.get(`${base}/watch`, (_req, res) => {
    agentPlayDebug("mount-preview", "GET watch");
    res.sendFile(join(assetsDir, "index.html"));
  });

  app.use(base, express.static(assetsDir, { index: false }));
}
