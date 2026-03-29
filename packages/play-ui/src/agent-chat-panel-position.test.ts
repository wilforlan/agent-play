import { describe, expect, it } from "vitest";
import {
  agentChatHorizontalNudgePx,
  computeAgentChatPanelPosition,
} from "./agent-chat-panel-position.js";

describe("computeAgentChatPanelPosition", () => {
  it("places the panel above the anchor when centered in the viewport", () => {
    const r = computeAgentChatPanelPosition({
      anchorScreenX: 360,
      anchorScreenY: 300,
      panelWidth: 232,
      panelLayoutHeightPx: 100,
      viewportWidth: 720,
      viewportHeight: 520,
      marginPx: 6,
      gapAboveAgentPx: 8,
      horizontalNudgePx: 0,
    });
    expect(r.left).toBe(360 - 116);
    expect(r.top).toBe(300 - 100 - 8);
  });

  it("clamps left when the panel would extend past the left edge", () => {
    const r = computeAgentChatPanelPosition({
      anchorScreenX: 20,
      anchorScreenY: 260,
      panelWidth: 232,
      panelLayoutHeightPx: 100,
      viewportWidth: 720,
      viewportHeight: 520,
      marginPx: 6,
      gapAboveAgentPx: 8,
      horizontalNudgePx: 0,
    });
    expect(r.left).toBe(6);
  });

  it("keeps natural top above the viewport when the anchor is near the top edge", () => {
    const r = computeAgentChatPanelPosition({
      anchorScreenX: 360,
      anchorScreenY: 40,
      panelWidth: 232,
      panelLayoutHeightPx: 100,
      viewportWidth: 720,
      viewportHeight: 520,
      marginPx: 6,
      gapAboveAgentPx: 8,
      horizontalNudgePx: 0,
    });
    expect(r.top).toBe(40 - 100 - 8);
    expect(r.top).toBeLessThan(6);
  });

  it("shifts left by the horizontal nudge", () => {
    const base = computeAgentChatPanelPosition({
      anchorScreenX: 360,
      anchorScreenY: 300,
      panelWidth: 232,
      panelLayoutHeightPx: 100,
      viewportWidth: 720,
      viewportHeight: 520,
      marginPx: 6,
      gapAboveAgentPx: 8,
      horizontalNudgePx: 0,
    });
    const nudged = computeAgentChatPanelPosition({
      anchorScreenX: 360,
      anchorScreenY: 300,
      panelWidth: 232,
      panelLayoutHeightPx: 100,
      viewportWidth: 720,
      viewportHeight: 520,
      marginPx: 6,
      gapAboveAgentPx: 8,
      horizontalNudgePx: 8,
    });
    expect(nudged.left).toBe(base.left + 8);
    expect(nudged.top).toBe(base.top);
  });
});

describe("agentChatHorizontalNudgePx", () => {
  it("returns -8, 0, or 8 deterministically per playerId", () => {
    const a = agentChatHorizontalNudgePx("player-a");
    const b = agentChatHorizontalNudgePx("player-b");
    expect([-8, 0, 8]).toContain(a);
    expect([-8, 0, 8]).toContain(b);
    expect(agentChatHorizontalNudgePx("player-a")).toBe(a);
  });
});
