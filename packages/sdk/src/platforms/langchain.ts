/**
 * LangChain adapter: derives tool names and assist metadata from a LangChain agent for
 * {@link import("../public-types.js").LangChainAgentRegistration}.
 *
 * @remarks **Primary export:** {@link langchainRegistration}. Private helpers build error strings and
 * `AssistToolSpec` rows from Zod schemas when available.
 */
import { agentPlayDebug } from "../lib/agent-play-debug.js";
import type {
  AssistToolFieldType,
  AssistToolSpec,
  LangChainAgentRegistration,
} from "../public-types.js";

/** Required tool name enforced by the watch UI contract. */
const CHAT_TOOL = "chat_tool";

/**
 * Error text when the agent has no `tools` array.
 *
 * @remarks **Callers:** {@link langchainRegistration}. **Callees:** none.
 */
function formatMissingAgentToolsError(): string {
  return [
    "langchainRegistration: expected a LangChain agent with a tools array.",
    "",
    "  Pass the object returned from createAgent({ tools: [...] }) (or equivalent) so tool names are available for the play world.",
    "  The tools array must include named tools; see the separate message if \"chat_tool\" or assist_* tools are missing.",
  ].join("\n");
}

/**
 * Error text when `chat_tool` is missing from tool names.
 *
 * @remarks **Callers:** {@link langchainRegistration}. **Callees:** none.
 */
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

type ZodDef = {
  typeName?: string;
  innerType?: unknown;
  schema?: unknown;
};

function unwrapZodCell(cell: unknown): unknown {
  let current: unknown = cell;
  for (let depth = 0; depth < 32; depth++) {
    if (current === null || typeof current !== "object") {
      return current;
    }
    const def = (current as { _def?: ZodDef })._def;
    if (!def || typeof def.typeName !== "string") {
      return current;
    }
    const { typeName } = def;
    if (
      typeName === "ZodOptional" ||
      typeName === "ZodNullable" ||
      typeName === "ZodDefault"
    ) {
      const inner = def.innerType;
      current =
        inner !== null && typeof inner === "object" ? inner : undefined;
      continue;
    }
    if (typeName === "ZodEffects") {
      current = def.schema;
      continue;
    }
    return current;
  }
  return current;
}

function fieldTypeFromZodCell(cell: unknown): AssistToolFieldType {
  const base = unwrapZodCell(cell);
  if (base === null || typeof base !== "object") {
    return "string";
  }
  const typeName = (base as { _def?: { typeName?: string } })._def?.typeName;
  if (typeName === "ZodNumber") {
    return "number";
  }
  if (typeName === "ZodBoolean") {
    return "boolean";
  }
  if (typeName === "ZodString") {
    return "string";
  }
  return "string";
}

/**
 * Best-effort parameter shape from a Zod object schema’s `shape()` for UI hints.
 *
 * @remarks **Callers:** {@link describeTool}. **Callees:** none.
 */
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
    out[key] = {
      field: key,
      fieldType: fieldTypeFromZodCell(shape[key]),
    };
  }
  return out;
}

/**
 * Builds an {@link AssistToolSpec} from a LangChain tool descriptor.
 *
 * @remarks **Callers:** {@link langchainRegistration} for `assist_*` tools only. **Callees:** {@link parametersFromSchema}.
 */
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

/**
 * Reads `agent.tools` or `agent.options.tools` from common LangChain agent shapes.
 *
 * @returns The tools array, or `null` if not found.
 *
 * @remarks **Callers:** {@link langchainRegistration} only. **Callees:** none.
 */
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

/**
 * Validates a LangChain-style agent exposes tools (including required `chat_tool`) and returns
 * a {@link LangChainAgentRegistration} for `RemotePlayWorld.addAgent`.
 *
 * @param agent - Return value from `createAgent` (or equivalent) with a `tools` array.
 * @throws Error if tools are missing or `chat_tool` is not present.
 *
 * @remarks **Callers:** user code before `RemotePlayWorld.addAgent`. **Callees:** {@link extractToolsArray},
 * {@link formatMissingAgentToolsError}, {@link formatMissingChatToolError}, {@link describeTool}, {@link agentPlayDebug}.
 */
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
