export const WATCH_CANVAS_FOCUS_EVENT = "agent-play:scroll-to-game";

export const requestWatchCanvasFocus = (): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WATCH_CANVAS_FOCUS_EVENT));
};
