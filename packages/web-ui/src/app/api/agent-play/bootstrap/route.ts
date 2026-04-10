import { getRepository } from "@/server/get-world";

export async function GET(): Promise<Response> {
  const repository = await getRepository();
  if (repository === null) {
    return Response.json({ error: "repository unavailable" }, { status: 503 });
  }
  return Response.json({ rootKey: repository.getGenesisNodeId() });
}
