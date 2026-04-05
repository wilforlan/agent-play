import { langchainRegistration, type LangChainAgentRegistration } from "@agent-play/sdk";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, tool } from "langchain";
import { z } from "zod";

export type BuiltinAgentDefinition = {
  id: string;
  name: string;
  type: string;
  agent: LangChainAgentRegistration;
};

function buildBuiltinAgentDefinitions(): BuiltinAgentDefinition[] {
  const demoModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "agent-play-builtin-unused",
    model: "gpt-4.1",
  });

  const taskChat = tool(
    ({ message }: { message: string }) => `task-organizer:${message}`,
    {
      name: "chat_tool",
      description: "Record chat for the play world (task organizer).",
      schema: z.object({ message: z.string() }),
    }
  );

  const assistPlanDay = tool(
    (_args: { goals: string[]; timeBudgetMinutes?: number }) => "planned",
    {
      name: "assist_plan_day",
      description:
        "Suggest a structured plan for the given day from goals and constraints.",
      schema: z.object({
        goals: z.array(z.string()),
        timeBudgetMinutes: z.number().optional(),
      }),
    }
  );

  const assistPrioritizeTasks = tool(
    (
      _args: {
        tasks: { title: string; importance?: "low" | "medium" | "high" }[];
      }
    ) => "prioritized",
    {
      name: "assist_prioritize_tasks",
      description: "Rank tasks by impact and urgency with short rationale per item.",
      schema: z.object({
        tasks: z.array(
          z.object({
            title: z.string(),
            importance: z.enum(["low", "medium", "high"]).optional(),
          })
        ),
      }),
    }
  );

  const logTaskBlock = tool(
    (_args: { label: string; minutes: number }) => "logged",
    {
      name: "log_task_block",
      description: "Log a focused work block for task tracking.",
      schema: z.object({
        label: z.string(),
        minutes: z.number(),
      }),
    }
  );

  const summarizeBacklog = tool(
    (_args: { titles: string[] }) => "summary",
    {
      name: "summarize_backlog",
      description: "Summarize a list of task titles into themes.",
      schema: z.object({ titles: z.array(z.string()) }),
    }
  );

  const taskOrganizerLcAgent = createAgent({
    name: "builtin-task-organizer",
    model: demoModel,
    tools: [
      taskChat,
      assistPlanDay,
      assistPrioritizeTasks,
      logTaskBlock,
      summarizeBacklog,
    ],
    systemPrompt:
      "You help organize tasks and schedules. Prefer assist_plan_day and assist_prioritize_tasks for structured requests.",
  });

  const researchChat = tool(
    ({ message }: { message: string }) => `research:${message}`,
    {
      name: "chat_tool",
      description: "Record chat for the play world (research).",
      schema: z.object({ message: z.string() }),
    }
  );

  const assistSummarizeSource = tool(
    (_args: { excerpt: string; maxBullets?: number }) => "bullets",
    {
      name: "assist_summarize_source",
      description:
        "Produce a neutral summary of the supplied source excerpt with key claims.",
      schema: z.object({
        excerpt: z.string(),
        maxBullets: z.number().optional(),
      }),
    }
  );

  const assistFindCitations = tool(
    (_args: { claims: string[]; style?: "apa" | "mla" | "short" }) =>
      "citations",
    {
      name: "assist_find_citations",
      description:
        "Propose citation-style references for claims given available metadata.",
      schema: z.object({
        claims: z.array(z.string()),
        style: z.enum(["apa", "mla", "short"]).optional(),
      }),
    }
  );

  const extractKeyPoints = tool(
    (_args: { text: string }) => "points",
    {
      name: "extract_key_points",
      description: "Extract key points from prose.",
      schema: z.object({ text: z.string() }),
    }
  );

  const compareClaims = tool(
    (_args: { a: string; b: string }) => "compare",
    {
      name: "compare_claims",
      description: "Compare two claims for agreement or tension.",
      schema: z.object({ a: z.string(), b: z.string() }),
    }
  );

  const researchLcAgent = createAgent({
    name: "builtin-research-assistant",
    model: demoModel,
    tools: [
      researchChat,
      assistSummarizeSource,
      assistFindCitations,
      extractKeyPoints,
      compareClaims,
    ],
    systemPrompt:
      "You support research workflows. Use assist_summarize_source and assist_find_citations when the user needs structured research help.",
  });

  const playWorldChat = tool(
    ({ message }: { message: string }) => `play-world:${message}`,
    {
      name: "chat_tool",
      description: "Record chat for the play world (play world assistant).",
      schema: z.object({ message: z.string() }),
    }
  );

  const assistExplainStructure = tool(
    (_args: { toolName: string; audience?: "developer" | "stakeholder" }) =>
      "explained",
    {
      name: "assist_explain_structure",
      description:
        "Explain how a tool-derived structure on the Agent Play map relates to your agent.",
      schema: z.object({
        toolName: z.string(),
        audience: z.enum(["developer", "stakeholder"]).optional(),
      }),
    }
  );

  const assistRecordJourneyHint = tool(
    (_args: { userGoal: string; toolNames?: string[] }) => "hint",
    {
      name: "assist_record_journey_hint",
      description:
        "Suggest how to shape a journey (origin, tool steps, destination) for the watch UI.",
      schema: z.object({
        userGoal: z.string(),
        toolNames: z.array(z.string()).optional(),
      }),
    }
  );

  const describeZoneSignal = tool(
    (_args: { zoneCount: number }) => "zone",
    {
      name: "describe_zone_signal",
      description: "Describe a zone proximity signal for debugging or UX copy.",
      schema: z.object({ zoneCount: z.number() }),
    }
  );

  const describeYieldSignal = tool(
    (_args: { yieldCount: number }) => "yield",
    {
      name: "describe_yield_signal",
      description: "Describe a yield proximity signal for debugging or UX copy.",
      schema: z.object({ yieldCount: z.number() }),
    }
  );

  const playWorldLcAgent = createAgent({
    name: "builtin-play-world-assistant",
    model: demoModel,
    tools: [
      playWorldChat,
      assistExplainStructure,
      assistRecordJourneyHint,
      describeZoneSignal,
      describeYieldSignal,
    ],
    systemPrompt:
      "You explain Agent Play map structures and journeys. Use assist_explain_structure and assist_record_journey_hint when teaching developers.",
  });

  return [
    {
      id: "builtin-task-organizer",
      name: "Task organizer assistant",
      type: "langchain",
      agent: langchainRegistration(taskOrganizerLcAgent),
    },
    {
      id: "builtin-research-assistant",
      name: "Research assistant",
      type: "langchain",
      agent: langchainRegistration(researchLcAgent),
    },
    {
      id: "builtin-play-world-assistant",
      name: "Play world assistant",
      type: "langchain",
      agent: langchainRegistration(playWorldLcAgent),
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
