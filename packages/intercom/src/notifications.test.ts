import { describe, expect, it } from "vitest";
import {
  WORLD_NOTIFICATION_CHANNEL,
  buildMessageLikeNotification,
  buildMessageLoveNotification,
  buildMessageReplyNotification,
  buildNotificationIntercomEvent,
  buildRoomJoinNotification,
  extractWorldNotificationFromIntercomResult,
  parseWorldNotificationPayload,
  shouldDeliverWorldNotification,
} from "./notifications.js";

describe("world notifications", () => {
  it("parses a notification with title, description, and metadata", () => {
    const notification = parseWorldNotificationPayload({
      id: "n-1",
      kind: "message_like",
      title: "New like",
      description: "alice liked your message",
      createdAt: "2026-08-03T12:00:00.000Z",
      actorPlayerId: "alice",
      targetPlayerId: "bob",
      messageRequestId: "msg-1",
      metadata: { reactionKind: "thumbs_up" },
    });
    expect(notification.title).toBe("New like");
    expect(notification.description).toContain("alice");
    expect(notification.metadata.reactionKind).toBe("thumbs_up");
  });

  it("builds like, love, reply, and room join notifications", () => {
    expect(
      buildMessageLikeNotification({
        id: "n-like",
        createdAt: "2026-08-03T12:00:00.000Z",
        actorPlayerId: "alice",
        targetPlayerId: "bob",
        messageRequestId: "msg-1",
        messagePreview: "hello world",
      }).kind
    ).toBe("message_like");
    expect(
      buildMessageLoveNotification({
        id: "n-love",
        createdAt: "2026-08-03T12:00:00.000Z",
        actorPlayerId: "alice",
        targetPlayerId: "bob",
        messageRequestId: "msg-1",
      }).kind
    ).toBe("message_love");
    expect(
      buildMessageReplyNotification({
        id: "n-reply",
        createdAt: "2026-08-03T12:00:00.000Z",
        actorPlayerId: "alice",
        targetPlayerId: "bob",
        messageRequestId: "msg-1",
        replyPreview: "thanks",
      }).kind
    ).toBe("message_reply");
    expect(
      buildRoomJoinNotification({
        id: "n-join",
        createdAt: "2026-08-03T12:00:00.000Z",
        actorPlayerId: "carol",
        displayName: "Carol",
      }).description
    ).toContain("Carol");
  });

  it("extracts notification payloads from intercom results", () => {
    const notification = buildRoomJoinNotification({
      id: "n-join",
      createdAt: "2026-08-03T12:00:00.000Z",
      actorPlayerId: "carol",
    });
    expect(
      extractWorldNotificationFromIntercomResult({
        seq: 1,
        notification,
      })
    ).toEqual(notification);
    expect(extractWorldNotificationFromIntercomResult({ seq: 1 })).toBeNull();
  });

  it("wraps notifications in an intercom event on the notifications channel", () => {
    const notification = buildMessageReplyNotification({
      id: "n-reply",
      createdAt: "2026-08-03T12:00:00.000Z",
      actorPlayerId: "alice",
      targetPlayerId: "bob",
      messageRequestId: "msg-1",
    });
    const event = buildNotificationIntercomEvent({
      notification,
      mainNodeId: "main-1",
    });
    expect(event.channelKey).toBe(WORLD_NOTIFICATION_CHANNEL);
    expect(event.result?.notification).toEqual(notification);
    expect(event.toPlayerId).toBe("bob");
  });

  it("delivers targeted notifications only to the target viewer", () => {
    const like = buildMessageLikeNotification({
      id: "n-like",
      createdAt: "2026-08-03T12:00:00.000Z",
      actorPlayerId: "alice",
      targetPlayerId: "bob",
      messageRequestId: "msg-1",
    });
    expect(
      shouldDeliverWorldNotification({
        notification: like,
        viewerPlayerId: "bob",
      })
    ).toBe(true);
    expect(
      shouldDeliverWorldNotification({
        notification: like,
        viewerPlayerId: "alice",
      })
    ).toBe(false);
    expect(
      shouldDeliverWorldNotification({
        notification: like,
        viewerPlayerId: "carol",
      })
    ).toBe(false);
  });

  it("delivers room join notifications to every viewer except the joiner", () => {
    const join = buildRoomJoinNotification({
      id: "n-join",
      createdAt: "2026-08-03T12:00:00.000Z",
      actorPlayerId: "carol",
    });
    expect(
      shouldDeliverWorldNotification({
        notification: join,
        viewerPlayerId: "bob",
      })
    ).toBe(true);
    expect(
      shouldDeliverWorldNotification({
        notification: join,
        viewerPlayerId: "carol",
      })
    ).toBe(false);
  });
});
