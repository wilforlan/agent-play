import { track } from "@vercel/analytics";
import { ANALYTICS_EVENT_NAMES } from "@agent-play/sdk/browser";
import { getPreviewSessionIdSync } from "./preview-session-id.js";

export type PresentationAnalyticsEvent =
  | "AssistAction"
  | "PTTAction"
  | "ChatAction"
  | "WorldMessageAction"
  | "EnableP2A"
  | "DisableP2A";

const reportInPlatformPresentationEvent = (
  action: PresentationAnalyticsEvent
): void => {
  const sid = getPreviewSessionIdSync();
  if (sid === null) return;
  void fetch(`/api/analytics/track?sid=${encodeURIComponent(sid)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: ANALYTICS_EVENT_NAMES.uiPresentationAction,
      distinctId: sid,
      properties: { action },
    }),
  }).catch(() => undefined);
};

export function reportPresentationEvent(
  event: PresentationAnalyticsEvent
): void {
  track(event);
  reportInPlatformPresentationEvent(event);
}

export function reportP2aToggleIfChanged(
  previous: boolean,
  next: boolean
): void {
  if (previous === next) {
    return;
  }
  const action = next ? "EnableP2A" : "DisableP2A";
  track(action);
  reportInPlatformPresentationEvent(action);
}
