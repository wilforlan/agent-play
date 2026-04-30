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
      id: "500572843b9fade22e718ea7664442ecf4becf7fdbacd87ef2a7c0b609ec6f31",
      name: "CFO AI",
      type: "langchain",
      agent: cfoLcAgent,
      enableP2a: "on",
    },
    {
      id: "418c897754d09e6f464e5bc67701f85ffc2c0fae67a9e30a0bcd3ae9d245348e",
      name: "Sales AI",
      type: "langchain",
      agent: salesLcAgent,
      enableP2a: "on",
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
