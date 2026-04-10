import { z } from "zod";
import { enrichAssistOutputWithOpenAI } from "../../lib/assist-openai-enrichment.js";

const schema = z.object({
  cashOnHand: z.number(),
  monthlyBurn: z.number(),
  monthlyRevenue: z.number(),
});

const SYSTEM = [
  "You are a CFO assistant specializing in runway analysis.",
  "JSON includes cash on hand, monthly burn, monthly revenue, net burn, and runway months (or null).",
  "Produce concise HTML and plainSummary; highlight runway risk clearly.",
].join(" ");

export async function executeAssistRunwayEstimate(
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const p = schema.parse(args);
  const netBurn = p.monthlyBurn - p.monthlyRevenue;
  const runwayMonths = netBurn > 0 ? p.cashOnHand / netBurn : null;
  const summary =
    runwayMonths === null
      ? netBurn <= 0
        ? `Net burn is ${netBurn.toFixed(0)} or lower; runway is not cash-constrained under these inputs.`
        : "Runway cannot be computed."
      : `Net burn ${netBurn.toFixed(0)} / month implies roughly ${runwayMonths.toFixed(1)} months of runway at current cash.`;
  const base: Record<string, unknown> = {
    mode: "assist",
    toolName: "assist_runway_estimate",
    summary,
    keyAssumptions: [
      "Burn and revenue are smooth month to month.",
      "Cash on hand is fully available for operations.",
    ],
    recommendations: [
      runwayMonths !== null && runwayMonths < 9
        ? "Open a scenario plan: freeze discretionary spend and model revenue recovery before new hires."
        : "Maintain a rolling 13-week cash view so net burn drift is visible early.",
      "Pair runway with a single trigger date for fundraising or cost actions.",
    ],
    nextQuestions: [
      "What is the minimum viable team cost if revenue slips 20%?",
      "Are there receivables not yet counted in cash on hand?",
    ],
    metrics: {
      netBurn,
      runwayMonths,
    },
  };
  const { messageHtml, plainSummary } = await enrichAssistOutputWithOpenAI({
    toolLabel: "assist_runway_estimate",
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
