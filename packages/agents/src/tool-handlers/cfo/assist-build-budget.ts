import { z } from "zod";
import { enrichAssistOutputWithOpenAI } from "../../lib/assist-openai-enrichment.js";

const schema = z.object({
  monthlyRevenue: z.number(),
  monthlyFixedCosts: z.number(),
  monthlyVariableCosts: z.number(),
});

const SYSTEM = [
  "You are an expert startup CFO assistant.",
  "You receive JSON with monthly revenue, fixed and variable costs, net operating income, operating margin %, and narrative lists.",
  "Produce founder-friendly HTML and a short plainSummary. Keep HTML accessible: headings, short paragraphs, bullet lists.",
].join(" ");

export async function executeAssistBuildBudget(
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const p = schema.parse(args);
  const netOperatingIncome =
    p.monthlyRevenue - p.monthlyFixedCosts - p.monthlyVariableCosts;
  const operatingMarginPercent =
    p.monthlyRevenue > 0 ? (netOperatingIncome / p.monthlyRevenue) * 100 : 0;
  const marginLabel =
    operatingMarginPercent >= 15
      ? "healthy for most SaaS at this scale"
      : operatingMarginPercent >= 0
        ? "positive but thin; prioritize cost levers or pricing tests"
        : "negative; runway risk without revenue lift or cost cuts";
  const base: Record<string, unknown> = {
    mode: "assist",
    toolName: "assist_build_budget",
    summary: `Net operating income is ${netOperatingIncome.toFixed(0)} per month (${operatingMarginPercent.toFixed(1)}% margin), which is ${marginLabel}.`,
    keyAssumptions: [
      "Revenue and cost inputs are steady month over month.",
      "No one-off expenses or seasonality are modeled here.",
    ],
    recommendations: [
      netOperatingIncome < 0
        ? "Model a 10% revenue lift and a 5% fixed-cost trim to see which restores margin first."
        : "Stress-test variable costs +15% to see if margin stays above your internal guardrail.",
      "Split variable costs into COGS vs. GTM to decide whether gross margin or opex is the bottleneck.",
    ],
    nextQuestions: [
      "What is your target gross margin band for the next two quarters?",
      "Which cost line is most uncertain (infra, support load, or ad spend)?",
    ],
    metrics: {
      netOperatingIncome,
      operatingMarginPercent,
    },
  };
  const { messageHtml, plainSummary } = await enrichAssistOutputWithOpenAI({
    toolLabel: "assist_build_budget",
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
