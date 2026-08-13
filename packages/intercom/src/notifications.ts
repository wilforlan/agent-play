import { z } from "zod";
import type { WorldIntercomEventPayload } from "./validator.js";

const NonEmpty = z.string().trim().min(1);

export const WORLD_NOTIFICATION_CHANNEL = "intercom:world:notifications" as const;

export const WorldNotificationKindSchema = z.enum([
  "message_like",
  "message_love",
  "message_reply",
  "room_join",
  "peer_call_invite",
  "peer_call_declined",
]);

export const WorldNotificationPayloadSchema = z.object({
  id: NonEmpty,
  kind: WorldNotificationKindSchema,
  title: NonEmpty,
  description: NonEmpty,
  createdAt: NonEmpty,
  actorPlayerId: NonEmpty,
  targetPlayerId: NonEmpty.optional(),
  messageRequestId: NonEmpty.optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type WorldNotificationKind = z.infer<typeof WorldNotificationKindSchema>;
export type WorldNotificationPayload = z.infer<
  typeof WorldNotificationPayloadSchema
>;

export function parseWorldNotificationPayload(
  payload: unknown
): WorldNotificationPayload {
  return WorldNotificationPayloadSchema.parse(payload);
}

export function tryParseWorldNotificationPayload(
  payload: unknown
): WorldNotificationPayload | null {
  const parsed = WorldNotificationPayloadSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export function extractWorldNotificationFromIntercomResult(
  result: unknown
): WorldNotificationPayload | null {
  if (typeof result !== "object" || result === null) {
    return null;
  }
  const record = result as Record<string, unknown>;
  return tryParseWorldNotificationPayload(record.notification);
}

export type BuildWorldNotificationOptions = {
  id: string;
  kind: WorldNotificationKind;
  title: string;
  description: string;
  createdAt: string;
  actorPlayerId: string;
  targetPlayerId?: string;
  messageRequestId?: string;
  metadata?: Record<string, unknown>;
};

export function buildWorldNotification(
  options: BuildWorldNotificationOptions
): WorldNotificationPayload {
  return WorldNotificationPayloadSchema.parse({
    id: options.id,
    kind: options.kind,
    title: options.title,
    description: options.description,
    createdAt: options.createdAt,
    actorPlayerId: options.actorPlayerId,
    ...(options.targetPlayerId !== undefined
      ? { targetPlayerId: options.targetPlayerId }
      : {}),
    ...(options.messageRequestId !== undefined
      ? { messageRequestId: options.messageRequestId }
      : {}),
    metadata: options.metadata ?? {},
  });
}

export function buildMessageLikeNotification(input: {
  id: string;
  createdAt: string;
  actorPlayerId: string;
  targetPlayerId: string;
  messageRequestId: string;
  messagePreview?: string;
}): WorldNotificationPayload {
  const preview =
    typeof input.messagePreview === "string" && input.messagePreview.trim().length > 0
      ? input.messagePreview.trim().slice(0, 80)
      : "your message";
  return buildWorldNotification({
    id: input.id,
    kind: "message_like",
    title: "New like",
    description: `${input.actorPlayerId} liked ${preview}`,
    createdAt: input.createdAt,
    actorPlayerId: input.actorPlayerId,
    targetPlayerId: input.targetPlayerId,
    messageRequestId: input.messageRequestId,
    metadata: {
      reactionKind: "thumbs_up",
      messagePreview: preview,
    },
  });
}

export function buildMessageLoveNotification(input: {
  id: string;
  createdAt: string;
  actorPlayerId: string;
  targetPlayerId: string;
  messageRequestId: string;
  messagePreview?: string;
}): WorldNotificationPayload {
  const preview =
    typeof input.messagePreview === "string" && input.messagePreview.trim().length > 0
      ? input.messagePreview.trim().slice(0, 80)
      : "your message";
  return buildWorldNotification({
    id: input.id,
    kind: "message_love",
    title: "New love",
    description: `${input.actorPlayerId} loved ${preview}`,
    createdAt: input.createdAt,
    actorPlayerId: input.actorPlayerId,
    targetPlayerId: input.targetPlayerId,
    messageRequestId: input.messageRequestId,
    metadata: {
      reactionKind: "love",
      messagePreview: preview,
    },
  });
}

export function buildMessageReplyNotification(input: {
  id: string;
  createdAt: string;
  actorPlayerId: string;
  targetPlayerId: string;
  messageRequestId: string;
  replyPreview?: string;
}): WorldNotificationPayload {
  const preview =
    typeof input.replyPreview === "string" && input.replyPreview.trim().length > 0
      ? input.replyPreview.trim().slice(0, 80)
      : "your message";
  return buildWorldNotification({
    id: input.id,
    kind: "message_reply",
    title: "New reply",
    description: `${input.actorPlayerId} replied: ${preview}`,
    createdAt: input.createdAt,
    actorPlayerId: input.actorPlayerId,
    targetPlayerId: input.targetPlayerId,
    messageRequestId: input.messageRequestId,
    metadata: {
      replyPreview: preview,
    },
  });
}

export function buildRoomJoinNotification(input: {
  id: string;
  createdAt: string;
  actorPlayerId: string;
  displayName?: string;
}): WorldNotificationPayload {
  const name =
    typeof input.displayName === "string" && input.displayName.trim().length > 0
      ? input.displayName.trim()
      : input.actorPlayerId;
  return buildWorldNotification({
    id: input.id,
    kind: "room_join",
    title: "Someone joined",
    description: `${name} joined the room`,
    createdAt: input.createdAt,
    actorPlayerId: input.actorPlayerId,
    metadata: {
      displayName: name,
    },
  });
}

export function buildPeerCallInviteNotification(input: {
  id: string;
  createdAt: string;
  callerId: string;
  calleeId: string;
  callId: string;
  callerDisplayName?: string;
}): WorldNotificationPayload {
  const name =
    typeof input.callerDisplayName === "string" &&
    input.callerDisplayName.trim().length > 0
      ? input.callerDisplayName.trim()
      : input.callerId;
  return buildWorldNotification({
    id: input.id,
    kind: "peer_call_invite",
    title: "Incoming call",
    description: `${name} wants to talk`,
    createdAt: input.createdAt,
    actorPlayerId: input.callerId,
    targetPlayerId: input.calleeId,
    metadata: {
      callId: input.callId,
      callerId: input.callerId,
      callerDisplayName: name,
      sticky: true,
    },
  });
}

export function buildPeerCallDeclinedNotification(input: {
  id: string;
  createdAt: string;
  callerId: string;
  calleeId: string;
  callId: string;
}): WorldNotificationPayload {
  return buildWorldNotification({
    id: input.id,
    kind: "peer_call_declined",
    title: "Call declined",
    description: "Your call was declined",
    createdAt: input.createdAt,
    actorPlayerId: input.calleeId,
    targetPlayerId: input.callerId,
    metadata: {
      callId: input.callId,
      calleeId: input.calleeId,
    },
  });
}

export function shouldDeliverWorldNotification(input: {
  notification: WorldNotificationPayload;
  viewerPlayerId: string | null;
}): boolean {
  const viewer = input.viewerPlayerId?.trim() ?? "";
  if (viewer.length === 0) {
    return false;
  }
  if (input.notification.actorPlayerId === viewer) {
    return false;
  }
  if (input.notification.kind === "room_join") {
    return true;
  }
  return input.notification.targetPlayerId === viewer;
}

export function wrapNotificationInIntercomResult(
  notification: WorldNotificationPayload,
  baseResult: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...baseResult,
    notification,
  };
}

export type BuildNotificationIntercomEventOptions = {
  notification: WorldNotificationPayload;
  mainNodeId: string;
  requestId?: string;
  baseResult?: Record<string, unknown>;
};

export function buildNotificationIntercomEvent(
  options: BuildNotificationIntercomEventOptions
): WorldIntercomEventPayload {
  const requestId = options.requestId ?? options.notification.id;
  return {
    requestId,
    mainNodeId: options.mainNodeId,
    toPlayerId: options.notification.targetPlayerId ?? "__world__",
    fromPlayerId: options.notification.actorPlayerId,
    kind: "chat",
    status: "completed",
    message: options.notification.description,
    result: wrapNotificationInIntercomResult(
      options.notification,
      options.baseResult ?? {}
    ),
    channelKey: WORLD_NOTIFICATION_CHANNEL,
    ts: options.notification.createdAt,
  };
}
