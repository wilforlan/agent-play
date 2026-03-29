import type { NextRequest } from "next/server";
import { getUserIdForSession } from "@/server/auth-store";

export async function getUserIdFromBearer(
  req: NextRequest
): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (auth === null || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (token.length === 0) return null;
  return getUserIdForSession(token);
}
