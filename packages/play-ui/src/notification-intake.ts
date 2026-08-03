import {
  buildRoomJoinNotification,
  extractWorldNotificationFromIntercomResult,
  shouldDeliverWorldNotification,
  type WorldNotificationPayload,
} from "@agent-play/intercom";

export type PushNotification = (notification: WorldNotificationPayload) => void;

export const ingestIntercomNotificationResult = (input: {
  result: unknown;
  viewerPlayerId: string | null;
  push: PushNotification;
}): void => {
  const notification = extractWorldNotificationFromIntercomResult(input.result);
  if (notification === null) {
    return;
  }
  if (
    !shouldDeliverWorldNotification({
      notification,
      viewerPlayerId: input.viewerPlayerId,
    })
  ) {
    return;
  }
  input.push(notification);
};

export const ingestRoomJoinNotification = (input: {
  playerId: string;
  displayName?: string;
  viewerPlayerId: string | null;
  createdAt: string;
  notificationId: string;
  push: PushNotification;
  onJoinSound?: (input: { playerId: string }) => void;
}): void => {
  const notification = buildRoomJoinNotification({
    id: input.notificationId,
    createdAt: input.createdAt,
    actorPlayerId: input.playerId,
    ...(input.displayName !== undefined
      ? { displayName: input.displayName }
      : {}),
  });
  if (
    !shouldDeliverWorldNotification({
      notification,
      viewerPlayerId: input.viewerPlayerId,
    })
  ) {
    return;
  }
  input.push(notification);
  input.onJoinSound?.({ playerId: input.playerId });
};
