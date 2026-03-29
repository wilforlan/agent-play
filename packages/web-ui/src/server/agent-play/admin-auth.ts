import type { NextRequest } from "next/server";
import { agentPlayVerbose } from "./agent-play-debug.js";

export function requireAdminSession(req: NextRequest): Response | null {
  const secret = process.env.AGENT_PLAY_ADMIN_TOKEN;
  if (secret === undefined || secret.length === 0) {
    if (process.env.NODE_ENV === "production") {
      return Response.json(
        { error: "Set AGENT_PLAY_ADMIN_TOKEN to enable admin APIs" },
        { status: 503 }
      );
    }
    return null;
  }
  const auth = req.headers.get("authorization");
  const q = req.nextUrl.searchParams.get("token");
  const ok =
    auth === `Bearer ${secret}` || q === secret;
  if (!ok) {
    agentPlayVerbose("admin-auth", "denied", { path: req.nextUrl.pathname });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  agentPlayVerbose("admin-auth", "ok", { path: req.nextUrl.pathname });
  return null;
}
