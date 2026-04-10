import { z } from "zod";
import { enrichAssistOutputWithOpenAI } from "../../lib/assist-openai-enrichment.js";

const schema = z.object({
  audience: z.string(),
  goal: z.string(),
  days: z.number().int().positive(),
});

const SYSTEM = [
  "You are a sales engagement strategist.",
  "JSON includes audience, goal, days, and suggested touchpoint count.",
  "Produce a multi-step follow-up plan in HTML and plainSummary.",
].join(" ");

export async function executeAssistFollowupSequence(
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const p = schema.parse(args);
  const touchpoints = Math.min(5, Math.max(3, Math.ceil(p.days / 3)));
  const base: Record<string, unknown> = {
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
  const { messageHtml, plainSummary } = await enrichAssistOutputWithOpenAI({
    toolLabel: "assist_followup_sequence",
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
