import { tool } from "langchain";
import { z } from "zod";

const cfoChat = tool(({ message }: { message: string }) => `cfo:${message}`, {
  name: "chat_tool",
  description: "General CFO chat for founder finance questions.",
  schema: z.object({ message: z.string() }),
});

const assistBuildBudget = tool(
  (_args: {
    monthlyRevenue: number;
    monthlyFixedCosts: number;
    monthlyVariableCosts: number;
  }) => "budget_plan_ready",
  {
    name: "assist_build_budget",
    description: "Build a simple monthly operating budget from revenue and cost inputs.",
    schema: z.object({
      monthlyRevenue: z.number(),
      monthlyFixedCosts: z.number(),
      monthlyVariableCosts: z.number(),
    }),
  }
);

const assistCashflowForecast = tool(
  (_args: {
    currentCash: number;
    monthlyInflow: number;
    monthlyOutflow: number;
    months: number;
  }) => "cashflow_forecast_ready",
  {
    name: "assist_cashflow_forecast",
    description: "Project cash position over the selected number of months.",
    schema: z.object({
      currentCash: z.number(),
      monthlyInflow: z.number(),
      monthlyOutflow: z.number(),
      months: z.number().int().positive(),
    }),
  }
);

const assistRunwayEstimate = tool(
  (_args: {
    cashOnHand: number;
    monthlyBurn: number;
    monthlyRevenue: number;
  }) => "runway_estimate_ready",
  {
    name: "assist_runway_estimate",
    description:
      "Estimate runway from cash on hand, monthly burn, and monthly revenue (net burn = burn minus revenue).",
    schema: z.object({
      cashOnHand: z.number(),
      monthlyBurn: z.number(),
      monthlyRevenue: z.number(),
    }),
  }
);

const assistPricingScenarios = tool(
  (_args: {
    currentPrice: number;
    expectedCustomers: number;
    testPrices: number[];
  }) => "pricing_scenarios_ready",
  {
    name: "assist_pricing_scenarios",
    description: "Compare revenue outcomes across multiple pricing scenarios.",
    schema: z.object({
      currentPrice: z.number(),
      expectedCustomers: z.number().int().nonnegative(),
      testPrices: z.array(z.number()).min(1),
    }),
  }
);

const assistHiringPlanFinance = tool(
  (_args: {
    currentTeamSize: number;
    plannedHires: number;
    averageMonthlyCostPerHire: number;
  }) => "hiring_finance_plan_ready",
  {
    name: "assist_hiring_plan_finance",
    description: "Model financial impact of planned hiring over monthly operating budget.",
    schema: z.object({
      currentTeamSize: z.number().int().nonnegative(),
      plannedHires: z.number().int().nonnegative(),
      averageMonthlyCostPerHire: z.number().nonnegative(),
    }),
  }
);

export const cfoTools = [
  cfoChat,
  assistBuildBudget,
  assistCashflowForecast,
  assistRunwayEstimate,
  assistPricingScenarios,
  assistHiringPlanFinance,
] as const;
