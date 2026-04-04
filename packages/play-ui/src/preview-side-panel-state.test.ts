import { describe, expect, it } from "vitest";

import { nextSidePanelState } from "./preview-side-panel-state.js";

describe("nextSidePanelState", () => {
  it("opens the clicked side from closed", () => {
    expect(nextSidePanelState("none", "left")).toBe("left");
    expect(nextSidePanelState("none", "right")).toBe("right");
  });

  it("closes when the open side is clicked again", () => {
    expect(nextSidePanelState("left", "left")).toBe("none");
    expect(nextSidePanelState("right", "right")).toBe("none");
  });

  it("switches sides when the other side is clicked", () => {
    expect(nextSidePanelState("left", "right")).toBe("right");
    expect(nextSidePanelState("right", "left")).toBe("left");
  });
});
