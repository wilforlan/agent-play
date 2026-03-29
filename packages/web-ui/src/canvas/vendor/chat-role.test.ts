import { describe, expect, it } from "vitest";
import { interactionRoleToBubbleClass } from "./chat-role.js";

describe("interactionRoleToBubbleClass", () => {
  it("maps known roles", () => {
    expect(interactionRoleToBubbleClass("user")).toBe("preview-chat-bubble--user");
    expect(interactionRoleToBubbleClass("assistant")).toBe(
      "preview-chat-bubble--assistant"
    );
    expect(interactionRoleToBubbleClass("tool")).toBe("preview-chat-bubble--tool");
  });

  it("maps unknown roles to tool style", () => {
    expect(interactionRoleToBubbleClass("system")).toBe(
      "preview-chat-bubble--tool"
    );
  });
});
