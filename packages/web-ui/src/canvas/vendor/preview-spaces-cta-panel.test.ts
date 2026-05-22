// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  PREVIEW_SPACES_CTA_DISMISSED_STORAGE_KEY,
  computeSpacesCtaPlacement,
  createPreviewSpacesCtaPanel,
} from "./preview-spaces-cta-panel.js";

describe("createPreviewSpacesCtaPanel", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders a headline that hooks the user toward spaces", () => {
    const panel = createPreviewSpacesCtaPanel();
    document.body.append(panel.element);

    const heading = panel.element.querySelector("h3");

    expect(heading).not.toBeNull();
    expect(heading?.textContent?.toLowerCase()).toContain("space");
  });

  it("invites the user to /platform via a clearly labeled call to action", () => {
    const panel = createPreviewSpacesCtaPanel();
    document.body.append(panel.element);

    const cta = panel.element.querySelector<HTMLAnchorElement>(
      "a[data-testid='preview-spaces-cta-button']"
    );

    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toBe("/platform");
    expect(cta?.textContent?.toLowerCase()).toMatch(/space|platform|create/);
  });

  it("teases an AQL snippet so users can preview the language", () => {
    const panel = createPreviewSpacesCtaPanel();
    document.body.append(panel.element);

    const code = panel.element.querySelector("code");

    expect(code).not.toBeNull();
    expect(code?.textContent?.toLowerCase()).toContain("space");
  });

  it("highlights spaces, amenities, and AQL as the value pillars", () => {
    const panel = createPreviewSpacesCtaPanel();
    document.body.append(panel.element);

    const text = panel.element.textContent?.toLowerCase() ?? "";

    expect(text).toContain("space");
    expect(text).toContain("amenit");
    expect(text).toContain("aql");
  });

  it("dismisses the panel and remembers the dismissal in localStorage", () => {
    const panel = createPreviewSpacesCtaPanel();
    document.body.append(panel.element);

    const dismiss = panel.element.querySelector<HTMLButtonElement>(
      "button[data-testid='preview-spaces-cta-dismiss']"
    );

    expect(dismiss).not.toBeNull();
    expect(panel.element.hidden).toBe(false);

    dismiss?.click();

    expect(panel.element.hidden).toBe(true);
    expect(
      window.localStorage.getItem(PREVIEW_SPACES_CTA_DISMISSED_STORAGE_KEY)
    ).toBe("1");
  });

  it("renders hidden when a previous session already dismissed the panel", () => {
    window.localStorage.setItem(
      PREVIEW_SPACES_CTA_DISMISSED_STORAGE_KEY,
      "1"
    );

    const panel = createPreviewSpacesCtaPanel();

    expect(panel.element.hidden).toBe(true);
  });

  it("exposes an isDismissed predicate that mirrors visibility", () => {
    const panel = createPreviewSpacesCtaPanel();

    expect(panel.isDismissed()).toBe(false);

    panel.element
      .querySelector<HTMLButtonElement>(
        "button[data-testid='preview-spaces-cta-dismiss']"
      )
      ?.click();

    expect(panel.isDismissed()).toBe(true);
  });
});

describe("computeSpacesCtaPlacement", () => {
  const baseBounds = { left: 0, top: 0, width: 800, height: 600 };
  const gapPx = 12;
  const preferredHeight = 280;

  it("anchors directly below the messages panel using the bounds-local origin", () => {
    const placement = computeSpacesCtaPlacement({
      anchorRect: { left: 32, top: 16, width: 360, height: 200 },
      boundsRect: baseBounds,
      preferredHeightPx: preferredHeight,
      gapPx,
    });

    expect(placement.leftPx).toBe(32);
    expect(placement.topPx).toBe(228);
    expect(placement.maxHeightPx).toBeGreaterThan(0);
  });

  it("clamps the horizontal position so the panel does not run past the right edge", () => {
    const placement = computeSpacesCtaPlacement({
      anchorRect: { left: 720, top: 16, width: 360, height: 200 },
      boundsRect: baseBounds,
      preferredHeightPx: preferredHeight,
      gapPx,
      preferredWidthPx: 320,
    });

    expect(placement.leftPx + 320).toBeLessThanOrEqual(800);
  });

  it("clamps the vertical position so the panel does not fall off the bottom", () => {
    const placement = computeSpacesCtaPlacement({
      anchorRect: { left: 16, top: 480, width: 360, height: 100 },
      boundsRect: baseBounds,
      preferredHeightPx: preferredHeight,
      gapPx,
    });

    expect(placement.topPx).toBeLessThan(580);
    expect(placement.topPx + placement.maxHeightPx).toBeLessThanOrEqual(600);
  });

  it("shrinks max-height to fit when there is little room below the anchor", () => {
    const placement = computeSpacesCtaPlacement({
      anchorRect: { left: 16, top: 16, width: 360, height: 500 },
      boundsRect: baseBounds,
      preferredHeightPx: preferredHeight,
      gapPx,
    });

    expect(placement.maxHeightPx).toBeLessThan(preferredHeight);
    expect(placement.maxHeightPx).toBeGreaterThan(0);
    expect(placement.topPx + placement.maxHeightPx).toBeLessThanOrEqual(600);
  });

  it("never returns negative coordinates even if the anchor is offscreen", () => {
    const placement = computeSpacesCtaPlacement({
      anchorRect: { left: -200, top: -200, width: 360, height: 200 },
      boundsRect: baseBounds,
      preferredHeightPx: preferredHeight,
      gapPx,
    });

    expect(placement.leftPx).toBeGreaterThanOrEqual(0);
    expect(placement.topPx).toBeGreaterThanOrEqual(0);
  });
});

describe("createPreviewSpacesCtaPanel positioning", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    window.localStorage.clear();
  });

  it("registers as a floating panel so it positions above the canvas", () => {
    const panel = createPreviewSpacesCtaPanel();
    expect(panel.element.classList.contains("preview-floating-panel")).toBe(
      true
    );
    expect(
      panel.element.classList.contains("preview-floating-panel--spaces-cta")
    ).toBe(true);
  });

  it("refresh() writes the computed placement to inline styles", () => {
    const panel = createPreviewSpacesCtaPanel();
    document.body.append(panel.element);

    panel.refresh({
      anchorRect: { left: 24, top: 32, width: 360, height: 220 },
      boundsRect: { left: 0, top: 0, width: 800, height: 600 },
    });

    expect(panel.element.style.left).toBe("24px");
    expect(panel.element.style.top).toBe("264px");
    expect(panel.element.style.maxHeight.length).toBeGreaterThan(0);
  });

  it("refresh() is a no-op when the panel has been dismissed", () => {
    window.localStorage.setItem(
      PREVIEW_SPACES_CTA_DISMISSED_STORAGE_KEY,
      "1"
    );
    const panel = createPreviewSpacesCtaPanel();
    document.body.append(panel.element);

    panel.refresh({
      anchorRect: { left: 24, top: 32, width: 360, height: 220 },
      boundsRect: { left: 0, top: 0, width: 800, height: 600 },
    });

    expect(panel.element.style.left).toBe("");
    expect(panel.element.style.top).toBe("");
  });
});

