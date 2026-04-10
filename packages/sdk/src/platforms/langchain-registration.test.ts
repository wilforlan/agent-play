import { describe, expect, it } from "vitest";
import { z } from "zod";
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
    expect(reg.assistTools?.[0]?.parameters.topic).toEqual({
      field: "topic",
      fieldType: "string",
    });
  });

  it("emits fieldType per key from Zod object schema", () => {
    const schema = z.object({
      title: z.string(),
      count: z.number(),
      active: z.boolean(),
      maybe: z.optional(z.number()),
    });
    const agent = {
      tools: [
        { name: "chat_tool", description: "Chat", schema: z.object({}) },
        {
          name: "assist_typed",
          description: "Typed",
          schema,
        },
      ],
    };
    const reg = langchainRegistration(agent);
    const params = reg.assistTools?.[0]?.parameters;
    expect(params?.title).toEqual({ field: "title", fieldType: "string" });
    expect(params?.count).toEqual({ field: "count", fieldType: "number" });
    expect(params?.active).toEqual({ field: "active", fieldType: "boolean" });
    expect(params?.maybe).toEqual({ field: "maybe", fieldType: "number" });
  });

  it("does not duplicate chat_tool in toolNames", () => {
    const agent = {
      tools: [{ name: "chat_tool" }],
    };
    const reg = langchainRegistration(agent);
    expect(reg.toolNames.filter((n) => n === "chat_tool").length).toBe(1);
  });
});
