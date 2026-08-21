import { afterEach, describe, expect, it, vi } from "vitest";
import { generateNodePassphraseWordCount } from "./passphrase-passw.js";
import {
  passphraseAdjectives,
  passphraseAdverbs,
  passphraseNouns,
  passphraseVerbs,
  passphraseWordlistTotalCount,
} from "./passphrase-wordlist-data.js";

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

  it("keeps large unique morpheme buckets so generated passphrases rarely collide", () => {
    expect(new Set(passphraseNouns).size).toBe(passphraseNouns.length);
    expect(new Set(passphraseVerbs).size).toBe(passphraseVerbs.length);
    expect(new Set(passphraseAdjectives).size).toBe(passphraseAdjectives.length);
    expect(new Set(passphraseAdverbs).size).toBe(passphraseAdverbs.length);
    expect(passphraseNouns.length).toBeGreaterThan(11000);
    expect(passphraseVerbs.length).toBeGreaterThan(2000);
    expect(passphraseAdjectives.length).toBeGreaterThan(900);
    expect(passphraseAdverbs.length).toBeGreaterThan(300);
    expect(passphraseWordlistTotalCount).toBe(
      passphraseNouns.length +
        passphraseVerbs.length +
        passphraseAdjectives.length +
        passphraseAdverbs.length
    );
    expect(passphraseWordlistTotalCount).toBeGreaterThan(15000);
    expect(passphraseVerbs).toContain("accepted");
    expect(passphraseVerbs).toContain("adding");
  });
});
