import { tool } from "langchain";
import { z } from "zod";

const salesChat = tool(({ message }: { message: string }) => `sales:${message}`, {
  name: "chat_tool",
  description: "General sales chat for pipeline and conversion support.",
  schema: z.object({ message: z.string() }),
});

const assistPipelineReview = tool(
  (_args: {
    leadCount: number;
    qualifiedCount: number;
    proposalCount: number;
    closedWonCount: number;
  }) => "pipeline_review_ready",
  {
    name: "assist_pipeline_review",
    description: "Review pipeline health and highlight stage conversion bottlenecks.",
    schema: z.object({
      leadCount: z.number().int().nonnegative(),
      qualifiedCount: z.number().int().nonnegative(),
      proposalCount: z.number().int().nonnegative(),
      closedWonCount: z.number().int().nonnegative(),
    }),
  }
);

const assistObjectionHandling = tool(
  (_args: {
    product: string;
    objection: string;
    buyerType?: "founder" | "manager" | "procurement";
  }) => "objection_handling_ready",
  {
    name: "assist_objection_handling",
    description: "Craft responses to common objections based on product and buyer context.",
    schema: z.object({
      product: z.string(),
      objection: z.string(),
      buyerType: z.enum(["founder", "manager", "procurement"]).optional(),
    }),
  }
);

const assistFollowupSequence = tool(
  (_args: { audience: string; goal: string; days: number }) => "followup_sequence_ready",
  {
    name: "assist_followup_sequence",
    description: "Generate a short follow-up sequence to improve response and close rate.",
    schema: z.object({
      audience: z.string(),
      goal: z.string(),
      days: z.number().int().positive(),
    }),
  }
);

export const salesTools = [
  salesChat,
  assistPipelineReview,
  assistObjectionHandling,
  assistFollowupSequence,
] as const;
