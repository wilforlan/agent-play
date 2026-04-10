import { z } from "zod";

const schema = z.object({
  currentCash: z.number(),
  monthlyInflow: z.number(),
  monthlyOutflow: z.number(),
  months: z.number().int().positive(),
});

export function executeAssistCashflowForecast(args: Record<string, unknown>): {
  mode: "assist";
  toolName: "assist_cashflow_forecast";
  summary: string;
  keyAssumptions: string[];
  recommendations: string[];
  nextQuestions: string[];
  metrics: {
    netMonthlyFlow: number;
    projectedEndingCash: number;
  };
} {
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
  return {
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
}
