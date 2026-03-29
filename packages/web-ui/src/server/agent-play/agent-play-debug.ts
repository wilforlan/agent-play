type DebugConfigure = {
  debug?: boolean;
};

let configuredDebug: boolean | undefined;

export function configureAgentPlayDebug(opts: DebugConfigure): void {
  configuredDebug = opts.debug ?? undefined;
}

export function resetAgentPlayDebug(): void {
  configuredDebug = undefined;
}

export function isAgentPlayDebugEnabled(): boolean {
  if (configuredDebug === false) return false;
  if (configuredDebug === true) return true;
  return process.env.AGENT_PLAY_DEBUG === "1";
}

export function isAgentPlayVerboseEnabled(): boolean {
  if (process.env.AGENT_PLAY_VERBOSE === "1") return true;
  return isAgentPlayDebugEnabled();
}

const MAX_JSON_LENGTH = 2000;
const VERBOSE_JSON_LENGTH = 80_000;

function safeSerializeWithLimit(detail: unknown, maxLen: number): string {
  if (detail === undefined) return "";
  try {
    const seen = new WeakSet<object>();
    const json = JSON.stringify(detail, (_k, v: unknown) => {
      if (typeof v === "object" && v !== null) {
        if (seen.has(v)) return "[Circular]";
        seen.add(v);
      }
      if (typeof v === "bigint") return String(v);
      return v;
    });
    if (typeof json !== "string") return String(detail);
    return json.length > maxLen ? `${json.slice(0, maxLen)}…` : json;
  } catch {
    return String(detail);
  }
}

function safeSerialize(detail: unknown): string {
  return safeSerializeWithLimit(detail, MAX_JSON_LENGTH);
}

export function agentPlayDebug(
  scope: string,
  message: string,
  detail?: unknown
): void {
  if (!isAgentPlayDebugEnabled()) return;
  const tail =
    detail === undefined ? "" : ` ${safeSerialize(detail)}`;
  console.debug(`[agent-play:${scope}] ${message}${tail}`);
}

export function agentPlayVerbose(
  scope: string,
  message: string,
  detail?: unknown
): void {
  if (!isAgentPlayVerboseEnabled()) return;
  const tail =
    detail === undefined
      ? ""
      : ` ${safeSerializeWithLimit(detail, VERBOSE_JSON_LENGTH)}`;
  console.info(`[agent-play:${scope}] ${message}${tail}`);
}
