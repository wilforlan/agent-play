import { z } from "zod";
import { enrichAssistOutputWithOpenAI } from "../../lib/assist-openai-enrichment.js";

const schema = z.object({
  product: z.string(),
  objection: z.string(),
  buyerType: z.enum(["founder", "manager", "procurement"]).optional(),
});

const SYSTEM = [
  "You are a senior enterprise AE coach.",
  "JSON includes product, objection text, buyer type, and a short strategic theme.",
  "Produce persuasive HTML (talk tracks, bullets) and plainSummary.",
].join(" ");

export async function executeAssistObjectionHandling(
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const p = schema.parse(args);
  const buyer = p.buyerType ?? "manager";
  const objectionLower = p.objection.toLowerCase();
  const theme = objectionLower.includes("price")
    ? "reframe ROI and payment timing"
    : objectionLower.includes("security") || objectionLower.includes("risk")
      ? "offer concrete controls, subprocessors, and rollout plan"
      : "clarify success criteria and a low-risk pilot";
  const base: Record<string, unknown> = {
    mode: "assist",
    toolName: "assist_objection_handling",
    summary: `For ${buyer} buyers evaluating ${p.product.trim()}, lead with empathy, quantify impact, then address "${p.objection.trim()}" by ${theme}.`,
    keyAssumptions: [
      "The objection is the primary blocker in the latest call notes.",
      "You can share a relevant customer proof point without NDA issues.",
    ],
    recommendations: [
      "Mirror the objection, then ask what evidence would reduce uncertainty on their side.",
      "Offer a decision timeline with named owners on both sides.",
    ],
    nextQuestions: [
      "What budget holder still needs to be aligned?",
      "Is procurement driven by checklist or business case?",
    ],
  };
  const { messageHtml, plainSummary } = await enrichAssistOutputWithOpenAI({
    toolLabel: "assist_objection_handling",
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
