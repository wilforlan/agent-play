import { describe, expect, it } from "vitest";
import { langchainRegistration } from "./langchain.js";

describe("langchainRegistration", () => {
  it("includes chat_tool when agent tools omit it", () => {
    const agent = {
      tools: [{ name: "ping" }],
      invoke: async () => ({}),
    };
    const reg = langchainRegistration(agent);
    expect(reg.toolNames).toContain("chat_tool");
    expect(reg.toolNames).toContain("ping");
  });

  it("does not duplicate chat_tool", () => {
    const agent = {
      tools: [{ name: "chat_tool" }],
      invoke: async () => ({}),
    };
    const reg = langchainRegistration(agent);
    expect(reg.toolNames.filter((n) => n === "chat_tool").length).toBe(1);
  });
});
