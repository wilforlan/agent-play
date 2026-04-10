import { z } from "zod";

const schema = z.object({
  currentTeamSize: z.number().int().nonnegative(),
  plannedHires: z.number().int().nonnegative(),
  averageMonthlyCostPerHire: z.number().nonnegative(),
});

export function executeAssistHiringPlanFinance(
  args: Record<string, unknown>
): {
  mode: "assist";
  toolName: "assist_hiring_plan_finance";
  summary: string;
  keyAssumptions: string[];
  recommendations: string[];
  nextQuestions: string[];
  metrics: {
    incrementalMonthlyCost: number;
    projectedTeamSize: number;
  };
} {
  const p = schema.parse(args);
  const incrementalMonthlyCost = p.plannedHires * p.averageMonthlyCostPerHire;
  const projectedTeamSize = p.currentTeamSize + p.plannedHires;
  return {
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
}
