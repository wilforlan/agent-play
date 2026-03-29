import { NextRequest } from "next/server";
import { getPlayWorld } from "@/server/get-world";

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid");
  if (sid === null || sid.length === 0) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const world = await getPlayWorld();
  if (!world.isSessionSid(sid)) {
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  return Response.json(world.getSnapshotJson());
}
