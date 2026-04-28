import { track } from "@vercel/analytics";

export type PresentationAnalyticsEvent =
  | "AssistAction"
  | "PTTAction"
  | "ChatAction"
  | "WorldMessageAction"
  | "EnableP2A"
  | "DisableP2A";

export function reportPresentationEvent(
  event: PresentationAnalyticsEvent
): void {
  track(event);
}

export function reportP2aToggleIfChanged(
  previous: boolean,
  next: boolean
): void {
  if (previous === next) {
    return;
  }
  track(next ? "EnableP2A" : "DisableP2A");
}
