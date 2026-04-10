import { tool } from "langchain";
import { z } from "zod";

const playWorldChat = tool(({ message }: { message: string }) => `play-world:${message}`, {
  name: "chat_tool",
  description: "Record chat for the play world (play world assistant).",
  schema: z.object({ message: z.string() }),
});

const assistExplainStructure = tool(
  (_args: { toolName: string; audience?: "developer" | "stakeholder" }) => "explained",
  {
    name: "assist_explain_structure",
    description: "Explain how a tool-derived structure on the Agent Play map relates to your agent.",
    schema: z.object({
      toolName: z.string(),
      audience: z.enum(["developer", "stakeholder"]).optional(),
    }),
  }
);

const assistRecordJourneyHint = tool(
  (_args: { userGoal: string; toolNames?: string[] }) => "hint",
  {
    name: "assist_record_journey_hint",
    description: "Suggest how to shape a journey (origin, tool steps, destination) for the watch UI.",
    schema: z.object({
      userGoal: z.string(),
      toolNames: z.array(z.string()).optional(),
    }),
  }
);

const describeZoneSignal = tool((_args: { zoneCount: number }) => "zone", {
  name: "describe_zone_signal",
  description: "Describe a zone proximity signal for debugging or UX copy.",
  schema: z.object({ zoneCount: z.number() }),
});

const describeYieldSignal = tool((_args: { yieldCount: number }) => "yield", {
  name: "describe_yield_signal",
  description: "Describe a yield proximity signal for debugging or UX copy.",
  schema: z.object({ yieldCount: z.number() }),
});

export const playWorldTools = [
  playWorldChat,
  assistExplainStructure,
  assistRecordJourneyHint,
  describeZoneSignal,
  describeYieldSignal,
] as const;
