/**
 * @module @agent-play/play-ui/agent-chat-panel-position
 * agent chat panel position — preview canvas module (Pixi + DOM).
 */
export type AgentChatPanelLayoutOptions = {
  anchorScreenX: number;
  anchorScreenY: number;
  panelWidth: number;
  panelLayoutHeightPx: number;
  viewportWidth: number;
  viewportHeight: number;
  marginPx: number;
  gapAboveAgentPx: number;
  horizontalNudgePx: number;
};

export type AgentChatPanelPosition = {
  left: number;
  top: number;
};

export function agentChatHorizontalNudgePx(playerId: string): number {
  let sum = 0;
  for (let i = 0; i < playerId.length; i += 1) {
    sum += playerId.charCodeAt(i);
  }
  const m = sum % 3;
  if (m === 0) return -8;
  if (m === 1) return 0;
  return 8;
}

export function computeAgentChatPanelPosition(
  options: AgentChatPanelLayoutOptions
): AgentChatPanelPosition {
  const {
    anchorScreenX,
    anchorScreenY,
    panelWidth,
    panelLayoutHeightPx,
    viewportWidth,
    viewportHeight,
    marginPx,
    gapAboveAgentPx,
    horizontalNudgePx,
  } = options;

  let left =
    anchorScreenX - panelWidth / 2 + horizontalNudgePx;
  let top = anchorScreenY - panelLayoutHeightPx - gapAboveAgentPx;

  const maxLeft = viewportWidth - panelWidth - marginPx;
  if (left < marginPx) left = marginPx;
  if (left > maxLeft) left = maxLeft;

  const maxTop = viewportHeight - panelLayoutHeightPx - marginPx;
  if (top > maxTop) top = maxTop;

  return { left, top };
}
