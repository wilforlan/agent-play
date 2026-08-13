import { describe, expect, it, vi, afterEach } from "vitest";
import {
  GEOGRAPHY_PUBLISH_INTERVAL_MS,
  formatShortNodeId,
  postGeographyLeave,
  postGeographyPresence,
  resolveWorldGeographyPresenceTick,
  shouldEnsureWorldGeographyMesh,
} from "./preview-world-geography.js";

describe("preview-world-geography", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes a publish interval for throttling", () => {
    expect(GEOGRAPHY_PUBLISH_INTERVAL_MS).toBeGreaterThan(0);
  });

  it("truncates node ids to about 8 characters for pawn labels", () => {
    expect(formatShortNodeId("abcdefghijklmnop")).toBe("abcdefgh");
    expect(formatShortNodeId("short")).toBe("short");
    expect(
      formatShortNodeId(
        "46d21b68e3d9192b6c4deec62a9f43f6603a110ea6a436a1e6f905d64da6a2fb"
      )
    ).toBe("46d21b68");
  });

  it("posts presence to geography API", async () => {
    const fetchMock = vi.fn<
      (url: string, init?: RequestInit) => Promise<{ ok: boolean }>
    >(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await postGeographyPresence({
      apiBase: "/api/agent-play",
      sid: "sid-1",
      humanId: "node-a",
      name: "Ada",
      x: 1,
      y: 2,
      facing: "right",
      isMoving: true,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call;
    expect(url).toContain("/geography?sid=sid-1");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body.humanId).toBe("node-a");
    expect(body.x).toBe(1);
    expect(body.isMoving).toBe(true);
  });

  it("posts leave to geography API", async () => {
    const fetchMock = vi.fn<
      (url: string, init?: RequestInit) => Promise<{ ok: boolean }>
    >(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await postGeographyLeave({
      apiBase: "/api/agent-play",
      sid: "sid-1",
      humanId: "node-a",
    });
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const body = JSON.parse(String(call[1]?.body)) as Record<string, unknown>;
    expect(body.leave).toBe(true);
  });

  it("ensures the mesh when geography is enabled but not yet started", () => {
    expect(
      shouldEnsureWorldGeographyMesh({
        worldGeographyEnabled: true,
        meshSessionActive: false,
      })
    ).toBe(true);
    expect(
      shouldEnsureWorldGeographyMesh({
        worldGeographyEnabled: true,
        meshSessionActive: true,
      })
    ).toBe(false);
    expect(
      shouldEnsureWorldGeographyMesh({
        worldGeographyEnabled: false,
        meshSessionActive: false,
      })
    ).toBe(false);
  });

  it("resolves presence ticks to start the mesh on load when enabled", () => {
    expect(
      resolveWorldGeographyPresenceTick({
        worldGeographyEnabled: true,
        meshSessionActive: false,
      })
    ).toBe("ensure_mesh");
    expect(
      resolveWorldGeographyPresenceTick({
        worldGeographyEnabled: true,
        meshSessionActive: true,
      })
    ).toBe("tick_mesh");
    expect(
      resolveWorldGeographyPresenceTick({
        worldGeographyEnabled: false,
        meshSessionActive: false,
      })
    ).toBe("noop");
  });
});
