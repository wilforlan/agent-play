import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { agentPlayDebug } from "../lib/agent-play-debug.js";
import type { RecordInteractionInput } from "../public-types.js";

export type LangChainAgentLike = {
  invoke: (...args: unknown[]) => Promise<unknown>;
  tools?: readonly { name: string }[];
};

export type PlayWorldLike = {
  syncPlayerStructuresFromTools(
    playerId: string,
    toolNames: string[]
  ): void | Promise<void>;
  recordInteraction(input: RecordInteractionInput): void | Promise<void>;
  ingestInvokeResult(playerId: string, invokeResult: unknown): void | Promise<void>;
};

function requireInvoke(agent: unknown): asserts agent is { invoke: (...a: unknown[]) => Promise<unknown> } {
  if (
    typeof agent !== "object" ||
    agent === null ||
    !("invoke" in agent) ||
    typeof (agent as { invoke: unknown }).invoke !== "function"
  ) {
    throw new Error(
      "attachLangChainInvoke / langchainAgent require an object with an invoke method"
    );
  }
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (
          typeof part === "object" &&
          part !== null &&
          "text" in part &&
          typeof (part as { text: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return String(part);
      })
      .join("");
  }
  if (content === undefined || content === null) return "";
  return String(content);
}

async function recordLastUserFromInvokeArgs(
  world: PlayWorldLike,
  playerId: string,
  args: unknown[]
): Promise<void> {
  const first = args[0];
  if (typeof first !== "object" || first === null || !("messages" in first)) {
    return;
  }
  const raw = (first as { messages: unknown }).messages;
  if (!Array.isArray(raw)) return;
  for (let i = raw.length - 1; i >= 0; i -= 1) {
    const m = raw[i];
    if (HumanMessage.isInstance(m)) {
      const t = normalizeMessageContent(m.content).trim();
      if (t.length > 0) {
        await Promise.resolve(
          world.recordInteraction({ playerId, role: "user", text: t })
        );
      }
      return;
    }
    if (typeof m === "object" && m !== null) {
      const o = m as Record<string, unknown>;
      if (o.role === "user" || o.type === "human") {
        const t = normalizeMessageContent(o.content).trim();
        if (t.length > 0) {
          await Promise.resolve(
            world.recordInteraction({ playerId, role: "user", text: t })
          );
        }
        return;
      }
    }
  }
}

async function recordLastAssistantFromInvokeResult(
  world: PlayWorldLike,
  playerId: string,
  result: unknown
): Promise<void> {
  if (typeof result !== "object" || result === null || !("messages" in result)) {
    return;
  }
  const raw = (result as { messages: unknown }).messages;
  if (!Array.isArray(raw)) return;
  for (let i = raw.length - 1; i >= 0; i -= 1) {
    const m = raw[i];
    if (AIMessage.isInstance(m)) {
      const tc = m.tool_calls;
      const hasTools = Array.isArray(tc) && tc.length > 0;
      if (hasTools) continue;
      const t = normalizeMessageContent(m.content).trim();
      if (t.length > 0) {
        await Promise.resolve(
          world.recordInteraction({ playerId, role: "assistant", text: t })
        );
      }
      return;
    }
    if (typeof m === "object" && m !== null) {
      const o = m as Record<string, unknown>;
      if (o.type === "ai" || o.role === "assistant") {
        const tc = o.tool_calls;
        const hasTools = Array.isArray(tc) && tc.length > 0;
        if (hasTools) continue;
        const t = normalizeMessageContent(o.content).trim();
        if (t.length > 0) {
          await Promise.resolve(
            world.recordInteraction({ playerId, role: "assistant", text: t })
          );
        }
        return;
      }
    }
  }
}

export function langchainRegistration(agent: unknown): {
  type: "langchain";
  toolNames: string[];
} {
  if (typeof agent !== "object" || agent === null || !("tools" in agent)) {
    return { type: "langchain", toolNames: ["chat_tool"] };
  }
  const tools =
    (agent as { tools?: readonly { name: string }[] }).tools ?? [];
  const names = tools.map((t) => t.name);
  const withChat = names.includes("chat_tool")
    ? names
    : [...names, "chat_tool"];
  return {
    type: "langchain",
    toolNames: withChat,
  };
}

export async function attachLangChainInvoke(
  agent: unknown,
  world: PlayWorldLike,
  playerId: string
): Promise<void> {
  requireInvoke(agent);
  const reg = langchainRegistration(agent);
  await Promise.resolve(
    world.syncPlayerStructuresFromTools(playerId, reg.toolNames)
  );
  agentPlayDebug("langchain", "attachLangChainInvoke", {
    playerId,
    toolNames: reg.toolNames,
  });
  const target = agent as {
    invoke: (...args: unknown[]) => Promise<unknown>;
  };
  const originalInvoke = target.invoke.bind(agent);
  target.invoke = async (...args: unknown[]) => {
    await recordLastUserFromInvokeArgs(world, playerId, args);
    const result = await originalInvoke(...args);
    await Promise.resolve(world.ingestInvokeResult(playerId, result));
    await recordLastAssistantFromInvokeResult(world, playerId, result);
    return result;
  };
}

export async function langchainAgent(
  agent: unknown,
  world: PlayWorldLike,
  playerId: string
): Promise<{ type: "langchain"; toolNames: string[] }> {
  await attachLangChainInvoke(agent, world, playerId);
  return langchainRegistration(agent);
}
