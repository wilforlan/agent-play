import { describe, expect, it } from "vitest";
import { getBuiltinAgentDefinitions } from "./builtin-langchain-agents.js";

describe("builtin LangChain agents", () => {
  it("exposes three stable definitions with chat_tool and assist tools", () => {
    const agents = getBuiltinAgentDefinitions();
    expect(agents).toHaveLength(3);
    for (const def of agents) {
      expect(def.id.length).toBeGreaterThan(0);
      expect(def.agent.type).toBe("langchain");
      expect(def.agent.toolNames).toContain("chat_tool");
      expect(
        def.agent.toolNames.some((n) => n.startsWith("assist_"))
      ).toBe(true);
      const assistNames = def.agent.assistTools?.map((t) => t.name) ?? [];
      expect(assistNames.length).toBeGreaterThan(0);
    }
  });

  it("task organizer includes planning tools", () => {
    const def = getBuiltinAgentDefinitions().find(
      (d) => d.id === "builtin-task-organizer"
    );
    expect(def).toBeDefined();
    expect(def?.agent.toolNames).toEqual(
      expect.arrayContaining([
        "chat_tool",
        "assist_plan_day",
        "assist_prioritize_tasks",
      ])
    );
  });

  it("research assistant includes summarization tools", () => {
    const def = getBuiltinAgentDefinitions().find(
      (d) => d.id === "builtin-research-assistant"
    );
    expect(def).toBeDefined();
    expect(def?.agent.toolNames).toEqual(
      expect.arrayContaining([
        "chat_tool",
        "assist_summarize_source",
        "assist_find_citations",
      ])
    );
  });

  it("play world assistant includes map teaching tools", () => {
    const def = getBuiltinAgentDefinitions().find(
      (d) => d.id === "builtin-play-world-assistant"
    );
    expect(def).toBeDefined();
    expect(def?.agent.toolNames).toEqual(
      expect.arrayContaining([
        "chat_tool",
        "assist_explain_structure",
        "assist_record_journey_hint",
      ])
    );
  });
});
