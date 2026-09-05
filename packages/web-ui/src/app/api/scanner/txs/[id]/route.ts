import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { getSharedRedisClient } from "@/server/get-world";
import { getScannerTx } from "@/server/scanner/scanner-indexer";
import { readLinkedSolanaWallets } from "@/server/scanner/scanner-solana-wallet";
import { apuWalletsFromTx } from "@/app/scanner/scanner-receipt";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  logAgentPlayApi("GET scanner/txs/:id", req, { id });
  const redis = getSharedRedisClient();
  if (redis === null) {
    return Response.json({ error: "Scanner unavailable" }, { status: 503 });
  }
  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const tx = await getScannerTx({ redis, hostId, txId: id });
  if (tx === null) {
    return Response.json({ error: "Transaction not found" }, { status: 404 });
  }
  const wallets = apuWalletsFromTx(tx);
  const solanaWallets = await readLinkedSolanaWallets({
    redis,
    hostId,
    from: wallets.from,
    to: wallets.to,
  });
  return Response.json({ tx, solanaWallets });
}
