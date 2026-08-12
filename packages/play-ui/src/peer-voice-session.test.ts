import { describe, expect, it, vi } from "vitest";
import { createPeerVoiceSession } from "./peer-voice-session.js";

describe("createPeerVoiceSession", () => {
  it("posts an offer when started as offerer", async () => {
    const setLocalDescription = vi.fn(async () => {});
    const createOffer = vi.fn(async () => ({ type: "offer", sdp: "v=0" }));
    const addTrack = vi.fn();
    const close = vi.fn();
    const pc = {
      addTrack,
      createOffer,
      setLocalDescription,
      setRemoteDescription: vi.fn(async () => {}),
      createAnswer: vi.fn(async () => ({ type: "answer", sdp: "v=0" })),
      addIceCandidate: vi.fn(async () => {}),
      close,
      onicecandidate: null as ((event: { candidate: null }) => void) | null,
    };
    const postSignal = vi.fn(async () => {});
    const getUserMedia = vi.fn(async () => ({
      getTracks: () => [{ stop: vi.fn(), kind: "audio" }],
    }));

    const session = createPeerVoiceSession({
      callId: "call-1",
      localHumanId: "caller-1",
      remoteHumanId: "callee-1",
      apiBase: "",
      sid: "s1",
      isOfferer: true,
      getUserMedia: getUserMedia as unknown as (
        constraints: MediaStreamConstraints
      ) => Promise<MediaStream>,
      createPeerConnection: () =>
        pc as unknown as RTCPeerConnection,
      postSignal,
    });

    await session.start();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(createOffer).toHaveBeenCalled();
    expect(postSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: "call-1",
        kind: "offer",
        fromHumanId: "caller-1",
        toHumanId: "callee-1",
      })
    );
    session.stop();
    expect(close).toHaveBeenCalled();
  });
});
