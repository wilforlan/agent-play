import { describe, expect, it, vi } from "vitest";
import type { RegisteredPlayer } from "@agent-play/sdk";
import type { RemotePlayWorld } from "@agent-play/sdk";
import { attachP2aAudioBridge } from "./attach-p2a-audio-bridge.js";

function createFakeWorld() {
  const sendIntercomResponse = vi.fn(
    async (_payload: Parameters<RemotePlayWorld["sendIntercomResponse"]>[0]) => {}
  );
  const world = { sendIntercomResponse } as unknown as RemotePlayWorld;
  return { world, sendIntercomResponse };
}

describe("attachP2aAudioBridge", () => {
  it("is a no-op bridge in deprecated package", async () => {
    const { world, sendIntercomResponse } = createFakeWorld();
    const registered = { id: "agent-player-1" } as RegisteredPlayer;

    const bridge = attachP2aAudioBridge({
      world,
      registered,
      openaiApiKey: "sk-test",
    });
    await bridge.dispose();

    expect(sendIntercomResponse).not.toHaveBeenCalled();
  });
});
