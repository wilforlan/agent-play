import {
  nextPeerTalkTickSeconds,
  type PeerCallRecord,
  type PlayerWallet,
} from "@agent-play/sdk/browser";
import type { WorldNotificationPayload } from "@agent-play/intercom";
import {
  peerCallAccept,
  peerCallDecline,
  peerCallHangup,
  peerCallInvite,
  peerTalkSessionTick,
} from "./peer-call-client.js";
import { createPeerCallHud } from "./peer-call-hud.js";
import {
  createPeerVoiceSession,
  PeerCallSignalBodySchema,
  WORLD_PEER_CALL_SIGNAL_EVENT,
  type PeerVoiceSessionHandle,
} from "./peer-voice-session.js";
import type { PreviewRingerEngine } from "./preview-ringer-engine.js";

export type PeerCallControllerOptions = {
  parent: HTMLElement;
  getSid: () => string | null;
  getApiBase: () => string;
  getLocalHumanId: () => string | null;
  getPeerDisplayName: (humanId: string) => string;
  isAgentPttActive: () => boolean;
  stopAgentPtt: () => void | Promise<void>;
  onWalletUpdate?: (wallet: PlayerWallet) => void;
  onError?: (message: string) => void;
  onCallUiChange?: () => void;
  ringer: PreviewRingerEngine;
};

export type PeerCallController = {
  getPeerTalkLabel: () => string | null;
  getNearestHumanId: () => string | null;
  setNearestHumanId: (humanId: string | null) => void;
  isInCall: () => boolean;
  startCallWithNearest: () => Promise<void>;
  hangup: () => Promise<void>;
  handleIncomingInvite: (notification: WorldNotificationPayload) => void;
  acceptInvite: (notification: WorldNotificationPayload) => Promise<void>;
  declineInvite: (notification: WorldNotificationPayload) => Promise<void>;
  handleSseEvent: (eventName: string, data: unknown) => void;
  destroy: () => void;
};

type ActiveCallState = {
  call: PeerCallRecord;
  role: "caller" | "callee";
  voice: PeerVoiceSessionHandle | null;
  billingTimer: number | null;
  hudTimer: number | null;
  startedAtMs: number;
};

const callIdFromNotification = (
  notification: WorldNotificationPayload
): string | null => {
  const raw = notification.metadata.callId;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
};

export const createPeerCallController = (
  options: PeerCallControllerOptions
): PeerCallController => {
  const hud = createPeerCallHud({
    parent: options.parent,
  });
  let nearestHumanId: string | null = null;
  let active: ActiveCallState | null = null;
  let pendingOutgoing: PeerCallRecord | null = null;
  let ringingInviteId: string | null = null;
  let pendingSignals: ReturnType<
    typeof PeerCallSignalBodySchema.parse
  >[] = [];

  const notifyUi = (): void => {
    options.onCallUiChange?.();
  };

  const clearBilling = (): void => {
    if (active?.billingTimer !== null && active?.billingTimer !== undefined) {
      window.clearTimeout(active.billingTimer);
      active.billingTimer = null;
    }
  };

  const clearHudTimer = (): void => {
    if (active?.hudTimer !== null && active?.hudTimer !== undefined) {
      window.clearInterval(active.hudTimer);
      active.hudTimer = null;
    }
  };

  const scheduleBillingTick = (): void => {
    if (active === null || active.role !== "caller") {
      return;
    }
    clearBilling();
    const delayMs = nextPeerTalkTickSeconds() * 1000;
    active.billingTimer = window.setTimeout(() => {
      void runBillingTick();
    }, delayMs);
  };

  const runBillingTick = async (): Promise<void> => {
    if (active === null || active.role !== "caller") {
      return;
    }
    const sid = options.getSid();
    if (sid === null) {
      return;
    }
    const out = await peerTalkSessionTick({
      sid,
      callerId: active.call.callerId,
      calleeId: active.call.calleeId,
      callId: active.call.callId,
    });
    if (!out.ok) {
      if (out.error === "INSUFFICIENT_FUNDS") {
        options.onError?.("Insufficient funds — call ended");
        await hangup();
      }
      return;
    }
    const localId = options.getLocalHumanId();
    if (
      out.wallet !== undefined &&
      localId !== null &&
      out.wallet.playerId === localId
    ) {
      options.onWalletUpdate?.(out.wallet);
    }
    scheduleBillingTick();
  };

  const flushPendingSignals = (voice: PeerVoiceSessionHandle): void => {
    const queued = pendingSignals;
    pendingSignals = [];
    for (const signal of queued) {
      void voice.handleSignal(signal);
    }
  };

  const attachVoice = (input: {
    call: PeerCallRecord;
    role: "caller" | "callee";
    localId: string;
    remoteId: string;
    sid: string;
  }): PeerVoiceSessionHandle => {
    const voice = createPeerVoiceSession({
      callId: input.call.callId,
      localHumanId: input.localId,
      remoteHumanId: input.remoteId,
      apiBase: options.getApiBase(),
      sid: input.sid,
      isOfferer: input.role === "caller",
    });
    if (active !== null && active.call.callId === input.call.callId) {
      active.voice = voice;
    }
    flushPendingSignals(voice);
    return voice;
  };

  const beginActiveHud = (input: {
    call: PeerCallRecord;
    role: "caller" | "callee";
    remoteId: string;
  }): ActiveCallState => {
    clearHudTimer();
    const state: ActiveCallState = {
      call: input.call,
      role: input.role,
      voice: null,
      billingTimer: null,
      hudTimer: null,
      startedAtMs: Date.now(),
    };
    active = state;
    hud.setPeerName(options.getPeerDisplayName(input.remoteId));
    hud.setElapsedSeconds(0);
    hud.setVisible(true);
    state.hudTimer = window.setInterval(() => {
      if (active === null) {
        return;
      }
      const elapsed = Math.floor((Date.now() - active.startedAtMs) / 1000);
      hud.setElapsedSeconds(elapsed);
    }, 1000);
    notifyUi();
    return state;
  };

  const startMedia = async (
    call: PeerCallRecord,
    role: "caller" | "callee"
  ): Promise<void> => {
    const sid = options.getSid();
    const localId = options.getLocalHumanId();
    if (sid === null || localId === null) {
      throw new Error("Not signed in");
    }
    const remoteId = role === "caller" ? call.calleeId : call.callerId;
    const state =
      active !== null && active.call.callId === call.callId
        ? active
        : beginActiveHud({ call, role, remoteId });
    state.call = call;
    state.role = role;

    const voice = attachVoice({
      call,
      role,
      localId,
      remoteId,
      sid,
    });
    await voice.start();
    if (active !== state) {
      voice.stop();
      return;
    }
    if (role === "caller") {
      scheduleBillingTick();
    }
  };

  const hangup = async (): Promise<void> => {
    options.ringer.stopIncomingCallRing();
    ringingInviteId = null;
    pendingSignals = [];
    const outgoing = pendingOutgoing;
    pendingOutgoing = null;
    const current = active;
    if (current?.billingTimer !== null && current?.billingTimer !== undefined) {
      window.clearTimeout(current.billingTimer);
    }
    if (current?.hudTimer !== null && current?.hudTimer !== undefined) {
      window.clearInterval(current.hudTimer);
    }
    active = null;
    current?.voice?.stop();
    hud.setVisible(false);
    notifyUi();
    const sid = options.getSid();
    const localId = options.getLocalHumanId();
    const callId = current?.call.callId ?? outgoing?.callId;
    if (sid === null || localId === null || callId === undefined) {
      return;
    }
    await peerCallHangup({
      sid,
      callId,
      actorId: localId,
    }).catch(() => undefined);
  };

  const startCallWithNearest = async (): Promise<void> => {
    if (active !== null || pendingOutgoing !== null) {
      await hangup();
      return;
    }
    if (options.isAgentPttActive()) {
      options.onError?.("End agent talk before starting a peer call");
      return;
    }
    const sid = options.getSid();
    const localId = options.getLocalHumanId();
    const peerId = nearestHumanId;
    if (sid === null || localId === null || peerId === null) {
      options.onError?.("No nearby peer to call");
      return;
    }
    const invited = await peerCallInvite({
      sid,
      callerId: localId,
      calleeId: peerId,
      callerDisplayName: options.getPeerDisplayName(localId),
    });
    if (!invited.ok) {
      options.onError?.(invited.error);
      return;
    }
    pendingOutgoing = invited.call;
    hud.setPeerName(options.getPeerDisplayName(peerId));
    hud.setElapsedSeconds(0);
    hud.setVisible(true);
    notifyUi();
  };

  const acceptInvite = async (
    notification: WorldNotificationPayload
  ): Promise<void> => {
    options.ringer.stopIncomingCallRing();
    ringingInviteId = null;
    if (options.isAgentPttActive()) {
      await options.stopAgentPtt();
    }
    const sid = options.getSid();
    const localId = options.getLocalHumanId();
    const callId = callIdFromNotification(notification);
    if (sid === null || localId === null || callId === null) {
      return;
    }
    const accepted = await peerCallAccept({
      sid,
      callId,
      calleeId: localId,
    });
    if (!accepted.ok) {
      options.onError?.(accepted.error);
      return;
    }
    beginActiveHud({
      call: accepted.call,
      role: "callee",
      remoteId: accepted.call.callerId,
    });
    try {
      await startMedia(accepted.call, "callee");
    } catch (error) {
      options.onError?.(
        error instanceof Error ? error.message : "Could not join call media"
      );
      await hangup();
    }
  };

  const declineInvite = async (
    notification: WorldNotificationPayload
  ): Promise<void> => {
    options.ringer.stopIncomingCallRing();
    ringingInviteId = null;
    const sid = options.getSid();
    const localId = options.getLocalHumanId();
    const callId = callIdFromNotification(notification);
    if (sid === null || localId === null || callId === null) {
      return;
    }
    await peerCallDecline({ sid, callId, calleeId: localId }).catch(
      () => undefined
    );
  };

  const handleIncomingInvite = (
    notification: WorldNotificationPayload
  ): void => {
    if (notification.kind === "peer_call_declined") {
      if (
        pendingOutgoing !== null &&
        callIdFromNotification(notification) === pendingOutgoing.callId
      ) {
        pendingOutgoing = null;
        hud.setVisible(false);
        notifyUi();
        options.onError?.("Call declined");
      }
      return;
    }
    if (notification.kind !== "peer_call_invite") {
      return;
    }
    ringingInviteId = notification.id;
    void options.ringer.startIncomingCallRing();
  };

  const handlePeerCallState = (data: unknown): void => {
    if (typeof data !== "object" || data === null || !("call" in data)) {
      return;
    }
    const callUnknown = (data as { call: unknown }).call;
    if (typeof callUnknown !== "object" || callUnknown === null) {
      return;
    }
    const call = callUnknown as PeerCallRecord;
    const localId = options.getLocalHumanId();
    if (localId === null) {
      return;
    }
    if (
      call.status === "active" &&
      pendingOutgoing !== null &&
      call.callId === pendingOutgoing.callId &&
      call.callerId === localId &&
      active === null
    ) {
      pendingOutgoing = null;
      beginActiveHud({
        call,
        role: "caller",
        remoteId: call.calleeId,
      });
      void startMedia(call, "caller").catch(async (error: unknown) => {
        options.onError?.(
          error instanceof Error ? error.message : "Could not start call media"
        );
        await hangup();
      });
      return;
    }
    if (
      (call.status === "ended" ||
        call.status === "declined" ||
        call.status === "missed" ||
        call.status === "failed") &&
      ((active !== null && call.callId === active.call.callId) ||
        (pendingOutgoing !== null && call.callId === pendingOutgoing.callId))
    ) {
      void hangup();
    }
  };

  const handleSseEvent = (eventName: string, data: unknown): void => {
    if (eventName === "world:peer-call-state") {
      handlePeerCallState(data);
      return;
    }
    if (eventName !== WORLD_PEER_CALL_SIGNAL_EVENT) {
      return;
    }
    const parsed = PeerCallSignalBodySchema.safeParse(data);
    if (!parsed.success) {
      return;
    }
    if (active === null) {
      return;
    }
    if (active.voice === null) {
      pendingSignals = [...pendingSignals, parsed.data];
      return;
    }
    void active.voice.handleSignal(parsed.data);
  };

  return {
    getPeerTalkLabel: () => {
      if (active !== null || pendingOutgoing !== null) {
        return "End";
      }
      if (nearestHumanId !== null) {
        return "Talk";
      }
      return null;
    },
    getNearestHumanId: () => nearestHumanId,
    setNearestHumanId: (humanId) => {
      nearestHumanId = humanId;
    },
    isInCall: () => active !== null || pendingOutgoing !== null,
    startCallWithNearest,
    hangup,
    handleIncomingInvite,
    acceptInvite,
    declineInvite,
    handleSseEvent,
    destroy: () => {
      options.ringer.stopIncomingCallRing();
      clearBilling();
      clearHudTimer();
      active?.voice?.stop();
      active = null;
      pendingOutgoing = null;
      ringingInviteId = null;
      hud.destroy();
    },
  };
};
