/**
 * Captures `?rc=` referral codes into sessionStorage for citizen onboarding.
 */
export const PREVIEW_REFERRAL_STORAGE_KEY = "agent-play:referral-code";

const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{8}$/;

export const normalizeReferralCode = (raw: string): string =>
  raw.trim().toUpperCase();

export const isValidReferralCode = (code: string): boolean =>
  REFERRAL_CODE_PATTERN.test(code);

export const parseReferralCode = (
  raw: string | null | undefined,
): string | null => {
  if (raw === null || raw === undefined) {
    return null;
  }
  const normalized = normalizeReferralCode(raw);
  return isValidReferralCode(normalized) ? normalized : null;
};

export function persistPreviewReferralCode(code: string): void {
  try {
    sessionStorage.setItem(PREVIEW_REFERRAL_STORAGE_KEY, code);
  } catch {
    return;
  }
}

export function readPreviewReferralCode(): string | null {
  try {
    return parseReferralCode(sessionStorage.getItem(PREVIEW_REFERRAL_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function capturePreviewReferralCodeFromUrl(
  search: string = typeof location !== "undefined" ? location.search : "",
): string | null {
  const fromUrl = parseReferralCode(new URLSearchParams(search).get("rc"));
  if (fromUrl === null) {
    return readPreviewReferralCode();
  }
  const previous = readPreviewReferralCode();
  persistPreviewReferralCode(fromUrl);
  if (previous !== fromUrl) {
    void reportReferralClick(fromUrl);
  }
  return fromUrl;
}

async function reportReferralClick(code: string): Promise<void> {
  try {
    await fetch("/api/referrals/click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
  } catch {
    return;
  }
}
