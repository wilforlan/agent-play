import { NextRequest } from "next/server";
import { createSession, normalizeEmail, registerUser } from "@/server/auth-store";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    email?: unknown;
    name?: unknown;
    password?: unknown;
  };
  if (
    typeof body.email !== "string" ||
    typeof body.name !== "string" ||
    typeof body.password !== "string"
  ) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  if (body.password.length < 8) {
    return Response.json(
      { error: "password must be at least 8 characters" },
      { status: 400 }
    );
  }
  const result = await registerUser(
    normalizeEmail(body.email),
    body.name.trim(),
    body.password
  );
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  const token = await createSession(result.userId);
  if (token === null) {
    return Response.json({ error: "redis not configured" }, { status: 503 });
  }
  return Response.json({ token, userId: result.userId });
}
