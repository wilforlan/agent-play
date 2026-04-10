import { z } from "zod";
import { enrichAssistOutputWithOpenAI } from "../../lib/assist-openai-enrichment.js";

const schema = z.object({
  currentTeamSize: z.number().int().nonnegative(),
  plannedHires: z.number().int().nonnegative(),
  averageMonthlyCostPerHire: z.number().nonnegative(),
});

const SYSTEM = [
  "You are a finance partner for hiring plans.",
  "JSON includes team size, planned hires, incremental monthly cost, projected team size.",
  "Produce HTML and plainSummary focused on cost impact and sequencing.",
].join(" ");

export async function executeAssistHiringPlanFinance(
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const p = schema.parse(args);
  const incrementalMonthlyCost = p.plannedHires * p.averageMonthlyCostPerHire;
  const projectedTeamSize = p.currentTeamSize + p.plannedHires;
  const base: Record<string, unknown> = {
    mode: "assist",
    toolName: "assist_hiring_plan_finance",
    summary: `Planned hires add about ${incrementalMonthlyCost.toFixed(0)} in monthly loaded cost, taking the team from ${p.currentTeamSize} to ${projectedTeamSize} people.`,
    keyAssumptions: [
      "Average monthly cost per hire includes salary, benefits, and recruiting amortization.",
      "No attrition is modeled in the same window.",
    ],
    recommendations: [
      p.plannedHires > 0
        ? "Sequence hires behind revenue or milestone gates instead of a single start date batch."
        : "If pausing hires, capture the capacity gap in CS or product delivery explicitly.",
      "Pair each role with a 90-day success metric so cost can be trimmed if lagging.",
    ],
    nextQuestions: [
      "Which function is the bottleneck today: engineering, GTM, or CS?",
      "What monthly revenue per employee are you targeting post-hires?",
    ],
    metrics: {
      incrementalMonthlyCost,
      projectedTeamSize,
    },
  };
  const { messageHtml, plainSummary } = await enrichAssistOutputWithOpenAI({
    toolLabel: "assist_hiring_plan_finance",
    systemPrompt: SYSTEM,
    structured: base,
  });
  return {
    ...base,
    summary: plainSummary,
    message: plainSummary,
    messageHtml,
  };
}
