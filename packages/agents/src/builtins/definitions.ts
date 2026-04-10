import { langchainRegistration } from "@agent-play/sdk";
import type { BuiltinAgentDefinition } from "./types.js";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { taskOrganizerTools } from "./toolkits/task-organizer-tools.js";
import { researchTools } from "./toolkits/research-tools.js";

function buildBuiltinAgentDefinitions(): BuiltinAgentDefinition[] {
  const demoModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "agent-play-builtin-unused",
    model: "gpt-4.1",
  });

  const taskOrganizerLcAgent = createAgent({
    name: "builtin-task-organizer",
    model: demoModel,
    tools: [...taskOrganizerTools],
    systemPrompt:
      "You help organize tasks and schedules. Prefer assist_plan_day and assist_prioritize_tasks for structured requests.",
  });

  const researchLcAgent = createAgent({
    name: "builtin-research-assistant",
    model: demoModel,
    tools: [...researchTools],
    systemPrompt:
      "You support research workflows. Use assist_summarize_source and assist_find_citations when the user needs structured research help.",
  });

  return [
    {
      id: "b2bffffd3e73e975c3aef60f6c15bdd84165fc548583c8553fb8119f92550f4d",
      name: "Task organizer assistant",
      type: "langchain",
      agent: langchainRegistration(taskOrganizerLcAgent),
    },
    {
      id: "4fda036ff28e27a1df7529ebd765bc23dec4228b1e9be3fff4cea57bbc9b8dc4",
      name: "Research assistant",
      type: "langchain",
      agent: langchainRegistration(researchLcAgent),
    },
  ];
}

let memoizedBuiltinAgents: readonly BuiltinAgentDefinition[] | null = null;

export function getBuiltinAgentDefinitions(): readonly BuiltinAgentDefinition[] {
  if (memoizedBuiltinAgents === null) {
    memoizedBuiltinAgents = Object.freeze(buildBuiltinAgentDefinitions());
  }
  return memoizedBuiltinAgents;
}
