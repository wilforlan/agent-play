import { executeAssistCalculateCoefficient } from "./assist-calculate-coefficient.js";
import { executeAssistCollectSceneDetails } from "./assist-collect-scene-details.js";
import { executeChatTool } from "./chat-tool.js";

export type ToolCapabilityHandler = (
  args: Record<string, unknown>
) => Record<string, unknown> | Promise<Record<string, unknown>>;

const registry = new Map<string, ToolCapabilityHandler>([
  ["chat_tool", (args) => executeChatTool({ message: String(args.message ?? "") })],
  [
    "assist_calculate_coefficient",
    (args) =>
      executeAssistCalculateCoefficient({
        equation: String(args.equation ?? ""),
        variable: String(args.variable ?? ""),
      }),
  ],
  [
    "assist_collect_scene_details",
    (args) =>
      executeAssistCollectSceneDetails({
        location: String(args.location ?? ""),
        incidentType: String(args.incidentType ?? ""),
        witnesses:
          typeof args.witnesses === "string" ? args.witnesses : undefined,
        injuriesReported:
          typeof args.injuriesReported === "boolean"
            ? args.injuriesReported
            : undefined,
        suspectDescription:
          typeof args.suspectDescription === "string"
            ? args.suspectDescription
            : undefined,
        immediateRisk:
          args.immediateRisk === "low" ||
          args.immediateRisk === "medium" ||
          args.immediateRisk === "high"
            ? args.immediateRisk
            : undefined,
      }),
  ],
]);

export function resolveToolCapabilityHandler(
  toolName: string
): ToolCapabilityHandler | null {
  return registry.get(toolName) ?? null;
}
