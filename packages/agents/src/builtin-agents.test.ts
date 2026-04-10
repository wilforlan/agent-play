import { describe, expect, it } from "vitest";
import { getBuiltinAgentDefinitions } from "./builtin-langchain-agents.js";

describe("builtin LangChain agents", () => {
  it("exposes two stable definitions with chat_tool and assist tools", () => {
    const agents = getBuiltinAgentDefinitions();
    expect(agents).toHaveLength(2);
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
      (d) => d.id === "b2bffffd3e73e975c3aef60f6c15bdd84165fc548583c8553fb8119f92550f4d"
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
      (d) => d.id === "4fda036ff28e27a1df7529ebd765bc23dec4228b1e9be3fff4cea57bbc9b8dc4"
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

});
