import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getPlayWorld } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";
import { getUserIdFromBearer } from "@/server/auth-session";

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST mcp/register", req);
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) {
    agentPlayVerbose("api", "mcp/register rejected", { reason: "missing sid" });
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = raw.trim();
  if (!(await validateAgentPlaySession(sid))) {
    agentPlayVerbose("api", "mcp/register rejected", { reason: "invalid sid" });
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const world = await getPlayWorld();
  const userId = await getUserIdFromBearer(req);
  if (userId === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { name?: unknown; url?: unknown };
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const id = await world.registerMCP({
    name: body.name.trim(),
    url: typeof body.url === "string" && body.url.length > 0 ? body.url : undefined,
  });
  agentPlayVerbose("api", "mcp/register ok", { id });
  return Response.json({ id });
}
