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

export async function executeAgentCapability(options: {
  world: PlayWorldLike;
  payload: IntercomCommandPayload;
}): Promise<{
  channelKey: string;
  intercomAddress: string;
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
  } else {
    await world.recordInteraction({
      playerId: payload.toPlayerId,
      role: "user",
      text: payload.text ?? "",
    });
  }
  return { channelKey: resolvedChannelKey, intercomAddress };
}
