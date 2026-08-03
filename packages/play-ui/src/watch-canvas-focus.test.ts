// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import {
  WATCH_CANVAS_FOCUS_EVENT,
  requestWatchCanvasFocus,
} from "./watch-canvas-focus.js";

describe("watch-canvas-focus", () => {
  it("dispatches the shared scroll-to-game event", () => {
    const spy = vi.fn();
    window.addEventListener(WATCH_CANVAS_FOCUS_EVENT, spy);
    requestWatchCanvasFocus();
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(WATCH_CANVAS_FOCUS_EVENT, spy);
  });
});
