import { NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  return Response.json(
    {
      error:
        "email registration removed in v2; use node bootstrap to create credentials",
    },
    { status: 410 }
  );
}
