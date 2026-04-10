/**
 * Optional structured `console.debug` for SDK internals; gated by {@link configureAgentPlayDebug} or `AGENT_PLAY_DEBUG=1`.
 */
type DebugConfigure = {
  /** When set, overrides environment: `true` forces debug on, `false` forces off. */
  debug?: boolean;
};

/**
 * In-memory override for debug enablement (undefined = follow env only).
 *
 * @remarks **Writers:** {@link configureAgentPlayDebug}, {@link resetAgentPlayDebug}.
 * **Readers:** {@link isAgentPlayDebugEnabled}.
 */
let configuredDebug: boolean | undefined;

/**
 * Sets whether SDK debug logging is enabled regardless of `AGENT_PLAY_DEBUG`.
 *
 * @param opts - Optional `{ debug }`: `true` / `false` forces logging; omit `debug` to clear override.
 *
 * @remarks **Callers:** tests and user code. **Callees:** none.
 */
export function configureAgentPlayDebug(opts: DebugConfigure): void {
  configuredDebug = opts.debug ?? undefined;
}

/**
 * Clears the in-memory override so only `AGENT_PLAY_DEBUG` applies.
 *
 * @remarks **Callers:** tests. **Callees:** none.
 */
export function resetAgentPlayDebug(): void {
  configuredDebug = undefined;
}

/**
 * @returns Whether debug logging should run: override wins, else `AGENT_PLAY_DEBUG === "1"`.
 *
 * @remarks **Callers:** {@link agentPlayDebug}. **Callees:** `process.env` read.
 */
export function isAgentPlayDebugEnabled(): boolean {
  if (configuredDebug === false) return false;
  if (configuredDebug === true) return true;
  return process.env.AGENT_PLAY_DEBUG === "1";
}

/** Max length of JSON detail string before truncation in the internal `safeSerialize` helper. */
const MAX_JSON_LENGTH = 2000;

/**
 * Serializes `detail` for log lines, truncating long JSON and handling circular refs.
 *
 * @internal
 * @remarks **Callers:** {@link agentPlayDebug} only. **Callees:** `JSON.stringify` with replacer.
 */
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

/**
 * Emits `console.debug` when {@link isAgentPlayDebugEnabled} is true.
 *
 * @param scope - Short label (e.g. `"langchain"`).
 * @param message - Human-readable message.
 * @param detail - Optional object serialized by the internal truncation helper (see source).
 *
 * @remarks **Callers:** {@link langchainRegistration} and other SDK modules. **Callees:** {@link isAgentPlayDebugEnabled} and the internal serializer.
 */
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
