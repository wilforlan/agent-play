import type { PeerCallRecord, PlayerWallet } from "@agent-play/sdk/browser";

type SdkRpcResult = Record<string, unknown>;

const postPeerCallRpc = async (input: {
  sid: string;
  op: string;
  payload: Record<string, unknown>;
}): Promise<SdkRpcResult> => {
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: input.op, payload: input.payload }),
  });
  const json = (await res.json()) as SdkRpcResult;
  if (!res.ok) {
    const error =
      typeof json.error === "string" ? json.error : `http_${String(res.status)}`;
    throw new Error(error);
  }
  return json;
};

export const peerCallInvite = async (input: {
  sid: string;
  callerId: string;
  calleeId: string;
  callerDisplayName?: string;
}): Promise<{ ok: true; call: PeerCallRecord } | { ok: false; error: string }> => {
  const json = await postPeerCallRpc({
    sid: input.sid,
    op: "peerCallInvite",
    payload: {
      callerId: input.callerId,
      calleeId: input.calleeId,
      ...(input.callerDisplayName !== undefined
        ? { callerDisplayName: input.callerDisplayName }
        : {}),
    },
  });
  if (json.ok === true && json.call !== undefined) {
    return { ok: true, call: json.call as PeerCallRecord };
  }
  return {
    ok: false,
    error: typeof json.error === "string" ? json.error : "UNKNOWN",
  };
};

export const peerCallAccept = async (input: {
  sid: string;
  callId: string;
  calleeId: string;
}): Promise<{
  ok: true;
  call: PeerCallRecord;
  billing?: { ok: boolean; wallet?: PlayerWallet };
} | { ok: false; error: string }> => {
  const json = await postPeerCallRpc({
    sid: input.sid,
    op: "peerCallAccept",
    payload: { callId: input.callId, calleeId: input.calleeId },
  });
  if (json.ok === true && json.call !== undefined) {
    return {
      ok: true,
      call: json.call as PeerCallRecord,
      billing: json.billing as { ok: boolean; wallet?: PlayerWallet } | undefined,
    };
  }
  return {
    ok: false,
    error: typeof json.error === "string" ? json.error : "UNKNOWN",
  };
};

export const peerCallDecline = async (input: {
  sid: string;
  callId: string;
  calleeId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  const json = await postPeerCallRpc({
    sid: input.sid,
    op: "peerCallDecline",
    payload: { callId: input.callId, calleeId: input.calleeId },
  });
  if (json.ok === true) {
    return { ok: true };
  }
  return {
    ok: false,
    error: typeof json.error === "string" ? json.error : "UNKNOWN",
  };
};

export const peerCallHangup = async (input: {
  sid: string;
  callId: string;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  const json = await postPeerCallRpc({
    sid: input.sid,
    op: "peerCallHangup",
    payload: { callId: input.callId, actorId: input.actorId },
  });
  if (json.ok === true) {
    return { ok: true };
  }
  return {
    ok: false,
    error: typeof json.error === "string" ? json.error : "UNKNOWN",
  };
};

export const peerTalkSessionTick = async (input: {
  sid: string;
  callerId: string;
  calleeId: string;
  callId: string;
}): Promise<
  | { ok: true; wallet?: PlayerWallet }
  | { ok: false; error: "NO_SESSION" | "INSUFFICIENT_FUNDS" | string }
> => {
  const json = await postPeerCallRpc({
    sid: input.sid,
    op: "peerTalkSessionTick",
    payload: {
      callerId: input.callerId,
      calleeId: input.calleeId,
      callId: input.callId,
    },
  });
  if (json.ok === true) {
    return {
      ok: true,
      wallet: json.wallet as PlayerWallet | undefined,
    };
  }
  return {
    ok: false,
    error: typeof json.error === "string" ? json.error : "UNKNOWN",
  };
};
