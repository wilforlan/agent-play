import { describe, expect, it, vi } from "vitest";
import type { AgentAudioEvent, RegisteredPlayer } from "@agent-play/sdk";
import type { RemotePlayWorld } from "@agent-play/sdk";
import { attachP2aAudioBridge } from "./attach-p2a-audio-bridge.js";
import type { P2aRealtimePort } from "./p2a-realtime-port.js";

function createFakeWorld() {
  const sendIntercomResponse = vi.fn(
    async (_payload: Parameters<RemotePlayWorld["sendIntercomResponse"]>[0]) => {}
  );
  const world = { sendIntercomResponse } as unknown as RemotePlayWorld;
  return { world, sendIntercomResponse };
}

function sampleAudioEvent(): AgentAudioEvent {
  return {
    requestId: "req-1",
    mainNodeId: "main-1",
    fromPlayerId: "human-1",
    toPlayerId: "agent-player-1",
    audio: {
      encoding: "pcm16",
      dataBase64: Buffer.from([0, 0]).toString("base64"),
    },
    playAudio: {
      sendAudioBase64: async () => {},
    },
  };
}

function createMockRealtime(): P2aRealtimePort {
  let onAudioDelta: ((b64: string) => void) | undefined;
  let onResponseDone: (() => void) | undefined;
  return {
    setHandlers(h) {
      onAudioDelta = h.onAudioDelta;
      onResponseDone = h.onResponseDone;
    },
    async appendIntercomAudio() {
      onAudioDelta?.("Zg==");
      onAudioDelta?.("Zg==");
      onResponseDone?.();
    },
    async close() {},
  };
}

describe("attachP2aAudioBridge", () => {
  it("sends stream then completed intercom responses when realtime emits audio deltas", async () => {
    const { world, sendIntercomResponse } = createFakeWorld();
    const mockRt = createMockRealtime();
    const registered = { id: "agent-player-1" } as RegisteredPlayer;

    const bridge = attachP2aAudioBridge({
      world,
      registered,
      openaiApiKey: "sk-test",
      realtimeFactory: () => mockRt,
    });
    await bridge.handleAgentAudioEvent(sampleAudioEvent());
    await bridge.dispose();

    const statuses = sendIntercomResponse.mock.calls.map((c) => c[0].status);
    expect(statuses.filter((s) => s === "stream").length).toBeGreaterThanOrEqual(1);
    expect(statuses.includes("completed")).toBe(true);
    const completed = sendIntercomResponse.mock.calls.find((c) => c[0].status === "completed")?.[0];
    expect(completed?.requestId).toBe("req-1");
    expect(completed?.toPlayerId).toBe("human-1");
    expect(completed?.fromPlayerId).toBe("agent-player-1");
    const result = completed?.result as { audio?: { dataBase64?: string } } | undefined;
    expect(typeof result?.audio?.dataBase64).toBe("string");
    expect((result?.audio?.dataBase64 ?? "").length).toBeGreaterThan(0);
  });
});
