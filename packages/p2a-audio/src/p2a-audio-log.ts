import { agentPlayDebug } from "@agent-play/sdk";

export function isP2aAudioTraceEnabled(): boolean {
  return (
    process.env.P2A_AUDIO_TRACE === "1" || process.env.AGENT_PLAY_DEBUG === "1"
  );
}

export function p2aAudioDebug(message: string, detail?: unknown): void {
  agentPlayDebug("p2a-audio", message, detail);
}

export function p2aAudioTrace(
  message: string,
  detail?: Record<string, unknown>
): void {
  if (!isP2aAudioTraceEnabled()) {
    return;
  }
  const suffix =
    detail !== undefined && Object.keys(detail).length > 0
      ? ` ${safeJson(detail)}`
      : "";
  console.info(`[agent-play:p2a-audio:trace] ${message}${suffix}`);
}

const MAX_JSON = 1800;

function safeJson(detail: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(detail);
    return s.length > MAX_JSON ? `${s.slice(0, MAX_JSON)}…` : s;
  } catch {
    return "[unserializable]";
  }
}

export function truncateBase64Hint(
  dataBase64: string,
  maxLen = 24
): { length: number; preview: string } {
  return {
    length: dataBase64.length,
    preview:
      dataBase64.length <= maxLen
        ? dataBase64
        : `${dataBase64.slice(0, maxLen)}…`,
  };
}
