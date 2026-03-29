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

const MAX_JSON_LENGTH = 2000;

function safeSerialize(detail: unknown): string {
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
    return json.length > MAX_JSON_LENGTH
      ? `${json.slice(0, MAX_JSON_LENGTH)}…`
      : json;
  } catch {
    return String(detail);
  }
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
