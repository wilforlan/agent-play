import { z } from "zod";

const schema = z.object({
  audience: z.string(),
  goal: z.string(),
  days: z.number().int().positive(),
});

export function executeAssistFollowupSequence(args: Record<string, unknown>): {
  mode: "assist";
  toolName: "assist_followup_sequence";
  summary: string;
  keyAssumptions: string[];
  recommendations: string[];
  nextQuestions: string[];
  metrics: {
    touchpoints: number;
  };
} {
  const p = schema.parse(args);
  const touchpoints = Math.min(5, Math.max(3, Math.ceil(p.days / 3)));
  return {
    mode: "assist",
    toolName: "assist_followup_sequence",
    summary: `Across ${p.days} days for ${p.audience.trim()} with goal "${p.goal.trim()}", plan ${touchpoints} concise touches mixing value proof, a concrete ask, and a time-boxed next step.`,
    keyAssumptions: [
      "The buyer agreed to a timeline or expressed interest recently.",
      "You have permission to follow up on this channel.",
    ],
    recommendations: [
      "Alternate between insight (benchmark, template) and logistics (calendar link, pilot scope).",
      "End each note with one question that can be answered in a single line.",
    ],
    nextQuestions: [
      "What single metric would make them say yes?",
      "Who else is silently observing this thread?",
    ],
    metrics: {
      touchpoints,
    },
  };
}
