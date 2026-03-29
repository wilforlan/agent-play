import type { NextRequest } from "next/server";
import { agentPlayVerbose } from "./agent-play-debug.js";

export function logAgentPlayApi(
  routeLabel: string,
  req: NextRequest,
  extra?: Record<string, unknown>
): void {
  const u = req.nextUrl;
  const sid = u.searchParams.get("sid");
  agentPlayVerbose("api", routeLabel, {
    method: req.method,
    path: u.pathname,
    query: u.search,
    sidPresent: sid !== null && sid.length > 0,
    sidLength: sid?.length ?? 0,
    sidPrefix: sid !== null && sid.length > 0 ? `${sid.slice(0, 8)}…` : null,
    ...extra,
  });
}

export function logAgentPlayApiResult(
  routeLabel: string,
  result: { status: number; detail?: Record<string, unknown> }
): void {
  agentPlayVerbose("api", `${routeLabel} → response`, {
    status: result.status,
    ...result.detail,
  });
}
