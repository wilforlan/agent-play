import { NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  return Response.json(
    { error: "email/session login removed in v2; use node bootstrap credentials" },
    { status: 410 }
  );
}
