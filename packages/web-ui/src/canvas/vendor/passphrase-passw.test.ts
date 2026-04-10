import { afterEach, describe, expect, it, vi } from "vitest";
import { generateNodePassphraseWordCount } from "./passphrase-passw.js";

describe("generateNodePassphraseWordCount", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the requested number of space-separated words", () => {
    let n = 0;
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint32Array) => {
        arr[0] = n;
        n += 97;
        return arr;
      },
    });
    const s = generateNodePassphraseWordCount(10);
    expect(s.split(/\s+/).length).toBe(10);
  });

  it("rejects non-positive wordCount", () => {
    expect(() => generateNodePassphraseWordCount(0)).toThrow();
    expect(() => generateNodePassphraseWordCount(-1)).toThrow();
  });
});
