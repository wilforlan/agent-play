import { getPlayWorld } from "@/server/get-world";

export async function GET() {
  const world = await getPlayWorld();
  return Response.json({ sid: world.getSessionId() });
}
