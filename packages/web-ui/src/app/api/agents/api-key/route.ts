import { NextRequest } from "next/server";
import { getRepository } from "@/server/get-world";
import { getUserIdFromBearer } from "@/server/auth-session";

export async function GET(_req: NextRequest) {
  const userId = await getUserIdFromBearer(_req);
  if (userId === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const repo = await getRepository();
  if (repo === null) {
    return Response.json({ error: "repository not configured" }, { status: 503 });
  }
  const meta = await repo.getApiKeyMetadata(userId);
  return Response.json(meta);
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromBearer(req);
  if (userId === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const repo = await getRepository();
  if (repo === null) {
    return Response.json({ error: "repository not configured" }, { status: 503 });
  }
  try {
    const result = await repo.createApiKey(userId);
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 400 });
  }
}
