import type { IntercomCommandPayload } from "./shared-intercom.js";
import {
  agentStableKeyFromToPlayerId,
  buildIntercomAddress,
  buildIntercomChannelKey,
  openOrReuseIntercomChannel,
  parseIntercomAddressParts,
  parseIntercomAddress,
} from "./shared-intercom.js";

type PlayWorldLike = {
  recordInteraction: (input: {
    playerId: string;
    role: "user" | "assistant" | "tool";
    text: string;
  }) => Promise<unknown>;
};

type RealtimeWebrtcPayload = {
  clientSecret: string;
  expiresAt?: string;
  model: string;
  voice?: string;
};

async function mintRealtimeWebrtcPayload(agentName: string): Promise<RealtimeWebrtcPayload> {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (apiKey.length === 0) {
    throw new Error("OPENAI_API_KEY is required for realtime credential requests");
  }
  const model = "gpt-realtime";
  const voice = "marin";
  const instructions = `You are ${agentName}. Keep responses short, clear, and conversational unless asked for detail.`;
  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model,
        instructions,
        audio: { output: { voice } },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`openai realtime client secret failed: ${res.status} ${text}`);
  }
  const parsed = JSON.parse(text) as Record<string, unknown>;
  if (typeof parsed.value !== "string" || parsed.value.length === 0) {
    throw new Error("openai realtime client secret failed: missing value");
  }
  return {
    clientSecret: parsed.value,
    model,
    voice,
    ...(typeof parsed.expires_at === "string" && parsed.expires_at.length > 0
      ? { expiresAt: parsed.expires_at }
      : {}),
  };
}

export async function executeAgentCapability(options: {
  world: PlayWorldLike;
  payload: IntercomCommandPayload;
}): Promise<{
  channelKey: string;
  intercomAddress: string;
  realtimeWebrtc?: RealtimeWebrtcPayload;
}> {
  const { world, payload } = options;
  const agentStableKey = agentStableKeyFromToPlayerId(payload.toPlayerId);
  const channelKey = buildIntercomChannelKey({
    humanNodeId: payload.mainNodeId,
    agentStableKey,
  });
  const resolvedChannelKey = (() => {
    if (payload.intercomAddress === undefined) {
      return channelKey;
    }
    const parts = parseIntercomAddressParts(payload.intercomAddress);
    if (parts.protocol === "ap-intercom") {
      return buildIntercomChannelKey({
        humanNodeId: parseIntercomAddress(payload.intercomAddress),
        agentStableKey,
      });
    }
    return buildIntercomChannelKey({
      humanNodeId: parts.value,
      agentStableKey,
    });
  })();
  const intercomAddress =
    payload.intercomAddress ?? buildIntercomAddress(payload.mainNodeId);
  openOrReuseIntercomChannel(resolvedChannelKey);

  if (payload.kind === "assist") {
    await world.recordInteraction({
      playerId: payload.toPlayerId,
      role: "user",
      text: `[assist] ${payload.toolName ?? ""}(${JSON.stringify(
        payload.args ?? {}
      )})`,
    });
  } else if (payload.kind === "realtime") {
    await world.recordInteraction({
      playerId: payload.toPlayerId,
      role: "user",
      text: "[realtime] request fresh webrtc client secret",
    });
    return {
      channelKey: resolvedChannelKey,
      intercomAddress,
      realtimeWebrtc: await mintRealtimeWebrtcPayload(payload.toPlayerId),
    };
  } else {
    await world.recordInteraction({
      playerId: payload.toPlayerId,
      role: "user",
      text: payload.text ?? "",
    });
  }
  return { channelKey: resolvedChannelKey, intercomAddress };
}
