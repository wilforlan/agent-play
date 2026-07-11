// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadHumanCredentialsJson } from "./preview-human-credentials.js";

describe("downloadHumanCredentialsJson", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(anchor.style.display).toBe("none");
    expect(anchor.href).toContain("blob:");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(document.body.contains(anchor)).toBe(false);
  });
});
