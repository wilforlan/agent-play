// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { PeerCallRecord } from "@agent-play/sdk/browser";
import { createPeerCallController } from "./peer-call-controller.js";
import type { PreviewRingerEngine } from "./preview-ringer-engine.js";

vi.mock("./peer-call-client.js", () => ({
  peerCallInvite: vi.fn(),
  peerCallAccept: vi.fn(),
  peerCallDecline: vi.fn(),
  peerCallHangup: vi.fn(async () => ({ ok: true })),
  peerTalkSessionTick: vi.fn(),
}));

vi.mock("./peer-voice-session.js", async () => {
  const actual = await vi.importActual<typeof import("./peer-voice-session.js")>(
    "./peer-voice-session.js"
  );
  return {
    ...actual,
    createPeerVoiceSession: vi.fn(),
  };
});

import { peerCallInvite } from "./peer-call-client.js";
import { createPeerVoiceSession } from "./peer-voice-session.js";

const mockInvite = vi.mocked(peerCallInvite);
const mockCreateVoice = vi.mocked(createPeerVoiceSession);

const baseCall = (overrides?: Partial<PeerCallRecord>): PeerCallRecord => ({
  callId: "call-1",
  sid: "sid-1",
  callerId: "caller-1",
  calleeId: "callee-1",
  status: "ringing",
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("createPeerCallController", () => {
  let parent: HTMLElement;
  let ringer: PreviewRingerEngine;
  let onCallUiChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    parent = document.createElement("div");
    document.body.appendChild(parent);
    onCallUiChange = vi.fn();
    ringer = {
      playIncomingMessage: vi.fn(async () => {}),
      startIncomingCallRing: vi.fn(async () => {}),
      stopIncomingCallRing: vi.fn(),
    };
    mockCreateVoice.mockReset();
    mockInvite.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    parent.remove();
  });

  it("keeps End label and starts the HUD timer when the caller connects", async () => {
    let resolveStart: (() => void) | null = null;
    const handleSignal = vi.fn(async () => {});
    const stop = vi.fn();
    mockCreateVoice.mockReturnValue({
      start: () =>
        new Promise<void>((resolve) => {
          resolveStart = resolve;
        }),
      handleSignal,
      stop,
      isActive: () => true,
    });

    const controller = createPeerCallController({
      parent,
      getSid: () => "sid-1",
      getApiBase: () => "",
      getLocalHumanId: () => "caller-1",
      getPeerDisplayName: (id) => id,
      isAgentPttActive: () => false,
      stopAgentPtt: () => undefined,
      ringer,
      onCallUiChange,
    });

    mockInvite.mockResolvedValue({
      ok: true,
      call: baseCall({ status: "ringing" }),
    });
    controller.setNearestHumanId("callee-1");
    await controller.startCallWithNearest();
    expect(controller.getPeerTalkLabel()).toBe("End");
    expect(onCallUiChange).toHaveBeenCalled();

    controller.handleSseEvent("world:peer-call-state", {
      call: baseCall({ status: "active" }),
    });

    expect(controller.getPeerTalkLabel()).toBe("End");
    expect(controller.isInCall()).toBe(true);
    expect(onCallUiChange).toHaveBeenCalledTimes(2);

    const hud = parent.querySelector(".preview-peer-call-hud");
    expect(hud).not.toBeNull();
    const timeBefore = hud?.textContent ?? "";

    await vi.advanceTimersByTimeAsync(1000);
    const timeAfterOneSecond = hud?.textContent ?? "";
    expect(timeAfterOneSecond).not.toBe(timeBefore);

    resolveStart?.();
    await Promise.resolve();
    controller.destroy();
  });

  it("routes signals to the voice session while start is still pending", async () => {
    let resolveStart: (() => void) | null = null;
    const handleSignal = vi.fn(async () => {});
    mockCreateVoice.mockReturnValue({
      start: () =>
        new Promise<void>((resolve) => {
          resolveStart = resolve;
        }),
      handleSignal,
      stop: vi.fn(),
      isActive: () => true,
    });

    const controller = createPeerCallController({
      parent,
      getSid: () => "sid-1",
      getApiBase: () => "",
      getLocalHumanId: () => "caller-1",
      getPeerDisplayName: (id) => id,
      isAgentPttActive: () => false,
      stopAgentPtt: () => undefined,
      ringer,
    });

    mockInvite.mockResolvedValue({
      ok: true,
      call: baseCall({ status: "ringing" }),
    });
    controller.setNearestHumanId("callee-1");
    await controller.startCallWithNearest();
    controller.handleSseEvent("world:peer-call-state", {
      call: baseCall({ status: "active" }),
    });
    expect(controller.isInCall()).toBe(true);
    expect(mockCreateVoice).toHaveBeenCalled();

    controller.handleSseEvent("world:peer-call-signal", {
      callId: "call-1",
      fromHumanId: "callee-1",
      toHumanId: "caller-1",
      kind: "answer",
      payload: { type: "answer", sdp: "v=0" },
    });

    expect(handleSignal).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "answer" })
    );

    resolveStart?.();
    controller.destroy();
  });
});
