// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import {
  deepLogObject,
  deepLogTree,
  deepLogText,
  isDeepLogsEnabled,
} from "./browser-deep-logs.js";
import { resetPreviewViewSettings, setPreviewViewSettings } from "./preview-view-settings.js";

describe("browser deep logs", () => {
  it("reports enablement from view settings", () => {
    resetPreviewViewSettings();
    setPreviewViewSettings({ deepLogsEnabled: true });
    expect(isDeepLogsEnabled()).toBe(true);
    setPreviewViewSettings({ deepLogsEnabled: false });
    expect(isDeepLogsEnabled()).toBe(false);
  });

  it("logs text/object/tree safely when enabled", () => {
    resetPreviewViewSettings();
    setPreviewViewSettings({ deepLogsEnabled: true });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(() => deepLogText("hello", { x: 1 })).not.toThrow();
    expect(() => deepLogObject("obj", circular)).not.toThrow();
    expect(() =>
      deepLogTree("tree", {
        label: "root",
        children: [{ label: "a", children: [{ label: "b" }] }],
      })
    ).not.toThrow();
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});
