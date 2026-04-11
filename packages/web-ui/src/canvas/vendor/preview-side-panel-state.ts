/**
 * @module @agent-play/play-ui/preview-side-panel-state
 * preview side panel state — preview canvas module (Pixi + DOM).
 */
export type SidePanelOpen = "none" | "left" | "right";

export function nextSidePanelState(
  current: SidePanelOpen,
  clicked: "left" | "right"
): SidePanelOpen {
  if (current === clicked) {
    return "none";
  }
  return clicked;
}
