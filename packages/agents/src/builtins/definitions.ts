import type { BuiltinAgentDefinition } from "./types.js";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { cfoTools } from "./toolkits/cfo-tools.js";
import { salesTools } from "./toolkits/sales-tools.js";

function buildBuiltinAgentDefinitions(): BuiltinAgentDefinition[] {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const demoModel = new ChatOpenAI({
    apiKey: openaiApiKey,
    model: "gpt-4.1",
  });
  console.log("@packages/agents - demo model loaded")

  const cfoLcAgent = createAgent({
    name: "builtin-cfo-ai",
    model: demoModel,
    tools: [...cfoTools],
    systemPrompt:
      "You are CFO AI. Help founders understand budgets, runway, and pricing decisions with practical finance guidance. Prefer assist_build_budget, assist_cashflow_forecast, assist_runway_estimate, assist_pricing_scenarios, and assist_hiring_plan_finance for structured support.",
  });

  const salesLcAgent = createAgent({
    name: "builtin-sales-ai",
    model: demoModel,
    tools: [...salesTools],
    systemPrompt:
      "You are Sales AI. Help businesses improve pipeline quality, objection handling, and follow-up execution. Prefer assist_pipeline_review, assist_objection_handling, and assist_followup_sequence for structured support.",
  });

  return [
    {
      id: "b2bffffd3e73e975c3aef60f6c15bdd84165fc548583c8553fb8119f92550f4d",
      name: "CFO AI",
      type: "langchain",
      agent: cfoLcAgent,
    },
    {
      id: "4fda036ff28e27a1df7529ebd765bc23dec4228b1e9be3fff4cea57bbc9b8dc4",
      name: "Sales AI",
      type: "langchain",
      agent: salesLcAgent,
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
