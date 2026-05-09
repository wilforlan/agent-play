type JsonObject = Record<string, unknown>;
type JsonWithHttpMeta = JsonObject & {
  __http?: {
    status: number;
    headers: Record<string, string>;
  };
};

export type PlaygroundRuntimeClient = {
  ensureSession: () => Promise<{ sid: string }>;
  fetchSnapshot: (input: { sid: string }) => Promise<JsonObject>;
  fetchSessionDetails: (input: { sid: string }) => Promise<JsonObject>;
  inspectMainNode: (input: { nodeId: string; passwordMaterial: string }) => Promise<JsonObject>;
  sendIntercomCommand: (input: {
    sid: string;
    requestId: string;
    mainNodeId: string;
    fromPlayerId: string;
    toPlayerId: string;
    kind: "chat" | "assist" | "realtime";
    text?: string;
    toolName?: string;
    args?: Record<string, unknown>;
  }) => Promise<JsonObject>;
};

async function requestJson(
  url: string,
  init?: RequestInit
): Promise<JsonWithHttpMeta> {
  const response = await fetch(url, init);
  const json = (await response.json()) as JsonObject;
  const headers: Record<string, string> = {};
  for (const [key, value] of response.headers.entries()) {
    headers[key] = value;
  }
  const withMeta: JsonWithHttpMeta = {
    ...json,
    __http: {
      status: response.status,
      headers,
    },
  };
  if (!response.ok) {
    const message =
      typeof json.error === "string"
        ? json.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return withMeta;
}

export function createRuntimeClient(baseUrl: string): PlaygroundRuntimeClient {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return {
    ensureSession: async () => {
      const data = await requestJson(`${normalizedBase}/api/agent-play/session`);
      const sid = data.sid;
      if (typeof sid !== "string" || sid.length === 0) {
        throw new Error("Session response missing sid");
      }
      return { sid };
    },
    fetchSnapshot: async ({ sid }) =>
      requestJson(
        `${normalizedBase}/api/agent-play/sdk/rpc?sid=${encodeURIComponent(sid)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ op: "getWorldSnapshot", payload: {} }),
        }
      ),
    fetchSessionDetails: async ({ sid }) =>
      requestJson(
        `${normalizedBase}/api/agent-play/session/details?sid=${encodeURIComponent(
          sid
        )}&includeSnapshot=1&eventsLimit=50`
      ),
    inspectMainNode: async ({ nodeId, passwordMaterial }) =>
      requestJson(`${normalizedBase}/api/nodes`, {
        headers: {
          "x-node-id": nodeId,
          "x-node-passw": passwordMaterial,
        },
      }),
    sendIntercomCommand: async (input) =>
      requestJson(
        `${normalizedBase}/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            op: "intercomCommand",
            payload: {
              requestId: input.requestId,
              mainNodeId: input.mainNodeId,
              fromPlayerId: input.fromPlayerId,
              toPlayerId: input.toPlayerId,
              kind: input.kind,
              ...(input.text !== undefined ? { text: input.text } : {}),
              ...(input.toolName !== undefined ? { toolName: input.toolName } : {}),
              ...(input.args !== undefined ? { args: input.args } : {}),
            },
          }),
        }
      ),
  };
}
