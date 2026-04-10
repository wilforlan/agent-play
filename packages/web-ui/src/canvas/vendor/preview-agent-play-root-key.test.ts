// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAgentPlayRootKeyForBrowser } from "./preview-agent-play-root-key.js";

describe("resolveAgentPlayRootKeyForBrowser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns rootKey from bootstrap JSON when env is unset", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ rootKey: "  AbcRoot  " })
      )
    );
    const k = await resolveAgentPlayRootKeyForBrowser({
      apiBase: "https://example.com/api/agent-play",
    });
    expect(k).toBe("abcroot");
    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/api/agent-play/bootstrap"
    );
  });

  it("throws when bootstrap fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 503 }))
    );
    await expect(
      resolveAgentPlayRootKeyForBrowser({
        apiBase: "https://example.com/api/agent-play",
      })
    ).rejects.toThrow(/503/);
  });
});
