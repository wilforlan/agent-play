import { tool } from "langchain";
import { z } from "zod";

const calculatorChatTool = tool(
  ({ message }: { message: string }) => `calculator:${message}`,
  {
    name: "chat_tool",
    description: "Production-style calculator assistant chat tool.",
    schema: z.object({
      message: z.string(),
    }),
  }
);

const assistCalculateCoefficient = tool(
  ({
    equation,
    variable,
  }: {
    equation: string;
    variable: string;
  }) => `coefficient:${equation}:${variable}`,
  {
    name: "assist_calculate_coefficient",
    description:
      "Extract the coefficient of a variable from a linear or polynomial equation string.",
    schema: z.object({
      equation: z.string(),
      variable: z.string(),
    }),
  }
);

const policeChatTool = tool(
  ({ message }: { message: string }) => `police:${message}`,
  {
    name: "chat_tool",
    description: "Production-style police incident reporting chat tool.",
    schema: z.object({
      message: z.string(),
    }),
  }
);

const assistCollectSceneDetails = tool(
  ({
    location,
    incidentType,
    witnesses,
    injuriesReported,
    suspectDescription,
    immediateRisk,
  }: {
    location: string;
    incidentType: string;
    witnesses?: string;
    injuriesReported?: boolean;
    suspectDescription?: string;
    immediateRisk?: "low" | "medium" | "high";
  }) =>
    `scene:${location}:${incidentType}:${witnesses ?? ""}:${String(injuriesReported ?? false)}:${
      suspectDescription ?? ""
    }:${immediateRisk ?? "low"}`,
  {
    name: "assist_collect_scene_details",
    description:
      "Collect structured details from an incident scene report for police documentation.",
    schema: z.object({
      location: z.string(),
      incidentType: z.string(),
      witnesses: z.string().optional(),
      injuriesReported: z.boolean().optional(),
      suspectDescription: z.string().optional(),
      immediateRisk: z.enum(["low", "medium", "high"]).optional(),
    }),
  }
);

export const calculatorTools = [
  calculatorChatTool,
  assistCalculateCoefficient,
] as const;

export const policeReportTools = [policeChatTool, assistCollectSceneDetails] as const;
