import { NextRequest } from "next/server";
import type { WorldLayoutBoundsField } from "@agent-play/sdk";
import { agentPlayVerbose } from "@/server/agent-play/agent-play-debug";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getPlayWorld } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";
import { buildSnapshotWorldLayout } from "@/server/agent-play/preview-serialize";

const ALLOWED_FIELDS: ReadonlySet<WorldLayoutBoundsField> = new Set([
  "minX",
  "minY",
  "maxX",
  "maxY",
]);

function isAllowedField(value: unknown): value is WorldLayoutBoundsField {
  return typeof value === "string" && ALLOWED_FIELDS.has(value as WorldLayoutBoundsField);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req: NextRequest) {
  logAgentPlayApi("GET world-layout/bounds", req);
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = raw.trim();
  if (!(await validateAgentPlaySession(sid))) {
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const world = await getPlayWorld();
  const layout = world.getWorldLayout();
  return Response.json(
    { worldLayout: buildSnapshotWorldLayout(layout) },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}

export async function POST(req: NextRequest) {
  logAgentPlayApi("POST world-layout/bounds", req);
  const raw = req.nextUrl.searchParams.get("sid");
  if (raw === null || raw.trim().length === 0) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = raw.trim();
  if (!(await validateAgentPlaySession(sid))) {
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    field?: unknown;
    value?: unknown;
  };
  if (!isAllowedField(body.field)) {
    return Response.json(
      { error: "invalid field; expected one of minX, minY, maxX, maxY" },
      { status: 400 }
    );
  }
  if (typeof body.value !== "number" || !Number.isFinite(body.value)) {
    return Response.json(
      { error: "invalid value; expected a finite number" },
      { status: 400 }
    );
  }
  const world = await getPlayWorld();
  try {
    const nextLayout = await world.updateLayoutBoundsField({
      field: body.field,
      value: body.value,
    });
    agentPlayVerbose("api", "world-layout/bounds ok", {
      field: body.field,
      value: body.value,
      rev: nextLayout.rev,
    });
    return Response.json(
      { worldLayout: buildSnapshotWorldLayout(nextLayout) },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    agentPlayVerbose("api", "world-layout/bounds error", { msg });
    return Response.json({ error: msg }, { status: 400 });
  }
}
