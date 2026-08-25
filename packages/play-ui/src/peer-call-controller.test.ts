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

import { buildPeerCallInviteNotification } from "@agent-play/intercom";
import type { PlayerWallet } from "@agent-play/sdk/browser";
import {
  peerCallAccept,
  peerCallInvite,
  peerTalkSessionTick,
} from "./peer-call-client.js";
import { createPeerVoiceSession } from "./peer-voice-session.js";

const mockInvite = vi.mocked(peerCallInvite);
const mockAccept = vi.mocked(peerCallAccept);
const mockTick = vi.mocked(peerTalkSessionTick);
const mockCreateVoice = vi.mocked(createPeerVoiceSession);

const callerWallet = (overrides?: Partial<PlayerWallet>): PlayerWallet => ({
  playerId: "caller-1",
  balanceUsd: 5,
  currency: "USD",
  updatedAt: "2026-08-12T12:00:05.000Z",
  powerUps: 0,
  ...overrides,
});

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
    mockAccept.mockReset();
    mockTick.mockReset();
    mockCreateVoice.mockReturnValue({
      start: async () => {},
      handleSignal: vi.fn(async () => {}),
      stop: vi.fn(),
      isActive: () => true,
    });
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

  it("does not apply the caller wallet to the callee HUD on accept", async () => {
    const onWalletUpdate = vi.fn();
    const controller = createPeerCallController({
      parent,
      getSid: () => "sid-1",
      getApiBase: () => "",
      getLocalHumanId: () => "callee-1",
      getPeerDisplayName: (id) => id,
      isAgentPttActive: () => false,
      stopAgentPtt: () => undefined,
      ringer,
      onWalletUpdate,
    });

    mockAccept.mockResolvedValue({
      ok: true,
      call: baseCall({ status: "active" }),
      billing: { ok: true, wallet: callerWallet() },
    });

    await controller.acceptInvite(
      buildPeerCallInviteNotification({
        id: "n-invite",
        createdAt: "2026-08-12T12:00:00.000Z",
        callerId: "caller-1",
        calleeId: "callee-1",
        callId: "call-1",
      })
    );

    expect(mockAccept).toHaveBeenCalled();
    expect(onWalletUpdate).not.toHaveBeenCalled();
    controller.destroy();
  });

  it("applies the caller wallet from a billing tick to the caller HUD", async () => {
    const onWalletUpdate = vi.fn();
    mockTick.mockResolvedValue({
      ok: true,
      wallet: callerWallet({ balanceUsd: 4.98 }),
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
      onWalletUpdate,
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
    await Promise.resolve();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(15_000);

    expect(mockTick).toHaveBeenCalled();
    expect(onWalletUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: "caller-1", balanceUsd: 4.98 })
    );
    controller.destroy();
  });

  it("ignores a billing tick wallet that belongs to the callee", async () => {
    const onWalletUpdate = vi.fn();
    mockTick.mockResolvedValue({
      ok: true,
      wallet: callerWallet({ playerId: "callee-1", balanceUsd: 99 }),
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
      onWalletUpdate,
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
    await Promise.resolve();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(15_000);

    expect(mockTick).toHaveBeenCalled();
    expect(onWalletUpdate).not.toHaveBeenCalled();
    controller.destroy();
  });
});
