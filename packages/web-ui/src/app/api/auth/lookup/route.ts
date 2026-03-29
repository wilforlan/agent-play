import { NextRequest } from "next/server";
import { lookupEmailExists, normalizeEmail } from "@/server/auth-store";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: unknown };
  if (typeof body.email !== "string" || body.email.trim().length === 0) {
    return Response.json({ error: "invalid email" }, { status: 400 });
  }
  const exists = await lookupEmailExists(normalizeEmail(body.email));
  if (exists === null) {
    return Response.json({ error: "redis not configured" }, { status: 503 });
  }
  return Response.json({ exists });
}
