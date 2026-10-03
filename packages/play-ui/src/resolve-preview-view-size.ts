/**
 * Logical Pixi viewport size. Desktop keeps the classic 720×520 board;
 * narrow / mobile viewports use a taller board so letterboxing is less severe.
 */

export const PREVIEW_VIEW_WIDTH = 720;
export const PREVIEW_VIEW_HEIGHT_DESKTOP = 520;
export const PREVIEW_VIEW_HEIGHT_MOBILE = 820;
export const PREVIEW_MOBILE_VIEWPORT_MAX_WIDTH_PX = 767;

export const resolvePreviewViewSize = (input: {
  viewportWidth: number;
  viewportHeight?: number;
}): { width: number; height: number } => {
  const width = PREVIEW_VIEW_WIDTH;
  const isMobile =
    Number.isFinite(input.viewportWidth) &&
    input.viewportWidth > 0 &&
    input.viewportWidth <= PREVIEW_MOBILE_VIEWPORT_MAX_WIDTH_PX;
  if (!isMobile) {
    return { width, height: PREVIEW_VIEW_HEIGHT_DESKTOP };
  }
  const viewportHeight = input.viewportHeight;
  if (
    typeof viewportHeight === "number" &&
    Number.isFinite(viewportHeight) &&
    viewportHeight > 0
  ) {
    const matched = Math.round(
      (PREVIEW_VIEW_WIDTH * viewportHeight) / input.viewportWidth
    );
    const height = Math.max(
      PREVIEW_VIEW_HEIGHT_MOBILE,
      Math.min(980, matched)
    );
    return { width, height };
  }
  return { width, height: PREVIEW_VIEW_HEIGHT_MOBILE };
};
