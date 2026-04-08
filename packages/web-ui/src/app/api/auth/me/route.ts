import { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return Response.json(
    { error: "email/session profile endpoint removed in v2" },
    { status: 410 }
  );
}
