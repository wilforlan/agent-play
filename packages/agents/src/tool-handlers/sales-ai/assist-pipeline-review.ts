import { z } from "zod";

const schema = z.object({
  leadCount: z.number().int().nonnegative(),
  qualifiedCount: z.number().int().nonnegative(),
  proposalCount: z.number().int().nonnegative(),
  closedWonCount: z.number().int().nonnegative(),
});

export function executeAssistPipelineReview(args: Record<string, unknown>): {
  mode: "assist";
  toolName: "assist_pipeline_review";
  summary: string;
  keyAssumptions: string[];
  recommendations: string[];
  nextQuestions: string[];
  metrics: {
    qualificationRate: number;
    proposalRate: number;
    winRate: number;
  };
} {
  const p = schema.parse(args);
  const qualificationRate =
    p.leadCount > 0 ? p.qualifiedCount / p.leadCount : 0;
  const proposalRate =
    p.qualifiedCount > 0 ? p.proposalCount / p.qualifiedCount : 0;
  const winRate =
    p.proposalCount > 0 ? p.closedWonCount / p.proposalCount : 0;
  const bottleneck =
    qualificationRate < 0.25
      ? "top-of-funnel qualification"
      : proposalRate < 0.35
        ? "moving qualified accounts to proposal"
        : winRate < 0.2
          ? "late-stage win rate"
          : "balanced; look for velocity, not a single ratio";
  return {
    mode: "assist",
    toolName: "assist_pipeline_review",
    summary: `Qualification ${(qualificationRate * 100).toFixed(1)}%, proposal ${(proposalRate * 100).toFixed(1)}%, win ${(winRate * 100).toFixed(1)}%. The softest stage looks like ${bottleneck}.`,
    keyAssumptions: [
      "Counts are from one reporting period and definitions match your CRM stages.",
      "No double-counting between qualified and proposal stages.",
    ],
    recommendations: [
      qualificationRate < 0.3
        ? "Tighten ICP scoring so reps spend time on accounts that reach proposal."
        : "Add a mutual action plan template at proposal stage to reduce stalls.",
      "Pick one cohort (segment or territory) to compare ratios week over week.",
    ],
    nextQuestions: [
      "What is the median days from qualified to proposal?",
      "Which loss reason dominates late stage?",
    ],
    metrics: {
      qualificationRate,
      proposalRate,
      winRate,
    },
  };
}
