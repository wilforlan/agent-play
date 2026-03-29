import { describe, expect, it } from "vitest";
import {
  assertAgentToolContract,
  extractAssistToolNames,
} from "./agent-tool-contract.js";

describe("agent-tool-contract", () => {
  it("extracts assist_ tools", () => {
    expect(
      extractAssistToolNames(["chat_tool", "assist_a", "assist_b", "other"])
    ).toEqual(["assist_a", "assist_b"]);
  });

  it("requires chat_tool", () => {
    expect(() => assertAgentToolContract(["x"])).toThrow(/chat_tool/);
    expect(() => assertAgentToolContract(["chat_tool"])).not.toThrow();
  });
});
