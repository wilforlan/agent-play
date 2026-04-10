import { z } from "zod";
import { enrichAssistOutputWithOpenAI } from "../../lib/assist-openai-enrichment.js";

const schema = z.object({
  currentCash: z.number(),
  monthlyInflow: z.number(),
  monthlyOutflow: z.number(),
  months: z.number().int().positive(),
});

const SYSTEM = [
  "You are a CFO assistant focused on cash forecasting.",
  "You receive JSON with cash, inflows, outflows, horizon months, net monthly flow, projected ending cash, and runway hints.",
  "Return clear HTML and a plainSummary for founders.",
].join(" ");

export async function executeAssistCashflowForecast(
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const p = schema.parse(args);
  const netMonthlyFlow = p.monthlyInflow - p.monthlyOutflow;
  const projectedEndingCash = p.currentCash + netMonthlyFlow * p.months;
  const runwayMonths =
    netMonthlyFlow < 0 && netMonthlyFlow !== 0
      ? p.currentCash / Math.abs(netMonthlyFlow)
      : Number.POSITIVE_INFINITY;
  const runwayLabel =
    Number.isFinite(runwayMonths) && netMonthlyFlow < 0
      ? `At this burn, cash lasts about ${runwayMonths.toFixed(1)} months without changes.`
      : netMonthlyFlow >= 0
        ? "Cash balance is projected to grow over the horizon."
        : "Burn is negative but runway cannot be computed without a positive cash balance.";
  const base: Record<string, unknown> = {
    mode: "assist",
    toolName: "assist_cashflow_forecast",
    summary: `Net monthly flow is ${netMonthlyFlow.toFixed(0)}; after ${p.months} month(s) ending cash lands near ${projectedEndingCash.toFixed(0)}. ${runwayLabel}`,
    keyAssumptions: [
      "Inflows and outflows stay flat each month in the window.",
      "No new financing or lumpy tax payments are included.",
    ],
    recommendations: [
      netMonthlyFlow < 0
        ? "Prioritize the top three outflow categories you can defer or renegotiate within 30 days."
        : "Park surplus cash against a 3-month opex buffer before discretionary spend.",
      "Add a downside case with inflow -10% and outflow +5% to test resilience.",
    ],
    nextQuestions: [
      "Which inflows are contracted vs. forecasted?",
      "Do you have an LOC or credit facility to bridge short gaps?",
    ],
    metrics: {
      netMonthlyFlow,
      projectedEndingCash,
    },
  };
  const { messageHtml, plainSummary } = await enrichAssistOutputWithOpenAI({
    toolLabel: "assist_cashflow_forecast",
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
