import { describe, expect, it } from "vitest";
import { intercomResultRecordFromLangChainInvokeOutput } from "./intercom-langchain-chat-result.js";

describe("intercomResultRecordFromLangChainInvokeOutput", () => {
  it("uses the last message content when messages are present", () => {
    const out = intercomResultRecordFromLangChainInvokeOutput({
      messages: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "Hi there" },
      ],
    });
    expect(out).toEqual({ mode: "chat", message: "Hi there" });
  });

  it("prefers structuredResponse when set", () => {
    const out = intercomResultRecordFromLangChainInvokeOutput({
      structuredResponse: { answer: "42", mode: "structured" },
      messages: [],
    });
    expect(out).toEqual({ answer: "42", mode: "structured" });
  });

  it("handles stringifiable non-object output", () => {
    expect(intercomResultRecordFromLangChainInvokeOutput(null)).toEqual({
      mode: "chat",
      message: "null",
    });
  });
});
