import { NextRequest } from "next/server";
import {
  createNodeAccount,
  parseCreateNodeBody,
} from "@/server/agent-play/create-node-account";
import { getRepository } from "@/server/get-world";

export async function POST(req: NextRequest) {
  const repository = await getRepository();
  if (repository === null) {
    return Response.json(
      { error: "repository not configured" },
      { status: 503 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = parseCreateNodeBody(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const result = await createNodeAccount(repository, parsed.passw);
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("already exists") ? 409 : 400;
    return Response.json({ error: msg }, { status });
  }
}
