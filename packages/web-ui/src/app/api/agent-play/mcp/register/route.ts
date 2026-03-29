import { NextRequest } from "next/server";
import { getPlayWorld } from "@/server/get-world";
import { getUserIdFromBearer } from "@/server/auth-session";

export async function POST(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid");
  if (sid === null || sid.length === 0) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const world = await getPlayWorld();
  if (!world.isSessionSid(sid)) {
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const userId = await getUserIdFromBearer(req);
  if (userId === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { name?: unknown; url?: unknown };
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const id = world.registerMCP({
    name: body.name.trim(),
    url: typeof body.url === "string" && body.url.length > 0 ? body.url : undefined,
  });
  return Response.json({ id });
}
