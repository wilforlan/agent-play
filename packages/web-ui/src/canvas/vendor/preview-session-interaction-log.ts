const PREFIX = "[agent-play:session-interaction]";

export type SessionInteractionLogPhase =
  | "start"
  | "skip"
  | "success"
  | "error"
  | "event";

export function isSessionInteractionLoggingEnabled(): boolean {
  if (typeof import.meta !== "undefined" && import.meta.env?.PROD === true) {
    return false;
  }
  if (
    typeof process !== "undefined" &&
    process.env?.NODE_ENV === "production"
  ) {
    return false;
  }
  return true;
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
