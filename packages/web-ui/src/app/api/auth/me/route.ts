import { NextRequest } from "next/server";
import { getUserProfile } from "@/server/auth-store";
import { getUserIdFromBearer } from "@/server/auth-session";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromBearer(req);
  if (userId === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const profile = await getUserProfile(userId);
  if (profile === null) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json({ userId, email: profile.email, name: profile.name });
}
