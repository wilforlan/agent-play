import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeToolCapability } from "./execute-tool-capability.js";

describe("executeToolCapability", () => {
  let prevOpenAiKey: string | undefined;

  beforeEach(() => {
    prevOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (prevOpenAiKey !== undefined) {
      process.env.OPENAI_API_KEY = prevOpenAiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("executes known assist tool", async () => {
    const out = await executeToolCapability({
      toolName: "assist_pipeline_review",
      args: {
        leadCount: 10,
        qualifiedCount: 7,
        proposalCount: 4,
        closedWonCount: 2,
      },
    });
    expect(out).toMatchObject({
      mode: "assist",
      toolName: "assist_pipeline_review",
    });
    expect(typeof (out as { summary?: string }).summary).toBe("string");
  });

  it("throws for unknown tool", async () => {
    await expect(
      executeToolCapability({ toolName: "assist_unknown", args: {} })
    ).rejects.toThrow(/unknown tool capability/);
  });
});
