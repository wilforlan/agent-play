/**
 * @module @agent-play/play-ui/preview-human-node-restore
 * Parse uploaded credentials.json and restore a main node connection in the browser.
 */
import {
  nodeCredentialFromHumanPhrase,
  nodeCredentialsMaterialFromHumanPassphrase,
} from "@agent-play/node-tools/browser";

export type HumanCredentialsUpload = {
  nodeId: string;
  passw: string;
  serverUrl?: string | undefined;
};

export type RestoreMainNodeResult =
  | { ok: true; nodeId: string }
  | { ok: false; reason: string };

function normalizeServerUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

const PLAY_API_BASE_SUFFIXES = ["/api/agent-play", "/agent-play"] as const;

function resolveApiOriginPrefix(apiBase: string): string {
  const base = apiBase.replace(/\/$/, "");
  for (const suffix of PLAY_API_BASE_SUFFIXES) {
    if (base.endsWith(suffix)) {
      return base.slice(0, -suffix.length);
    }
  }
  return base;
}

export function resolveDeploymentServerUrlFromApiBase(apiBase: string): string {
  const prefix = resolveApiOriginPrefix(apiBase);
  if (prefix.length > 0) {
    return prefix;
  }
  if (typeof window !== "undefined" && window.location.origin.length > 0) {
    return window.location.origin;
  }
  return "";
}

export function resolveNodesValidateUrl(apiBase: string): string {
  const base = apiBase.replace(/\/$/, "");
  for (const suffix of PLAY_API_BASE_SUFFIXES) {
    if (base.endsWith(suffix)) {
      return `${base}/nodes/validate`;
    }
  }
  return `${base}/api/nodes/validate`;
}

export function parseHumanCredentialsUpload(
  json: unknown
): HumanCredentialsUpload | null {
  if (typeof json !== "object" || json === null) {
    return null;
  }
  const o = json as {
    serverUrl?: unknown;
    nodeId?: unknown;
    passw?: unknown;
  };
  if (typeof o.nodeId !== "string" || typeof o.passw !== "string") {
    return null;
  }
  const nodeId = o.nodeId.trim();
  const passw = o.passw;
  if (nodeId.length === 0 || passw.length === 0) {
    return null;
  }
  const serverUrl =
    typeof o.serverUrl === "string" && o.serverUrl.trim().length > 0
      ? normalizeServerUrl(o.serverUrl)
      : undefined;
  return { nodeId, passw, serverUrl };
}

export function verifyLocalMainNodeCredential(options: {
  nodeId: string;
  passw: string;
  rootKey: string;
}): boolean {
  const derived = nodeCredentialFromHumanPhrase({
    phrase: options.passw,
    rootKey: options.rootKey,
  });
  return derived.nodeId === options.nodeId.trim();
}

function credentialsServerMatchesDeployment(options: {
  credentialsServerUrl: string | undefined;
  apiBase: string;
}): { ok: true } | { ok: false; reason: string } {
  if (options.credentialsServerUrl === undefined) {
    return { ok: true };
  }
  const expected = normalizeServerUrl(
    resolveDeploymentServerUrlFromApiBase(options.apiBase)
  );
  const fromFile = normalizeServerUrl(options.credentialsServerUrl);
  if (fromFile === expected) {
    return { ok: true };
  }
  return {
    ok: false,
    reason: `credentials.json is for a different server (${fromFile}); this session uses ${expected}.`,
  };
}

export function mainNodeValidateAuthHeaders(options: {
  nodeId: string;
  passw: string;
}): Record<string, string> {
  return {
    "x-node-id": options.nodeId.trim(),
    "x-node-passw": nodeCredentialsMaterialFromHumanPassphrase(options.passw),
  };
}

export async function validateMainNodeOnServer(options: {
  apiBase: string;
  nodeId: string;
  passw: string;
}): Promise<{ ok: boolean; reason?: string; nodeKind?: string }> {
  const nodeId = options.nodeId.trim();
  const res = await fetch(resolveNodesValidateUrl(options.apiBase), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...mainNodeValidateAuthHeaders({
        nodeId,
        passw: options.passw,
      }),
    },
    body: JSON.stringify({ nodeId }),
  });
  let json: unknown;
  try {
    json = (await res.json()) as unknown;
  } catch {
    return { ok: false, reason: `HTTP ${String(res.status)}` };
  }
  if (typeof json !== "object" || json === null) {
    return { ok: false, reason: `HTTP ${String(res.status)}` };
  }
  const obj = json as { ok?: unknown; reason?: unknown; nodeKind?: unknown };
  if (obj.ok !== true) {
    const reason =
      typeof obj.reason === "string"
        ? obj.reason
        : `HTTP ${String(res.status)}`;
    return { ok: false, reason };
  }
  const nodeKind =
    typeof obj.nodeKind === "string" ? obj.nodeKind : undefined;
  return { ok: true, nodeKind };
}

export async function restoreMainNodeFromCredentials(options: {
  apiBase: string;
  credentials: HumanCredentialsUpload;
}): Promise<RestoreMainNodeResult> {
  const serverMatch = credentialsServerMatchesDeployment({
    credentialsServerUrl: options.credentials.serverUrl,
    apiBase: options.apiBase,
  });
  if (!serverMatch.ok) {
    return { ok: false, reason: serverMatch.reason };
  }
  const server = await validateMainNodeOnServer({
    apiBase: options.apiBase,
    nodeId: options.credentials.nodeId,
    passw: options.credentials.passw,
  });
  if (!server.ok) {
    return {
      ok: false,
      reason: server.reason ?? "Main node validation failed.",
    };
  }
  if (server.nodeKind !== undefined && server.nodeKind !== "main") {
    return {
      ok: false,
      reason: "Credentials are not for a main node on this server.",
    };
  }
  return { ok: true, nodeId: options.credentials.nodeId.trim() };
}
