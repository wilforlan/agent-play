import { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  return Response.json(
    { error: "api keys removed in v2; use nodeId + passw" },
    { status: 410 }
  );
}

export async function POST(_req: NextRequest) {
  return Response.json(
    { error: "api keys removed in v2; use nodeId + passw" },
    { status: 410 }
  );
}
