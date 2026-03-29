import {
  AIMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import { extractJourney } from "./journey-from-messages.js";

function aboutMdFixtureLangChain() {
  return [
    new HumanMessage({
      id: "f8ff7542-3a64-4063-98b5-b7327809da4e",
      content:
        "Search for information about the capital of France and calculate the result of 2 + 2",
    }),
    new AIMessage({
      id: "chatcmpl-DMN6eyii1c4TVJEGAF0j3t15yfwcy",
      content: "",
      name: "langchain-agent",
      tool_calls: [
        {
          name: "search",
          args: { query: "capital of France" },
          type: "tool_call",
          id: "call_bl6yfxw1CWGr03xhr9tr2pHa",
        },
        {
          name: "calculate",
          args: { expression: "2 + 2" },
          type: "tool_call",
          id: "call_LHYzK0e7tadA722GBdT7PyFf",
        },
      ],
    }),
    new ToolMessage({
      id: "c88e4d70-0acc-4bd2-977b-d1bbe49884d5",
      content: "Results for: capital of France",
      name: "search",
      tool_call_id: "call_bl6yfxw1CWGr03xhr9tr2pHa",
    }),
    new ToolMessage({
      id: "cefa8a04-53d3-46fc-8bda-f2c35606d31a",
      content: "Result of: 2 + 2",
      name: "calculate",
      tool_call_id: "call_LHYzK0e7tadA722GBdT7PyFf",
    }),
    new AIMessage({
      id: "chatcmpl-DMN6fMWhdgJTFtR6ZdusIqtaPhziH",
      content: "The capital of France is Paris. The result of 2 + 2 is 4.",
      name: "langchain-agent",
    }),
  ];
}

describe("extractJourney", () => {
  it("extracts origin, two structure visits with results, and destination from LangChain messages", () => {
    const startedAt = new Date("2025-01-01T12:00:00.000Z");
    const journey = extractJourney(aboutMdFixtureLangChain(), startedAt);

    expect(journey.steps).toHaveLength(4);
    expect(journey.steps[0]).toEqual({
      type: "origin",
      content:
        "Search for information about the capital of France and calculate the result of 2 + 2",
      messageId: "f8ff7542-3a64-4063-98b5-b7327809da4e",
    });

    expect(journey.steps[1]).toMatchObject({
      type: "structure",
      toolName: "search",
      toolCallId: "call_bl6yfxw1CWGr03xhr9tr2pHa",
      args: { query: "capital of France" },
      result: "Results for: capital of France",
    });

    expect(journey.steps[2]).toMatchObject({
      type: "structure",
      toolName: "calculate",
      toolCallId: "call_LHYzK0e7tadA722GBdT7PyFf",
      args: { expression: "2 + 2" },
      result: "Result of: 2 + 2",
    });

    expect(journey.steps[3]).toEqual({
      type: "destination",
      content: "The capital of France is Paris. The result of 2 + 2 is 4.",
      messageId: "chatcmpl-DMN6fMWhdgJTFtR6ZdusIqtaPhziH",
    });

    expect(journey.startedAt).toStrictEqual(startedAt);
    expect(journey.completedAt.getTime()).toBeGreaterThanOrEqual(
      startedAt.getTime()
    );
  });

  it("returns steps without destination when there is no final assistant message", () => {
    const partial = aboutMdFixtureLangChain().slice(0, 4);
    const journey = extractJourney(partial);
    expect(journey.steps.every((s: any) => s.type !== "destination")).toBe(true);
  });

  it("accepts plain serializable objects with type markers", () => {
    const plain = [
      {
        type: "human" as const,
        id: "h1",
        content: "Hello",
      },
      {
        type: "ai" as const,
        id: "a1",
        content: "",
        name: "agent",
        tool_calls: [
          { name: "t1", id: "tc1", args: {}, type: "tool_call" },
        ],
      },
      {
        name: "t1",
        tool_call_id: "tc1",
        content: "done",
      },
      {
        type: "assistant" as const,
        id: "a2",
        name: "agent",
        content: "Summary",
        tool_calls: [],
      },
    ];
    const journey = extractJourney(plain);
    expect(journey.steps.map((s: any) => s.type)).toEqual([
      "origin",
      "structure",
      "destination",
    ]);
    expect(journey.steps[1]).toMatchObject({
      type: "structure",
      result: "done",
    });
  });
});
