import { agentPlayDebug } from "../lib/agent-play-debug.js";
import type { AssistToolSpec, LangChainAgentRegistration } from "../public-types.js";

const CHAT_TOOL = "chat_tool";

function formatMissingAgentToolsError(): string {
  return [
    "langchainRegistration: expected a LangChain agent with a tools array.",
    "",
    "  Pass the object returned from createAgent({ tools: [...] }) (or equivalent) so tool names are available for the play world.",
    "  The tools array must include named tools; see the separate message if \"chat_tool\" or assist_* tools are missing.",
  ].join("\n");
}

function formatMissingChatToolError(): string {
  return [
    "langchainRegistration: missing required tool \"chat_tool\".",
    "",
    "  Add a tool named \"chat_tool\" to your LangChain agent so the play world can show chat and proximity interactions.",
    "  Example: tool(() => \"…\", { name: \"chat_tool\", description: \"…\", schema: z.object({ … }) })",
    "",
    "  Tools whose names start with \"assist_\" are listed as assist actions on the watch UI; give each a Zod object schema so parameters can be shown in the UI.",
  ].join("\n");
}

function parametersFromSchema(schema: unknown): Record<string, unknown> {
  if (schema === null || typeof schema !== "object") {
    return {};
  }
  const z = schema as {
    _def?: { typeName?: string; shape?: () => Record<string, unknown> };
  };
  if (typeof z._def?.shape !== "function") {
    return { _note: "Pass a Zod object schema on each tool for parameter hints in the watch UI." };
  }
  const shape = z._def.shape();
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(shape)) {
    out[key] = { field: key };
  }
  return out;
}

function describeTool(t: {
  name: string;
  description?: string;
  schema?: unknown;
}): AssistToolSpec {
  return {
    name: t.name,
    description:
      typeof t.description === "string" && t.description.length > 0
        ? t.description
        : t.name,
    parameters: parametersFromSchema(t.schema),
  };
}

function extractToolsArray(agent: unknown): unknown[] | null {
  if (typeof agent !== "object" || agent === null) {
    return null;
  }
  const a = agent as {
    tools?: unknown;
    options?: { tools?: unknown };
  };
  if (Array.isArray(a.tools)) {
    return a.tools;
  }
  if (
    a.options !== undefined &&
    typeof a.options === "object" &&
    a.options !== null &&
    "tools" in a.options &&
    Array.isArray((a.options as { tools: unknown }).tools)
  ) {
    return (a.options as { tools: unknown[] }).tools;
  }
  return null;
}

export function langchainRegistration(
  agent: unknown
): LangChainAgentRegistration {
  const rawTools = extractToolsArray(agent);
  if (rawTools === null) {
    throw new Error(formatMissingAgentToolsError());
  }
  const tools =
    rawTools as readonly { name: string; description?: string; schema?: unknown }[];
  const names = tools.map((x) => x.name);
  if (!names.includes(CHAT_TOOL)) {
    throw new Error(formatMissingChatToolError());
  }
  const assistTools = tools
    .filter((t) => t.name.startsWith("assist_"))
    .map((t) => describeTool(t));
  agentPlayDebug("langchain", "langchainRegistration", {
    toolCount: names.length,
    assistCount: assistTools.length,
  });
  return {
    type: "langchain",
    toolNames: names,
    assistTools,
  };
}
