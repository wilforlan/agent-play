// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import {
  appendChatLogLine,
  clearChatLog,
} from "./preview-chat-log.js";
import { createPreviewAgentChatOverlays } from "./preview-agent-chat-overlays.js";

describe("createPreviewAgentChatOverlays", () => {
  afterEach(() => {
    clearChatLog();
    document.body.innerHTML = "";
  });

  it("keeps card hidden when there are no chat rows", () => {
    const overlays = createPreviewAgentChatOverlays();
    overlays.syncAgentIds(["agent-1"]);
    overlays.setAssistSnapshot({
      agents: [
        {
          agentId: "agent-1",
          assistTools: [
            {
              name: "assist_plan_day",
              description: "plan",
              parameters: {},
            },
          ],
        },
      ],
    });
    overlays.refreshPlayer("agent-1");
    const card = overlays.root.querySelector(
      ".preview-agent-chat-card"
    ) as HTMLElement;
    expect(card.style.visibility).toBe("hidden");
  });

  it("hides card when chat rows exist but no proximity focus", () => {
    const overlays = createPreviewAgentChatOverlays();
    overlays.syncAgentIds(["agent-1"]);
    appendChatLogLine({
      agentId: "agent-1",
      playerName: "Agent One",
      role: "assistant",
      text: "hello",
    });
    overlays.refreshPlayer("agent-1");
    const card = overlays.root.querySelector(
      ".preview-agent-chat-card"
    ) as HTMLElement;
    expect(card.style.visibility).toBe("hidden");
  });

  it("shows card only for proximity-focused agent", () => {
    const overlays = createPreviewAgentChatOverlays();
    overlays.syncAgentIds(["agent-1"]);
    appendChatLogLine({
      agentId: "agent-1",
      playerName: "Agent One",
      role: "assistant",
      text: "hello",
    });
    overlays.refreshPlayer("agent-1");
    overlays.setProximityFocus("agent-1");
    const card = overlays.root.querySelector(
      ".preview-agent-chat-card"
    ) as HTMLElement;
    expect(card.style.visibility).toBe("visible");
  });

  it("hides card when proximity focus clears", () => {
    const overlays = createPreviewAgentChatOverlays();
    overlays.syncAgentIds(["agent-1"]);
    appendChatLogLine({
      agentId: "agent-1",
      playerName: "Agent One",
      role: "assistant",
      text: "hello",
    });
    overlays.refreshPlayer("agent-1");
    overlays.setProximityFocus("agent-1");
    overlays.setProximityFocus(null);
    const card = overlays.root.querySelector(
      ".preview-agent-chat-card"
    ) as HTMLElement;
    expect(card.style.visibility).toBe("hidden");
  });
});
