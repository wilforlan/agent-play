import { tool } from "langchain";
import { z } from "zod";

const taskChat = tool(({ message }: { message: string }) => `task-organizer:${message}`, {
  name: "chat_tool",
  description: "Record chat for the play world (task organizer).",
  schema: z.object({ message: z.string() }),
});

const assistPlanDay = tool(
  (_args: { goals: string[]; timeBudgetMinutes?: number }) => "planned",
  {
    name: "assist_plan_day",
    description: "Suggest a structured plan for the given day from goals and constraints.",
    schema: z.object({
      goals: z.array(z.string()),
      timeBudgetMinutes: z.number().optional(),
    }),
  }
);

const assistPrioritizeTasks = tool(
  (_args: { tasks: { title: string; importance?: "low" | "medium" | "high" }[] }) =>
    "prioritized",
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

const logTaskBlock = tool((_args: { label: string; minutes: number }) => "logged", {
  name: "log_task_block",
  description: "Log a focused work block for task tracking.",
  schema: z.object({
    label: z.string(),
    minutes: z.number(),
  }),
});

const summarizeBacklog = tool((_args: { titles: string[] }) => "summary", {
  name: "summarize_backlog",
  description: "Summarize a list of task titles into themes.",
  schema: z.object({ titles: z.array(z.string()) }),
});

export const taskOrganizerTools = [
  taskChat,
  assistPlanDay,
  assistPrioritizeTasks,
  logTaskBlock,
  summarizeBacklog,
] as const;
