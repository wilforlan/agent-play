// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadHumanCredentialsJson } from "./preview-human-credentials.js";

describe("downloadHumanCredentialsJson", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "showSaveFilePicker");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, "showSaveFilePicker");
  });

  it("appends a hidden anchor to the document and clicks it", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click");

    downloadHumanCredentialsJson({
      nodeId: "node-abc",
      passw: "alpha bravo charlie delta echo foxtrot golf hotel india juliet",
      serverUrl: "https://example.com/",
    });

    expect(appendSpy).toHaveBeenCalledTimes(1);
    const anchor = appendSpy.mock.calls[0]?.[0];
    expect(anchor).toBeInstanceOf(HTMLAnchorElement);
    if (!(anchor instanceof HTMLAnchorElement)) {
      throw new Error("expected anchor element");
    }
    expect(anchor.download).toBe("credentials.json");
    expect(anchor.href).toContain("blob:");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(document.body.contains(anchor)).toBe(true);
  });

  it("keeps the anchor and blob url until the browser can start the download", () => {
    vi.useFakeTimers();
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const appendSpy = vi.spyOn(document.body, "appendChild");

    downloadHumanCredentialsJson({
      nodeId: "node-abc",
      passw: "alpha bravo charlie",
    });

    const anchor = appendSpy.mock.calls[0]?.[0];
    if (!(anchor instanceof HTMLAnchorElement)) {
      throw new Error("expected anchor element");
    }
    expect(document.body.contains(anchor)).toBe(true);
    expect(revokeSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(document.body.contains(anchor)).toBe(true);
    expect(revokeSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(document.body.contains(anchor)).toBe(false);
    expect(revokeSpy).toHaveBeenCalledTimes(1);
  });

  it("writes credentials through showSaveFilePicker when available", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const createWritable = vi
      .fn()
      .mockResolvedValue({ write, close });
    const showSaveFilePicker = vi
      .fn()
      .mockResolvedValue({ createWritable });
    window.showSaveFilePicker = showSaveFilePicker;

    downloadHumanCredentialsJson({
      nodeId: "node-abc",
      passw: "alpha bravo charlie",
      serverUrl: "https://example.com",
    });

    await vi.waitFor(() => {
      expect(showSaveFilePicker).toHaveBeenCalledWith({
        suggestedName: "credentials.json",
        types: [
          {
            description: "JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });
    });
    await vi.waitFor(() => {
      expect(write).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});
