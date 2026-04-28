import { beforeEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({
  track: trackMock,
}));

import {
  reportP2aToggleIfChanged,
  reportPresentationEvent,
} from "./presentation-analytics.js";

describe("presentation-analytics", () => {
  beforeEach(() => {
    trackMock.mockClear();
  });

  it("forwards AssistAction to track with no custom payload", () => {
    reportPresentationEvent("AssistAction");
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("AssistAction");
  });

  it("reports EnableP2A when P2A toggles from off to on", () => {
    reportP2aToggleIfChanged(false, true);
    expect(trackMock).toHaveBeenCalledWith("EnableP2A");
  });

  it("reports DisableP2A when P2A toggles from on to off", () => {
    reportP2aToggleIfChanged(true, false);
    expect(trackMock).toHaveBeenCalledWith("DisableP2A");
  });

  it("does not call track when P2A value is unchanged", () => {
    reportP2aToggleIfChanged(true, true);
    expect(trackMock).not.toHaveBeenCalled();
  });
});
