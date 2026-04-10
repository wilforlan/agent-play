import type { IntercomCommandPayload } from "./shared-intercom.js";
import {
  agentStableKeyFromToPlayerId,
  buildIntercomChannelKey,
  openOrReuseIntercomChannel,
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
}): Promise<{ channelKey: string }> {
  const { world, payload } = options;
  const agentStableKey = agentStableKeyFromToPlayerId(payload.toPlayerId);
  const channelKey = buildIntercomChannelKey({
    humanNodeId: payload.mainNodeId,
    agentStableKey,
  });
  openOrReuseIntercomChannel(channelKey);

  if (payload.kind === "assist") {
    await world.recordInteraction({
      playerId: payload.toPlayerId,
      role: "user",
      text: `[assist] ${payload.toolName ?? ""}(${JSON.stringify(
        payload.args ?? {}
      )})`,
    });
  } else {
    await world.recordInteraction({
      playerId: payload.toPlayerId,
      role: "user",
      text: payload.text ?? "",
    });
  }
  return { channelKey };
}
