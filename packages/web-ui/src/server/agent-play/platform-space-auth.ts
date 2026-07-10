import type { NextRequest } from "next/server";
import { getRepository } from "@/server/get-world";

export type PlatformSpaceAuthResult =
  | { ok: true; nodeId: string; spaceId: string }
  | { ok: false; response: Response };

export const verifyPlatformSpaceRequest = async (
  req: NextRequest,
  expectedSpaceId: string
): Promise<PlatformSpaceAuthResult> => {
  const repository = await getRepository();
  if (repository === null) {
    return {
      ok: false,
      response: Response.json({ error: "repository unavailable" }, { status: 503 }),
    };
  }
  const nodeId = req.headers.get("x-node-id")?.trim() ?? "";
  const passwHash = req.headers.get("x-node-passw") ?? "";
  if (nodeId.length === 0 || passwHash.length === 0) {
    return {
      ok: false,
      response: Response.json({ error: "missing x-node-id / x-node-passw" }, { status: 401 }),
    };
  }
  if (!(await repository.verifyNodePasswHash({ nodeId, passwHash }))) {
    return {
      ok: false,
      response: Response.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  const row = await repository.getNode(nodeId);
  if (row === null || row.kind !== "space") {
    return {
      ok: false,
      response: Response.json({ error: "space node required" }, { status: 403 }),
    };
  }
  const want = expectedSpaceId.trim();
  if (row.spaceId !== want) {
    return {
      ok: false,
      response: Response.json({ error: "space scope mismatch" }, { status: 403 }),
    };
  }
  return { ok: true, nodeId, spaceId: want };
};
