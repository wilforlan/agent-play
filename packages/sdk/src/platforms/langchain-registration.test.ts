import { describe, expect, it } from "vitest";
import { langchainRegistration } from "./langchain.js";

describe("langchainRegistration", () => {
  it("throws when agent has no tools array", () => {
    expect(() => langchainRegistration(null)).toThrow(/expected a LangChain agent with a tools array/);
    expect(() => langchainRegistration({})).toThrow(/expected a LangChain agent with a tools array/);
    expect(() => langchainRegistration({ tools: "bad" })).toThrow(
      /expected a LangChain agent with a tools array/
    );
  });

  it("throws when chat_tool is missing but tools exist", () => {
    const agent = {
      tools: [{ name: "ping" }],
    };
    expect(() => langchainRegistration(agent)).toThrow(/missing required tool "chat_tool"/);
    expect(() => langchainRegistration(agent)).toThrow(/assist_/);
  });

  it("returns toolNames and assistTools when chat_tool and assist_* are present", () => {
    const agent = {
      tools: [
        { name: "chat_tool", description: "Chat", schema: { _def: { shape: () => ({}) } } },
        {
          name: "assist_summarize",
          description: "Summarize",
          schema: { _def: { shape: () => ({ topic: {} }) } },
        },
      ],
    };
    const reg = langchainRegistration(agent);
    expect(reg.toolNames).toEqual(["chat_tool", "assist_summarize"]);
    expect(reg.assistTools).toHaveLength(1);
    expect(reg.assistTools?.[0]?.name).toBe("assist_summarize");
    expect(reg.assistTools?.[0]?.description).toBe("Summarize");
    expect(reg.assistTools?.[0]?.parameters).toHaveProperty("topic");
  });

  it("does not duplicate chat_tool in toolNames", () => {
    const agent = {
      tools: [{ name: "chat_tool" }],
    };
    const reg = langchainRegistration(agent);
    expect(reg.toolNames.filter((n) => n === "chat_tool").length).toBe(1);
  });
});
