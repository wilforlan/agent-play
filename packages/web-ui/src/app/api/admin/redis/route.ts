import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { requireAdminSession } from "@/server/agent-play/admin-auth";
import { buildRedisInspectionPayload } from "@/server/agent-play/redis-inspect";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getRedisSessionStore, getSharedRedisClient } from "@/server/get-world";

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET admin/redis", req, { format: req.nextUrl.searchParams.get("format") });
  const denied = requireAdminSession(req);
  if (denied !== null) return denied;

  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json(
      { error: "REDIS_URL not configured" },
      { status: 503 }
    );
  }

  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const keyPrefix = req.nextUrl.searchParams.get("prefix") ?? "agent-play:";
  const maxKeys = Math.min(
    500,
    Math.max(1, Number(req.nextUrl.searchParams.get("maxKeys") ?? "80"))
  );
  const valuePreviewMax = Math.min(
    256_000,
    Math.max(256, Number(req.nextUrl.searchParams.get("preview") ?? "24_000"))
  );

  const inspection = await buildRedisInspectionPayload(redis, {
    keyPrefix,
    maxKeys,
    valuePreviewMax,
  });

  const store = getRedisSessionStore();
  const sessionMeta =
    store !== null ? await store.getPublishedMetadata() : null;

  const payload = {
    hostId,
    sessionMeta,
    inspection,
  };

  agentPlayVerbose("api", "admin/redis payload built", {
    keyCount: inspection.keys.length,
    keysScanned: inspection.keysScanned,
  });

  const format = req.nextUrl.searchParams.get("format");
  if (format === "html") {
    const embedded = JSON.stringify(JSON.stringify(payload));
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Agent Play — Redis</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/json-formatter-js@2.5.23/dist/json-formatter.min.css"/>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    header { padding: 16px 20px; border-bottom: 1px solid #334155; background: #1e293b; }
    h1 { margin: 0; font-size: 1.1rem; font-weight: 600; }
    .sub { color: #94a3b8; font-size: 0.85rem; margin-top: 6px; }
    #root { padding: 16px 20px 40px; }
    .jf-value, .jf-key { color: inherit !important; }
  </style>
</head>
<body>
  <header>
    <h1>Redis inspection</h1>
    <p class="sub">agent-play keys · json-formatter-js · ioredis SCAN</p>
  </header>
  <div id="root"></div>
  <script src="https://cdn.jsdelivr.net/npm/json-formatter-js@2.5.23/dist/json-formatter.umd.min.js"></script>
  <script>
    (function () {
      var data = JSON.parse(${embedded});
      var el = document.getElementById("root");
      var Formatter = globalThis.JSONFormatter;
      if (typeof Formatter === "function") {
        var fmt = new Formatter(data, 2, { hoverPreviewEnabled: true, hoverPreviewArrayCount: 12 });
        el.appendChild(fmt.render());
      } else {
        el.innerHTML = "<pre style=\\"white-space:pre-wrap\\">" + JSON.stringify(data, null, 2) + "</pre>";
      }
    })();
  </script>
</body>
</html>`;
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return Response.json(payload);
}
