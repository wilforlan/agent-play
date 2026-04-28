export type HomePanel = "game" | "landing";

type GetNextPanelFromDeltaOptions = {
  currentPanel: HomePanel;
  deltaY: number;
  isDesktop: boolean;
};

const SWIPE_THRESHOLD = 60;

export const getNextPanelFromDelta = (
  options: GetNextPanelFromDeltaOptions,
): HomePanel => {
  if (!options.isDesktop) {
    return options.currentPanel;
  }
  if (options.deltaY >= SWIPE_THRESHOLD) {
    return "landing";
  }
  if (options.deltaY <= -SWIPE_THRESHOLD) {
    return "game";
  }
  return options.currentPanel;
};
