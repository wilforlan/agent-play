import { describe, expect, it, vi } from "vitest";
import { createPeerVoiceSession } from "./peer-voice-session.js";

type FakePc = {
  addTrack: ReturnType<typeof vi.fn>;
  createOffer: ReturnType<typeof vi.fn>;
  createAnswer: ReturnType<typeof vi.fn>;
  setLocalDescription: ReturnType<typeof vi.fn>;
  setRemoteDescription: ReturnType<typeof vi.fn>;
  addIceCandidate: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onicecandidate: ((event: { candidate: { toJSON: () => unknown } | null }) => void) | null;
  ontrack: ((event: { track: MediaStreamTrack; streams: MediaStream[] }) => void) | null;
};

const createFakePc = (): FakePc => ({
  addTrack: vi.fn(),
  createOffer: vi.fn(async () => ({ type: "offer", sdp: "v=0" })),
  createAnswer: vi.fn(async () => ({ type: "answer", sdp: "v=0" })),
  setLocalDescription: vi.fn(async () => {}),
  setRemoteDescription: vi.fn(async () => {}),
  addIceCandidate: vi.fn(async () => {}),
  close: vi.fn(),
  onicecandidate: null,
  ontrack: null,
});

describe("createPeerVoiceSession", () => {
  it("posts signals to /peer-call/signal under apiBase (not /api/agent-play/...)", async () => {
    const pc = createFakePc();
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const session = createPeerVoiceSession({
      callId: "call-1",
      localHumanId: "caller-1",
      remoteHumanId: "callee-1",
      apiBase: "/agent-play",
      sid: "s1",
      isOfferer: true,
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: vi.fn(), kind: "audio" }],
      })) as unknown as (
        constraints: MediaStreamConstraints
      ) => Promise<MediaStream>,
      createPeerConnection: () => pc as unknown as RTCPeerConnection,
    });

    await session.start();

    expect(fetchMock).toHaveBeenCalled();
    const postedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(postedUrl).toBe("/agent-play/peer-call/signal?sid=s1");
    expect(postedUrl).not.toContain("/api/agent-play/");

    session.stop();
    vi.unstubAllGlobals();
  });

  it("posts an offer when started as offerer", async () => {
    const pc = createFakePc();
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
      createPeerConnection: () => pc as unknown as RTCPeerConnection,
      postSignal,
    });

    await session.start();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(pc.createOffer).toHaveBeenCalled();
    expect(postSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: "call-1",
        kind: "offer",
        fromHumanId: "caller-1",
        toHumanId: "callee-1",
      })
    );
    session.stop();
    expect(pc.close).toHaveBeenCalled();
  });

  it("plays remote audio when an inbound track arrives", async () => {
    const pc = createFakePc();
    const play = vi.fn(async () => {});
    const remoteAudio = {
      autoplay: false,
      srcObject: null as MediaStream | null,
      style: { display: "" },
      setAttribute: vi.fn(),
      play,
      remove: vi.fn(),
    };
    const createRemoteAudioElement = vi.fn(() => remoteAudio);

    const session = createPeerVoiceSession({
      callId: "call-1",
      localHumanId: "callee-1",
      remoteHumanId: "caller-1",
      apiBase: "",
      sid: "s1",
      isOfferer: false,
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: vi.fn(), kind: "audio" }],
      })) as unknown as (
        constraints: MediaStreamConstraints
      ) => Promise<MediaStream>,
      createPeerConnection: () => pc as unknown as RTCPeerConnection,
      postSignal: vi.fn(async () => {}),
      createRemoteAudioElement: createRemoteAudioElement as unknown as () => HTMLAudioElement,
    });

    await session.start();
    expect(pc.ontrack).toEqual(expect.any(Function));

    const track = { kind: "audio", stop: vi.fn() } as unknown as MediaStreamTrack;
    const stream = { id: "remote" } as unknown as MediaStream;
    pc.ontrack?.({ track, streams: [stream] });

    expect(createRemoteAudioElement).toHaveBeenCalled();
    expect(remoteAudio.srcObject).toBe(stream);
    expect(play).toHaveBeenCalled();

    session.stop();
    expect(remoteAudio.srcObject).toBeNull();
    expect(remoteAudio.remove).toHaveBeenCalled();
  });

  it("queues signals that arrive before the peer connection is ready", async () => {
    const pc = createFakePc();
    let resolveMedia: ((stream: {
      getTracks: () => Array<{ stop: () => void; kind: string }>;
    }) => void) | null = null;
    const getUserMedia = vi.fn(
      () =>
        new Promise<{
          getTracks: () => Array<{ stop: () => void; kind: string }>;
        }>((resolve) => {
          resolveMedia = resolve;
        })
    );
    const postSignal = vi.fn(async () => {});

    const session = createPeerVoiceSession({
      callId: "call-1",
      localHumanId: "callee-1",
      remoteHumanId: "caller-1",
      apiBase: "",
      sid: "s1",
      isOfferer: false,
      getUserMedia: getUserMedia as unknown as (
        constraints: MediaStreamConstraints
      ) => Promise<MediaStream>,
      createPeerConnection: () => pc as unknown as RTCPeerConnection,
      postSignal,
    });

    const startPromise = session.start();
    await session.handleSignal({
      callId: "call-1",
      fromHumanId: "caller-1",
      toHumanId: "callee-1",
      kind: "offer",
      payload: { type: "offer", sdp: "v=0" },
    });
    expect(pc.setRemoteDescription).not.toHaveBeenCalled();

    resolveMedia?.({
      getTracks: () => [{ stop: vi.fn(), kind: "audio" }],
    });
    await startPromise;

    expect(pc.setRemoteDescription).toHaveBeenCalled();
    expect(pc.createAnswer).toHaveBeenCalled();
    expect(postSignal).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "answer" })
    );
    session.stop();
  });

  it("queues ICE candidates until the remote description is set", async () => {
    const pc = createFakePc();
    const session = createPeerVoiceSession({
      callId: "call-1",
      localHumanId: "caller-1",
      remoteHumanId: "callee-1",
      apiBase: "",
      sid: "s1",
      isOfferer: true,
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: vi.fn(), kind: "audio" }],
      })) as unknown as (
        constraints: MediaStreamConstraints
      ) => Promise<MediaStream>,
      createPeerConnection: () => pc as unknown as RTCPeerConnection,
      postSignal: vi.fn(async () => {}),
    });

    await session.start();
    await session.handleSignal({
      callId: "call-1",
      fromHumanId: "callee-1",
      toHumanId: "caller-1",
      kind: "ice",
      payload: { candidate: "early" },
    });
    expect(pc.addIceCandidate).not.toHaveBeenCalled();

    await session.handleSignal({
      callId: "call-1",
      fromHumanId: "callee-1",
      toHumanId: "caller-1",
      kind: "answer",
      payload: { type: "answer", sdp: "v=0" },
    });
    expect(pc.setRemoteDescription).toHaveBeenCalled();
    expect(pc.addIceCandidate).toHaveBeenCalledWith({ candidate: "early" });
    session.stop();
  });
});
