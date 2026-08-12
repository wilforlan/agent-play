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
    if (out.wallet !== undefined) {
      options.onWalletUpdate?.(out.wallet);
    }
    scheduleBillingTick();
  };

  const startMedia = async (call: PeerCallRecord, role: "caller" | "callee"): Promise<void> => {
    const sid = options.getSid();
    const localId = options.getLocalHumanId();
    if (sid === null || localId === null) {
      throw new Error("Not signed in");
    }
    const remoteId = role === "caller" ? call.calleeId : call.callerId;
    const voice = createPeerVoiceSession({
      callId: call.callId,
      localHumanId: localId,
      remoteHumanId: remoteId,
      apiBase: options.getApiBase(),
      sid,
      isOfferer: role === "caller",
    });
    await voice.start();
    active = {
      call,
      role,
      voice,
      billingTimer: null,
      hudTimer: null,
      startedAtMs: Date.now(),
    };
    hud.setPeerName(options.getPeerDisplayName(remoteId));
    hud.setElapsedSeconds(0);
    hud.setVisible(true);
    active.hudTimer = window.setInterval(() => {
      if (active === null) {
        return;
      }
      const elapsed = Math.floor((Date.now() - active.startedAtMs) / 1000);
      hud.setElapsedSeconds(elapsed);
    }, 1000);
    if (role === "caller") {
      scheduleBillingTick();
    }
  };

  const hangup = async (): Promise<void> => {
    options.ringer.stopIncomingCallRing();
    ringingInviteId = null;
    const outgoing = pendingOutgoing;
    pendingOutgoing = null;
    const current = active;
    active = null;
    clearBilling();
    if (current?.hudTimer !== null && current?.hudTimer !== undefined) {
      window.clearInterval(current.hudTimer);
    }
    current?.voice?.stop();
    hud.setVisible(false);
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
    if (active !== null) {
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
    if (accepted.billing?.wallet !== undefined) {
      options.onWalletUpdate?.(accepted.billing.wallet);
    }
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
      active !== null &&
      call.callId === active.call.callId
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
    if (!parsed.success || active?.voice === null || active === undefined) {
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
    isInCall: () => active !== null,
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
      ringingInviteId = null;
      hud.destroy();
    },
  };
};
