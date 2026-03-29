import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ensurePreviewSessionId,
  PREVIEW_SESSION_STORAGE_KEY,
  persistPreviewSessionId,
} from "./preview-session-id.js";

describe("preview session id", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("ensurePreviewSessionId reconciles server sid when storage exists", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
    vi.stubGlobal("location", { search: "" });
    persistPreviewSessionId("sid-a");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ sid: "sid-a" }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const sid = await ensurePreviewSessionId();
    expect(sid).toBe("sid-a");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agent-play/session",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("ensurePreviewSessionId fetches and persists when storage is empty", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
    vi.stubGlobal("location", { search: "" });
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ sid: "sid-b" }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const sid = await ensurePreviewSessionId();
    expect(sid).toBe("sid-b");
    expect(store.get(PREVIEW_SESSION_STORAGE_KEY)).toBe("sid-b");
  });

  it("ensurePreviewSessionId falls back to URL sid when fetch is not ok", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
    vi.stubGlobal("location", { search: "?sid=from-url" });
    const fetchMock = vi.fn(async () => new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const sid = await ensurePreviewSessionId();
    expect(sid).toBe("from-url");
    expect(fetchMock).toHaveBeenCalled();
    expect(store.get(PREVIEW_SESSION_STORAGE_KEY)).toBe("from-url");
  });
});
