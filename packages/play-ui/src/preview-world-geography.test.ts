import { describe, expect, it, vi, afterEach } from "vitest";
import {
  GEOGRAPHY_PUBLISH_INTERVAL_MS,
  postGeographyLeave,
  postGeographyPresence,
} from "./preview-world-geography.js";

describe("preview-world-geography", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes a publish interval for throttling", () => {
    expect(GEOGRAPHY_PUBLISH_INTERVAL_MS).toBeGreaterThan(0);
  });

  it("posts presence to geography API", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
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
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/geography?sid=sid-1");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.humanId).toBe("node-a");
    expect(body.x).toBe(1);
    expect(body.isMoving).toBe(true);
  });

  it("posts leave to geography API", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await postGeographyLeave({
      apiBase: "/api/agent-play",
      sid: "sid-1",
      humanId: "node-a",
    });
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)
    ) as Record<string, unknown>;
    expect(body.leave).toBe(true);
  });
});
