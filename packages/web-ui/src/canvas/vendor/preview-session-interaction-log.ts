/**
 * @module @agent-play/play-ui/preview-session-interaction-log
 * preview session interaction log — preview canvas module (Pixi + DOM).
 */
import { isDeepLogsEnabled } from "./browser-deep-logs.js";
const PREFIX = "[agent-play:session-interaction]";

export type SessionInteractionLogPhase =
  | "start"
  | "skip"
  | "success"
  | "error"
  | "event";

export function isSessionInteractionLoggingEnabled(): boolean {
  return isDeepLogsEnabled();
}

export function logSessionInteraction(
  step: string,
  phase: SessionInteractionLogPhase,
  detail?: Record<string, unknown>
): void {
  if (!isSessionInteractionLoggingEnabled()) {
    return;
  }
  if (detail !== undefined && Object.keys(detail).length > 0) {
    console.info(`${PREFIX} ${phase} ${step}`, detail);
  } else {
    console.info(`${PREFIX} ${phase} ${step}`);
  }
}
