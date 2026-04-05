import { NextRequest } from "next/server";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import type { LangChainAgentRegistration } from "@/server/agent-play/play-world.js";
import { getPlayWorld } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseLangChainAgent(v: unknown): LangChainAgentRegistration | null {
  if (!isRecord(v)) return null;
  if (v.type !== "langchain") return null;
  const toolNames = v.toolNames;
  if (!Array.isArray(toolNames)) return null;
  const names = toolNames.filter((x): x is string => typeof x === "string");
  if (names.length !== toolNames.length) return null;
  const assist = v.assistTools;
  let assistTools: LangChainAgentRegistration["assistTools"];
  if (assist !== undefined) {
    if (!Array.isArray(assist)) return null;
    const mapped: NonNullable<LangChainAgentRegistration["assistTools"]> = [];
    for (const row of assist) {
      if (!isRecord(row)) return null;
      if (typeof row.name !== "string" || typeof row.description !== "string") {
        return null;
      }
      const params = row.parameters;
      if (params !== undefined && (typeof params !== "object" || params === null)) {
        return null;
      }
      mapped.push({
        name: row.name,
        description: row.description,
        parameters:
          params !== undefined && isRecord(params)
            ? { ...params }
            : {},
      });
    }
    assistTools = mapped;
  }
  return {
    type: "langchain",
    toolNames: names,
    assistTools,
  };
}

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST agent-play/players", req);
  const rawSid = req.nextUrl.searchParams.get("sid");
  if (rawSid === null || rawSid.trim().length === 0) {
    agentPlayVerbose("api", "players rejected", { reason: "missing sid" });
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = rawSid.trim();
  if (!(await validateAgentPlaySession(sid))) {
    agentPlayVerbose("api", "players rejected", { reason: "invalid sid" });
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const world = await getPlayWorld();
  if (!world.isSessionSid(sid)) {
    agentPlayVerbose("api", "players rejected", { reason: "sid mismatch" });
    return Response.json({ error: "session mismatch" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!isRecord(body)) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  if (typeof body.name !== "string" || typeof body.type !== "string") {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const agent = parseLangChainAgent(body.agent);
  if (agent === null) {
    return Response.json({ error: "invalid agent" }, { status: 400 });
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey : undefined;
  const agentIdRaw = typeof body.agentId === "string" ? body.agentId.trim() : "";
  if (agentIdRaw.length === 0) {
    agentPlayVerbose("api", "players rejected", { reason: "missing agentId" });
    return Response.json({ error: "agentId is required" }, { status: 400 });
  }
  const agentId = agentIdRaw;
  const name = body.name;
  const type = body.type;

  try {
    const registered = await world.addPlayer({
      name,
      type,
      agent,
      apiKey,
      agentId,
    });
    return Response.json({
      playerId: registered.id,
      previewUrl: registered.previewUrl,
      registeredAgent: registered.registeredAgent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    agentPlayVerbose("api", "players error", { msg });
    return Response.json({ error: msg }, { status: 400 });
  }
}
