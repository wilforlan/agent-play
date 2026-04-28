import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { calculatorTools, policeReportTools } from "./toolkits/starter-tools.js";

function randomAgentName(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function randomSystemPrompt(prefix: string, rolePrompt: string): string {
  const nonce = Math.random().toString(36).slice(2, 10);
  return `${rolePrompt} Session nonce: ${nonce}. Agent label: ${prefix}.`;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export type StarterAgentDefinition = {
  nodeId: string;
  name: string;
  type: "langchain";
  agent: ReturnType<typeof createAgent>;
};

export function getStarterAgentDefinitions(agentCount: 1 | 2): StarterAgentDefinition[] {
  const model = new ChatOpenAI({
    apiKey: requiredEnv("OPENAI_API_KEY"),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1",
  });
  const first = {
    nodeId: requiredEnv("AGENT_PLAY_AGENT_NODE_ID_1"),
    name: randomAgentName("CalculatorAgent"),
    type: "langchain" as const,
    agent: createAgent({
      name: randomAgentName("lc-calculator-agent"),
      model,
      tools: [...calculatorTools],
      systemPrompt: randomSystemPrompt(
        "Calculator Agent",
        "You are a rigorous calculator agent for production operations. Always validate the equation format, show the extracted coefficient and brief reasoning, and ask clarifying questions when equation syntax is ambiguous. Use chat_tool for conversational explanations and assist_calculate_coefficient for structured extraction."
      ),
    }),
  };
  if (agentCount === 1) {
    return [first];
  }
  const second = {
    nodeId: requiredEnv("AGENT_PLAY_AGENT_NODE_ID_2"),
    name: randomAgentName("PoliceReportAgent"),
    type: "langchain" as const,
    agent: createAgent({
      name: randomAgentName("lc-police-report-agent"),
      model,
      tools: [...policeReportTools],
      systemPrompt: randomSystemPrompt(
        "Police Report Agent",
        "You are a police report intake agent. Collect factual, time-stamped incident details, separate witness statements from assumptions, and maintain neutral language suitable for official records. Use chat_tool for guided conversation and assist_collect_scene_details to gather structured scene data."
      ),
    }),
  };
  return [first, second];
}
