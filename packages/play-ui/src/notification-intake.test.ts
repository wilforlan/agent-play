import { describe, expect, it, vi } from "vitest";
import {
  buildMessageLikeNotification,
  buildRoomJoinNotification,
} from "@agent-play/intercom";
import {
  ingestIntercomNotificationResult,
  ingestRoomJoinNotification,
} from "./notification-intake.js";

describe("notification intake", () => {
  it("pushes like notifications from intercom results for the target viewer", () => {
    const push = vi.fn();
    const notification = buildMessageLikeNotification({
      id: "n-1",
      createdAt: "2026-08-03T12:00:00.000Z",
      actorPlayerId: "alice",
      targetPlayerId: "bob",
      messageRequestId: "msg-1",
    });
    ingestIntercomNotificationResult({
      result: { notification },
      viewerPlayerId: "bob",
      push,
    });
    expect(push).toHaveBeenCalledWith(notification);
  });

  it("ignores intercom notifications when the viewer is not the target", () => {
    const push = vi.fn();
    const notification = buildMessageLikeNotification({
      id: "n-1",
      createdAt: "2026-08-03T12:00:00.000Z",
      actorPlayerId: "alice",
      targetPlayerId: "bob",
      messageRequestId: "msg-1",
    });
    ingestIntercomNotificationResult({
      result: { notification },
      viewerPlayerId: "carol",
      push,
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("builds and pushes room join notifications for other players", () => {
    const push = vi.fn();
    const onJoinSound = vi.fn();
    ingestRoomJoinNotification({
      playerId: "carol",
      displayName: "Carol",
      viewerPlayerId: "bob",
      createdAt: "2026-08-03T12:00:00.000Z",
      notificationId: "join-carol",
      push,
      onJoinSound,
    });
    expect(push).toHaveBeenCalledWith(
      buildRoomJoinNotification({
        id: "join-carol",
        createdAt: "2026-08-03T12:00:00.000Z",
        actorPlayerId: "carol",
        displayName: "Carol",
      })
    );
    expect(onJoinSound).toHaveBeenCalledWith({ playerId: "carol" });
  });
});
