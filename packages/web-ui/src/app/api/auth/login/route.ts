import { NextRequest } from "next/server";
import { createSession, loginUser, normalizeEmail } from "@/server/auth-store";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    email?: unknown;
    password?: unknown;
  };
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const session = await loginUser(normalizeEmail(body.email), body.password);
  if (session === null) {
    return Response.json({ error: "invalid email or password" }, { status: 401 });
  }
  const token = await createSession(session.userId);
  if (token === null) {
    return Response.json({ error: "redis not configured" }, { status: 503 });
  }
  return Response.json({ token, userId: session.userId });
}
