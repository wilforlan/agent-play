import { describe, expect, it } from "vitest";
import { enrichAssistOutputWithOpenAI } from "./assist-openai-enrichment.js";

describe("enrichAssistOutputWithOpenAI", () => {
  it("returns fallback HTML when OPENAI_API_KEY is unset", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const out = await enrichAssistOutputWithOpenAI({
      toolLabel: "test_tool",
      systemPrompt: "You are a test assistant.",
      structured: {
        mode: "assist",
        toolName: "test_tool",
        summary: "Hello from structured output.",
      },
    });
    if (prev !== undefined) {
      process.env.OPENAI_API_KEY = prev;
    }
    expect(out.plainSummary).toContain("Hello");
    expect(out.messageHtml).toContain("assist-html-root");
    expect(out.messageHtml).toContain("Hello");
  });
});
