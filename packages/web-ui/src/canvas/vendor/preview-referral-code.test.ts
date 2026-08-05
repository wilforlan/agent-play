import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PREVIEW_REFERRAL_STORAGE_KEY,
  capturePreviewReferralCodeFromUrl,
  readPreviewReferralCode,
} from "./preview-referral-code.js";

describe("preview referral code", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("persists a valid rc from the URL and reports a click once", () => {
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
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const code = capturePreviewReferralCodeFromUrl("?rc=ab12cd34");
    expect(code).toBe("AB12CD34");
    expect(store.get(PREVIEW_REFERRAL_STORAGE_KEY)).toBe("AB12CD34");
    expect(readPreviewReferralCode()).toBe("AB12CD34");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/referrals/click",
      expect.objectContaining({ method: "POST" }),
    );

    fetchMock.mockClear();
    expect(capturePreviewReferralCodeFromUrl("?rc=ab12cd34")).toBe("AB12CD34");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores invalid rc values", () => {
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
    vi.stubGlobal("fetch", vi.fn());

    expect(capturePreviewReferralCodeFromUrl("?rc=bad")).toBeNull();
    expect(store.has(PREVIEW_REFERRAL_STORAGE_KEY)).toBe(false);
  });
});
