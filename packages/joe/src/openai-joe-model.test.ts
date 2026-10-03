import { describe, expect, it, vi } from "vitest";
import { createOpenAiJoeModel } from "./openai-joe-model.js";

describe("createOpenAiJoeModel", () => {
  it("sends chat completions and returns assistant content", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: '{"headline":"ok"}' } }],
      })
    );
    const model = createOpenAiJoeModel({
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      fetchImpl,
    });
    const content = await model.complete({
      system: "sys",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(content).toBe('{"headline":"ok"}');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as {
      model: string;
      messages: unknown[];
    };
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages).toHaveLength(2);
  });
});
