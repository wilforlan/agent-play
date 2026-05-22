import { afterEach, describe, expect, it, vi } from "vitest";
import { nodeCredentialsMaterialFromHumanPassphrase } from "@agent-play/node-tools/browser";
import {
  mainNodeValidateAuthHeaders,
  parseHumanCredentialsUpload,
  resolveDeploymentServerUrlFromApiBase,
  resolveNodesValidateUrl,
  restoreMainNodeFromCredentials,
} from "./preview-human-node-restore.js";

describe("parseHumanCredentialsUpload", () => {
  it("parses CLI credentials.json with serverUrl", () => {
    const parsed = parseHumanCredentialsUpload({
      serverUrl: "http://127.0.0.1:3000/",
      nodeId: "abc-node",
      passw: "amber angle apple arch atlas aura autumn bamboo beacon birch",
    });
    expect(parsed).toEqual({
      nodeId: "abc-node",
      passw: "amber angle apple arch atlas aura autumn bamboo beacon birch",
      serverUrl: "http://127.0.0.1:3000",
    });
  });

  it("parses browser session backup without serverUrl", () => {
    const parsed = parseHumanCredentialsUpload({
      nodeId: "nid-1",
      passw: "word one two three four five six seven eight nine ten",
    });
    expect(parsed).toEqual({
      nodeId: "nid-1",
      passw: "word one two three four five six seven eight nine ten",
      serverUrl: undefined,
    });
  });

  it("returns null for invalid shapes", () => {
    expect(parseHumanCredentialsUpload(null)).toBeNull();
    expect(parseHumanCredentialsUpload({})).toBeNull();
    expect(
      parseHumanCredentialsUpload({
        serverUrl: "http://x",
        nodeId: "y",
      })
    ).toBeNull();
  });
});

describe("resolveDeploymentServerUrlFromApiBase", () => {
  it("strips /api/agent-play suffix", () => {
    expect(
      resolveDeploymentServerUrlFromApiBase(
        "https://play.example.com/api/agent-play"
      )
    ).toBe("https://play.example.com");
  });
});

describe("resolveNodesValidateUrl", () => {
  it("appends /nodes/validate under /api/agent-play api base", () => {
    expect(
      resolveNodesValidateUrl("https://play.example.com/api/agent-play")
    ).toBe("https://play.example.com/api/agent-play/nodes/validate");
  });

  it("appends /nodes/validate under public /agent-play api base", () => {
    expect(resolveNodesValidateUrl("/agent-play")).toBe(
      "/agent-play/nodes/validate"
    );
  });

  it("uses /api/nodes/validate for a bare deployment origin", () => {
    expect(resolveNodesValidateUrl("https://play.example.com")).toBe(
      "https://play.example.com/api/nodes/validate"
    );
  });
});

describe("mainNodeValidateAuthHeaders", () => {
  it("sends x-node-id and hashed passphrase as x-node-passw", () => {
    const phrase =
      "amber angle apple arch atlas aura autumn bamboo beacon birch";
    const headers = mainNodeValidateAuthHeaders({
      nodeId: "node-abc",
      passw: phrase,
    });
    expect(headers["x-node-id"]).toBe("node-abc");
    expect(headers["x-node-passw"]).toBe(
      nodeCredentialsMaterialFromHumanPassphrase(phrase)
    );
  });
});

describe("restoreMainNodeFromCredentials", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const phrase =
    "amber angle apple arch atlas aura autumn bamboo beacon birch";
  const nodeId = "fixture-main-node-id";

  it("rejects when credentials serverUrl targets a different deployment", async () => {
    const result = await restoreMainNodeFromCredentials({
      apiBase: "https://play.example.com/api/agent-play",
      credentials: {
        nodeId,
        passw: phrase,
        serverUrl: "https://other.example.com",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("different server");
    }
  });

  it("validates on the server with node auth headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ ok: true, nodeKind: "main" })
      )
    );
    const result = await restoreMainNodeFromCredentials({
      apiBase: "https://play.example.com/api/agent-play",
      credentials: { nodeId, passw: phrase },
    });
    expect(result).toEqual({ ok: true, nodeId });
    const expectedHeaders = mainNodeValidateAuthHeaders({ nodeId, passw: phrase });
    expect(fetch).toHaveBeenCalledWith(
      resolveNodesValidateUrl("https://play.example.com/api/agent-play"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining(expectedHeaders),
        body: JSON.stringify({ nodeId }),
      })
    );
  });

  it("surfaces server validation failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ ok: false, reason: "passwHash mismatch" }, { status: 400 })
      )
    );
    const result = await restoreMainNodeFromCredentials({
      apiBase: "https://play.example.com/api/agent-play",
      credentials: { nodeId, passw: phrase },
    });
    expect(result).toEqual({
      ok: false,
      reason: "passwHash mismatch",
    });
  });

  it("rejects when server reports a non-main node", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ ok: true, nodeKind: "agent" })
      )
    );
    const result = await restoreMainNodeFromCredentials({
      apiBase: "https://play.example.com/api/agent-play",
      credentials: { nodeId, passw: phrase },
    });
    expect(result).toEqual({
      ok: false,
      reason: "Credentials are not for a main node on this server.",
    });
  });
});
