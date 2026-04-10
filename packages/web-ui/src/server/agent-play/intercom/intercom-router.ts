import {
  parseIntercomCommandPayload,
  type IntercomCommandPayload,
} from "./shared-intercom.js";
import { dispatchIntercomCommand } from "./dispatch-command.js";
import type { SessionStore } from "../session-store.js";

type PlayWorldLike = {
  recordInteraction: (input: {
    playerId: string;
    role: "user" | "assistant" | "tool";
    text: string;
  }) => Promise<unknown>;
};

export async function handleIntercomCommand(options: {
  store: SessionStore;
  world: PlayWorldLike;
  payload: unknown;
}): Promise<IntercomCommandPayload> {
  const parsed = parseIntercomCommandPayload(options.payload);
  await dispatchIntercomCommand({
    store: options.store,
    world: options.world,
    payload: parsed,
  });
  return parsed;
}
