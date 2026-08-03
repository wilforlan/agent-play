// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  LARGE_SCREEN_PANEL_RESIZE_MIN_WIDTH_PX,
  attachChatPanelResize,
  clampChatPanelSize,
  isLargeScreenForPanelResize,
} from "./chat-panel-resize.js";

describe("chat panel resize", () => {
  it("enables resize only on larger screens", () => {
    expect(LARGE_SCREEN_PANEL_RESIZE_MIN_WIDTH_PX).toBe(900);
    expect(isLargeScreenForPanelResize(899)).toBe(false);
    expect(isLargeScreenForPanelResize(900)).toBe(true);
  });

  it("clamps width and height into allowed ranges", () => {
    expect(
      clampChatPanelSize({
        widthPx: 40,
        heightPx: 900,
        minWidthPx: 220,
        maxWidthPx: 520,
        minHeightPx: 240,
        maxHeightPx: 640,
      })
    ).toEqual({ widthPx: 220, heightPx: 640 });
  });

  it("attaches a resize handle that updates size on pointer drag", () => {
    const panel = document.createElement("section");
    document.body.append(panel);
    const sizes: Array<{ widthPx: number; heightPx: number }> = [];
    const handle = attachChatPanelResize({
      panel,
      enabled: true,
      getSize: () => ({ widthPx: 300, heightPx: 400 }),
      onResize: (next) => {
        sizes.push(next);
      },
      minWidthPx: 220,
      maxWidthPx: 520,
      minHeightPx: 240,
      maxHeightPx: 640,
    });
    const grip = panel.querySelector(
      ".chat-panel-resize__handle"
    ) as HTMLElement | null;
    expect(grip).not.toBeNull();
    grip!.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: 300,
        clientY: 400,
        bubbles: true,
      })
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: 340,
        clientY: 460,
        bubbles: true,
      })
    );
    window.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: 340,
        clientY: 460,
        bubbles: true,
      })
    );
    expect(sizes.at(-1)).toEqual({ widthPx: 340, heightPx: 460 });
    handle.destroy();
    expect(panel.querySelector(".chat-panel-resize__handle")).toBeNull();
  });
});
