/**
 * @module @agent-play/play-ui/overworld-fixed-panel-position
 * Viewport placement for body-mounted overworld panels (house buy, parking ticket).
 *
 * Canvas host is CSS-scaled via `transform: scale(...)`. Logical coords in
 * VIEW_W×VIEW_H space must be mapped through the host's bounding rect before
 * applying `position: fixed` left/top, then clamped to the browser viewport.
 */

export type CanvasHostRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ViewportPoint = {
  x: number;
  y: number;
};

export type FixedPanelPosition = {
  left: number;
  top: number;
};

export type CanvasHostLocalToViewportOptions = {
  hostRect: CanvasHostRect;
  localX: number;
  localY: number;
  viewW: number;
  viewH: number;
};

export type ClampFixedPanelToViewportOptions = {
  left: number;
  top: number;
  panelWidth: number;
  panelHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  marginPx?: number;
};

export type ComputeHousePurchasePanelPositionOptions = {
  hostRect: CanvasHostRect;
  viewW: number;
  viewH: number;
  panelWidth: number;
  panelHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  marginPx?: number;
  /** Vertical fraction of the logical canvas (0–1). Default 0.55. */
  localYFraction?: number;
};

export type ComputeParkingTicketTooltipPositionOptions = {
  hostRect: CanvasHostRect;
  localX: number;
  localY: number;
  viewW: number;
  viewH: number;
  panelWidth: number;
  panelHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  marginPx?: number;
  gapAbovePx?: number;
};

export function canvasHostLocalToViewport(
  options: CanvasHostLocalToViewportOptions
): ViewportPoint {
  const { hostRect, localX, localY, viewW, viewH } = options;
  const scaleX = hostRect.width / viewW;
  const scaleY = hostRect.height / viewH;
  return {
    x: hostRect.left + localX * scaleX,
    y: hostRect.top + localY * scaleY,
  };
}

export function clampFixedPanelToViewport(
  options: ClampFixedPanelToViewportOptions
): FixedPanelPosition {
  const marginPx = options.marginPx ?? 8;
  const {
    panelWidth,
    panelHeight,
    viewportWidth,
    viewportHeight,
  } = options;

  let left = options.left;
  let top = options.top;

  const maxLeft = Math.max(marginPx, viewportWidth - panelWidth - marginPx);
  const maxTop = Math.max(marginPx, viewportHeight - panelHeight - marginPx);

  if (left < marginPx) {
    left = marginPx;
  }
  if (left > maxLeft) {
    left = maxLeft;
  }
  if (top < marginPx) {
    top = marginPx;
  }
  if (top > maxTop) {
    top = maxTop;
  }

  return { left, top };
}

export function computeHousePurchasePanelPosition(
  options: ComputeHousePurchasePanelPositionOptions
): FixedPanelPosition {
  const localYFraction = options.localYFraction ?? 0.55;
  const anchor = canvasHostLocalToViewport({
    hostRect: options.hostRect,
    localX: options.viewW * 0.5,
    localY: options.viewH * localYFraction,
    viewW: options.viewW,
    viewH: options.viewH,
  });
  return clampFixedPanelToViewport({
    left: anchor.x - options.panelWidth / 2,
    top: anchor.y,
    panelWidth: options.panelWidth,
    panelHeight: options.panelHeight,
    viewportWidth: options.viewportWidth,
    viewportHeight: options.viewportHeight,
    marginPx: options.marginPx,
  });
}

export function computeParkingTicketTooltipPosition(
  options: ComputeParkingTicketTooltipPositionOptions
): FixedPanelPosition {
  const gapAbovePx = options.gapAbovePx ?? 12;
  const anchor = canvasHostLocalToViewport({
    hostRect: options.hostRect,
    localX: options.localX,
    localY: options.localY,
    viewW: options.viewW,
    viewH: options.viewH,
  });
  return clampFixedPanelToViewport({
    left: anchor.x - options.panelWidth / 2,
    top: anchor.y - options.panelHeight - gapAbovePx,
    panelWidth: options.panelWidth,
    panelHeight: options.panelHeight,
    viewportWidth: options.viewportWidth,
    viewportHeight: options.viewportHeight,
    marginPx: options.marginPx,
  });
}
