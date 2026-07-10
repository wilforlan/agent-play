import { beforeEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());
const getPreviewSessionIdSyncMock = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({
  track: trackMock,
}));

vi.mock("./preview-session-id.js", () => ({
  getPreviewSessionIdSync: getPreviewSessionIdSyncMock,
}));

import {
  reportP2aToggleIfChanged,
  reportPresentationEvent,
} from "./presentation-analytics.js";

describe("presentation-analytics", () => {
  beforeEach(() => {
    trackMock.mockClear();
    fetchMock.mockReset();
    getPreviewSessionIdSyncMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({ ok: true });
  });

  it("forwards AssistAction to track with no custom payload", () => {
    getPreviewSessionIdSyncMock.mockReturnValue(null);
    reportPresentationEvent("AssistAction");
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("AssistAction");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dual-writes UI Presentation Action when sid is available", () => {
    getPreviewSessionIdSyncMock.mockReturnValue("sid-1");
    reportPresentationEvent("ChatAction");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics/track?sid=sid-1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          event: "UI Presentation Action",
          distinctId: "sid-1",
          properties: { action: "ChatAction" },
        }),
      })
    );
  });

  it("reports EnableP2A when P2A toggles from off to on", () => {
    getPreviewSessionIdSyncMock.mockReturnValue(null);
    reportP2aToggleIfChanged(false, true);
    expect(trackMock).toHaveBeenCalledWith("EnableP2A");
  });

  it("reports DisableP2A when P2A toggles from on to off", () => {
    getPreviewSessionIdSyncMock.mockReturnValue(null);
    reportP2aToggleIfChanged(true, false);
    expect(trackMock).toHaveBeenCalledWith("DisableP2A");
  });

  it("does not call track when P2A value is unchanged", () => {
    reportP2aToggleIfChanged(true, true);
    expect(trackMock).not.toHaveBeenCalled();
  });
});
