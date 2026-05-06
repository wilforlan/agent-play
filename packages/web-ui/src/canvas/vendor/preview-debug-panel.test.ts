// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { createPreviewDebugPanel } from "./preview-debug-panel.js";

describe("createPreviewDebugPanel", () => {
  it("renders map toggles and updates settings", () => {
    const onGridToggle = vi.fn();
    const onComponentToggle = vi.fn();
    const onComponentSettingsChange = vi.fn();
    const panel = createPreviewDebugPanel({
      getSnapshot: () => ({
        agents: [],
        structures: [],
      }),
      getDebugOptions: () => ({
        showMapGrids: false,
        showMapComponents: false,
        mapWaterAreaScale: 1,
        mapGrassBandTopRatio: 0.58,
        mapTreeDensity: 1,
        mapBenchDensity: 1,
        mapAirplaneCount: 3,
      }),
      onGridToggle,
      onComponentToggle,
      onComponentSettingsChange,
    });
    const gridToggle = panel.element.querySelector(
      '[data-debug-toggle="show-map-grids"]'
    ) as HTMLInputElement | null;
    const componentToggle = panel.element.querySelector(
      '[data-debug-toggle="show-map-components"]'
    ) as HTMLInputElement | null;
    expect(gridToggle).not.toBeNull();
    expect(componentToggle).not.toBeNull();
    gridToggle?.click();
    componentToggle?.click();
    expect(onGridToggle).toHaveBeenCalledWith(true);
    expect(onComponentToggle).toHaveBeenCalledWith(true);

    const waterScale = panel.element.querySelector(
      '[data-map-setting="water"]'
    ) as HTMLInputElement | null;
    expect(waterScale).not.toBeNull();
    if (waterScale !== null) {
      waterScale.value = "1.4";
      waterScale.dispatchEvent(new Event("input", { bubbles: true }));
    }
    expect(onComponentSettingsChange).toHaveBeenCalled();
  });
});
