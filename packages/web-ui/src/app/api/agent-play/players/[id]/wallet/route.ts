/**
 * @packageDocumentation
 * @module @agent-play/web-ui/api/agent-play/players/[id]/wallet
 *
 * Per-player wallet read endpoint.
 *
 * @remarks
 * Delegates to {@link SessionStore.getPlayerWallet}, which lazily seeds a fresh
 * wallet at {@link DEFAULT_PLAYER_WALLET_BALANCE_USD} ($10) on first read. The
 * route is sid-gated like the other agent-play APIs.
 *
 * Returned `powerUps` are spendable at runtime: stored wallet APU minus active
 * Econext savings locks (`econext:{hostId}:account:{playerId}:vaults`). Stored
 * wallet balances are not mutated — locks are subtracted only on the client
 * view, matching Econext's available-after-lock model without double-subtract.
 *
 * @see ../../../../../../server/agent-play/redis-session-store.ts for the
 *      atomic seed implementation.
 */
import { NextRequest } from "next/server";
import { logAgentPlayApi } from "@/server/agent-play/log-agent-play-api";
import { resolveClientPlayerWallet } from "@/server/agent-play/resolve-client-player-wallet";
import { getSessionStore } from "@/server/get-world";
import { validateAgentPlaySession } from "@/server/agent-play/session-validation";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  logAgentPlayApi("GET players/[id]/wallet", req);
  const sidRaw = req.nextUrl.searchParams.get("sid");
  if (sidRaw === null || sidRaw.trim().length === 0) {
    return Response.json({ error: "missing sid" }, { status: 400 });
  }
  const sid = sidRaw.trim();
  if (!(await validateAgentPlaySession(sid))) {
    return Response.json({ error: "invalid sid" }, { status: 403 });
  }
  const { id } = await context.params;
  const playerId = id?.trim() ?? "";
  if (playerId.length === 0) {
    return Response.json({ error: "missing player id" }, { status: 400 });
  }
  const store = getSessionStore();
  const stored = await store.getPlayerWallet(playerId);
  const wallet = await resolveClientPlayerWallet({
    wallet: stored,
    playerId,
  });
  return Response.json(
    { wallet },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
