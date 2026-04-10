import { describe, expect, it } from "vitest";
import { executeToolCapability } from "./execute-tool-capability.js";

describe("executeToolCapability", () => {
  it("executes known assist tool", () => {
    const out = executeToolCapability({
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

  it("throws for unknown tool", () => {
    expect(() =>
      executeToolCapability({ toolName: "assist_unknown", args: {} })
    ).toThrow(/unknown tool capability/);
  });
});
