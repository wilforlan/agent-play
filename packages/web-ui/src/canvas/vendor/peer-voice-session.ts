import { z } from "zod";

export const PeerCallSignalKindSchema = z.enum(["offer", "answer", "ice"]);

export const PeerCallSignalBodySchema = z.object({
  callId: z.string().min(1),
  fromHumanId: z.string().min(1),
  toHumanId: z.string().min(1),
  kind: PeerCallSignalKindSchema,
  payload: z.unknown(),
});

export type PeerCallSignalBody = z.infer<typeof PeerCallSignalBodySchema>;

export const WORLD_PEER_CALL_SIGNAL_EVENT = "world:peer-call-signal" as const;

const defaultIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  const turnUrl = import.meta.env?.VITE_GEOGRAPHY_TURN_URL as
    | string
    | undefined;
  const turnUser = import.meta.env?.VITE_GEOGRAPHY_TURN_USERNAME as
    | string
    | undefined;
  const turnCred = import.meta.env?.VITE_GEOGRAPHY_TURN_CREDENTIAL as
    | string
    | undefined;
  if (turnUrl !== undefined && turnUrl.trim().length > 0) {
    servers.push({
      urls: turnUrl.trim(),
      ...(turnUser !== undefined && turnUser.length > 0
        ? { username: turnUser }
        : {}),
      ...(turnCred !== undefined && turnCred.length > 0
        ? { credential: turnCred }
        : {}),
    });
  }
  return servers;
};

const defaultCreateRemoteAudioElement = (): HTMLAudioElement => {
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.setAttribute("playsinline", "true");
  audio.style.display = "none";
  document.body.appendChild(audio);
  return audio;
};

export type PeerVoiceSessionOptions = {
  callId: string;
  localHumanId: string;
  remoteHumanId: string;
  apiBase: string;
  sid: string;
  isOfferer: boolean;
  iceServers?: RTCIceServer[];
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createPeerConnection?: (config: RTCConfiguration) => RTCPeerConnection;
  postSignal?: (body: PeerCallSignalBody) => Promise<void>;
  createRemoteAudioElement?: () => HTMLAudioElement;
};

export type PeerVoiceSessionHandle = {
  start: () => Promise<void>;
  handleSignal: (body: PeerCallSignalBody) => Promise<void>;
  stop: () => void;
  isActive: () => boolean;
};

const defaultPostSignal = async (input: {
  apiBase: string;
  sid: string;
  body: PeerCallSignalBody;
}): Promise<void> => {
  const base = input.apiBase.replace(/\/$/, "");
  const url = `${base}/api/agent-play/peer-call/signal?sid=${encodeURIComponent(input.sid)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.body),
  });
  if (!res.ok) {
    throw new Error(`peer-call signal failed: ${String(res.status)}`);
  }
};

export const createPeerVoiceSession = (
  options: PeerVoiceSessionOptions
): PeerVoiceSessionHandle => {
  let pc: RTCPeerConnection | null = null;
  let localStream: MediaStream | null = null;
  let remoteAudio: HTMLAudioElement | null = null;
  let started = false;
  let stopped = false;
  let remoteDescriptionSet = false;
  let pendingSignals: PeerCallSignalBody[] = [];
  let pendingIce: RTCIceCandidateInit[] = [];

  const postSignal =
    options.postSignal ??
    ((body: PeerCallSignalBody) =>
      defaultPostSignal({
        apiBase: options.apiBase,
        sid: options.sid,
        body,
      }));

  const getUserMedia =
    options.getUserMedia ??
    ((constraints) => navigator.mediaDevices.getUserMedia(constraints));
  const createPeerConnection =
    options.createPeerConnection ??
    ((config) => new RTCPeerConnection(config));
  const createRemoteAudioElement =
    options.createRemoteAudioElement ?? defaultCreateRemoteAudioElement;

  const attachRemoteTrack = (event: RTCTrackEvent): void => {
    const stream =
      event.streams[0] ??
      (() => {
        const created = new MediaStream();
        created.addTrack(event.track);
        return created;
      })();
    if (remoteAudio === null) {
      remoteAudio = createRemoteAudioElement();
    }
    remoteAudio.srcObject = stream;
    void remoteAudio.play().catch(() => undefined);
  };

  const flushPendingIce = async (): Promise<void> => {
    if (pc === null) {
      return;
    }
    const queued = pendingIce;
    pendingIce = [];
    for (const candidate of queued) {
      await pc.addIceCandidate(candidate);
    }
  };

  const processSignal = async (body: PeerCallSignalBody): Promise<void> => {
    if (pc === null) {
      return;
    }
    if (body.kind === "offer") {
      await pc.setRemoteDescription(body.payload as RTCSessionDescriptionInit);
      remoteDescriptionSet = true;
      await flushPendingIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await postSignal({
        callId: options.callId,
        fromHumanId: options.localHumanId,
        toHumanId: options.remoteHumanId,
        kind: "answer",
        payload: answer,
      });
      return;
    }
    if (body.kind === "answer") {
      await pc.setRemoteDescription(body.payload as RTCSessionDescriptionInit);
      remoteDescriptionSet = true;
      await flushPendingIce();
      return;
    }
    if (body.kind === "ice") {
      const candidate = body.payload as RTCIceCandidateInit;
      if (!remoteDescriptionSet) {
        pendingIce = [...pendingIce, candidate];
        return;
      }
      await pc.addIceCandidate(candidate);
    }
  };

  const stop = (): void => {
    stopped = true;
    started = false;
    pendingSignals = [];
    pendingIce = [];
    remoteDescriptionSet = false;
    if (localStream !== null) {
      for (const track of localStream.getTracks()) {
        track.stop();
      }
      localStream = null;
    }
    if (remoteAudio !== null) {
      remoteAudio.srcObject = null;
      remoteAudio.remove();
      remoteAudio = null;
    }
    if (pc !== null) {
      pc.close();
      pc = null;
    }
  };

  const start = async (): Promise<void> => {
    if (stopped || (started && pc !== null)) {
      return;
    }
    started = true;
    localStream = await getUserMedia({ audio: true, video: false });
    if (stopped) {
      for (const track of localStream.getTracks()) {
        track.stop();
      }
      localStream = null;
      return;
    }
    pc = createPeerConnection({
      iceServers: options.iceServers ?? defaultIceServers(),
    });
    pc.ontrack = attachRemoteTrack;
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
    pc.onicecandidate = (event) => {
      if (event.candidate === null || pc === null) {
        return;
      }
      void postSignal({
        callId: options.callId,
        fromHumanId: options.localHumanId,
        toHumanId: options.remoteHumanId,
        kind: "ice",
        payload: event.candidate.toJSON(),
      });
    };

    const queued = pendingSignals;
    pendingSignals = [];
    for (const signal of queued) {
      await processSignal(signal);
    }

    if (options.isOfferer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await postSignal({
        callId: options.callId,
        fromHumanId: options.localHumanId,
        toHumanId: options.remoteHumanId,
        kind: "offer",
        payload: offer,
      });
    }
  };

  const handleSignal = async (body: PeerCallSignalBody): Promise<void> => {
    if (stopped) {
      return;
    }
    if (body.callId !== options.callId) {
      return;
    }
    if (body.toHumanId !== options.localHumanId) {
      return;
    }
    if (pc === null) {
      pendingSignals = [...pendingSignals, body];
      return;
    }
    await processSignal(body);
  };

  return {
    start,
    handleSignal,
    stop,
    isActive: () => started && !stopped,
  };
};
