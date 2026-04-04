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
