import { executeAssistBuildBudget } from "./cfo/assist-build-budget.js";
import { executeAssistCashflowForecast } from "./cfo/assist-cashflow-forecast.js";
import { executeAssistFollowupSequence } from "./sales-ai/assist-followup-sequence.js";
import { executeAssistHiringPlanFinance } from "./cfo/assist-hiring-plan-finance.js";
import { executeAssistObjectionHandling } from "./sales-ai/assist-objection-handling.js";
import { executeAssistPipelineReview } from "./sales-ai/assist-pipeline-review.js";
import { executeAssistPricingScenarios } from "./cfo/assist-pricing-scenarios.js";
import { executeAssistRunwayEstimate } from "./cfo/assist-runway-estimate.js";
import { executeChatTool } from "./cfo/chat-tool.js";

export type ToolCapabilityHandler = (
  args: Record<string, unknown>
) => Record<string, unknown> | Promise<Record<string, unknown>>;

const registry = new Map<string, ToolCapabilityHandler>([
  ["assist_build_budget", executeAssistBuildBudget],
  ["assist_cashflow_forecast", executeAssistCashflowForecast],
  ["assist_runway_estimate", executeAssistRunwayEstimate],
  ["assist_pricing_scenarios", executeAssistPricingScenarios],
  ["assist_hiring_plan_finance", executeAssistHiringPlanFinance],
  ["assist_pipeline_review", executeAssistPipelineReview],
  ["assist_objection_handling", executeAssistObjectionHandling],
  ["assist_followup_sequence", executeAssistFollowupSequence],
]);

export function resolveToolCapabilityHandler(
  toolName: string
): ToolCapabilityHandler | null {
  if (toolName === "chat_tool") {
    return (args) => {
      const message = typeof args.text === "string" ? args.text : "";
      return Promise.resolve(
        executeChatTool({ text: message }) as Record<string, unknown>
      );
    };
  }
  return registry.get(toolName) ?? null;
}
