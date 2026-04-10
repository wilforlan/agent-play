import { z } from "zod";

const schema = z.object({
  currentPrice: z.number(),
  expectedCustomers: z.number().int().nonnegative(),
  testPrices: z.array(z.number()).min(1),
});

export function executeAssistPricingScenarios(args: Record<string, unknown>): {
  mode: "assist";
  toolName: "assist_pricing_scenarios";
  summary: string;
  keyAssumptions: string[];
  recommendations: string[];
  nextQuestions: string[];
  metrics: {
    baselineMonthlyRevenue: number;
    scenarioMonthlyRevenues: number[];
  };
} {
  const p = schema.parse(args);
  const baselineMonthlyRevenue = p.currentPrice * p.expectedCustomers;
  const scenarioMonthlyRevenues = p.testPrices.map(
    (price) => price * p.expectedCustomers
  );
  const bestIdx = scenarioMonthlyRevenues.reduce(
    (best, v, i, arr) => (v > arr[best] ? i : best),
    0
  );
  const liftVsBaseline =
    baselineMonthlyRevenue > 0
      ? ((scenarioMonthlyRevenues[bestIdx] ?? 0) - baselineMonthlyRevenue) /
        baselineMonthlyRevenue
      : 0;
  return {
    mode: "assist",
    toolName: "assist_pricing_scenarios",
    summary: `Baseline monthly revenue at the current price is ${baselineMonthlyRevenue.toFixed(0)}. Among test prices, index ${bestIdx} yields the highest monthly revenue (${scenarioMonthlyRevenues[bestIdx]?.toFixed(0)}), about ${(liftVsBaseline * 100).toFixed(1)}% vs baseline at equal volume.`,
    keyAssumptions: [
      "Customer count is unchanged across price points in this pass.",
      "No incremental discounts or payment-term effects are modeled.",
    ],
    recommendations: [
      "Validate the winning price against churn elasticity before rolling out broadly.",
      "Add a downside case with 10% fewer customers at the higher price.",
    ],
    nextQuestions: [
      "What is your current monthly logo churn at the baseline price?",
      "Are annual prepay options available to improve cash timing?",
    ],
    metrics: {
      baselineMonthlyRevenue,
      scenarioMonthlyRevenues,
    },
  };
}
