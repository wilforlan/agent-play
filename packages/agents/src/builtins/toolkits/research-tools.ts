import { tool } from "langchain";
import { z } from "zod";

const researchChat = tool(({ message }: { message: string }) => `research:${message}`, {
  name: "chat_tool",
  description: "Record chat for the play world (research).",
  schema: z.object({ message: z.string() }),
});

const assistSummarizeSource = tool(
  (_args: { excerpt: string; maxBullets?: number }) => "bullets",
  {
    name: "assist_summarize_source",
    description: "Produce a neutral summary of the supplied source excerpt with key claims.",
    schema: z.object({
      excerpt: z.string(),
      maxBullets: z.number().optional(),
    }),
  }
);

const assistFindCitations = tool(
  (_args: { claims: string[]; style?: "apa" | "mla" | "short" }) => "citations",
  {
    name: "assist_find_citations",
    description: "Propose citation-style references for claims given available metadata.",
    schema: z.object({
      claims: z.array(z.string()),
      style: z.enum(["apa", "mla", "short"]).optional(),
    }),
  }
);

const extractKeyPoints = tool((_args: { text: string }) => "points", {
  name: "extract_key_points",
  description: "Extract key points from prose.",
  schema: z.object({ text: z.string() }),
});

const compareClaims = tool((_args: { a: string; b: string }) => "compare", {
  name: "compare_claims",
  description: "Compare two claims for agreement or tension.",
  schema: z.object({ a: z.string(), b: z.string() }),
});

export const researchTools = [
  researchChat,
  assistSummarizeSource,
  assistFindCitations,
  extractKeyPoints,
  compareClaims,
] as const;
