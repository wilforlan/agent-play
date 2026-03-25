import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { agentPlayDebug } from "../lib/agent-play-debug.js";
import type { PlayWorld } from "../lib/play-world.js";

export type LangChainAgentLike = {
  invoke: (...args: unknown[]) => Promise<unknown>;
  tools?: readonly { name: string }[];
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

function recordLastUserFromInvokeArgs(
  world: PlayWorld,
  playerId: string,
  args: unknown[]
): void {
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
        world.recordInteraction({ playerId, role: "user", text: t });
      }
      return;
    }
    if (typeof m === "object" && m !== null) {
      const o = m as Record<string, unknown>;
      if (o.role === "user" || o.type === "human") {
        const t = normalizeMessageContent(o.content).trim();
        if (t.length > 0) {
          world.recordInteraction({ playerId, role: "user", text: t });
        }
        return;
      }
    }
  }
}

function recordLastAssistantFromInvokeResult(
  world: PlayWorld,
  playerId: string,
  result: unknown
): void {
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
        world.recordInteraction({ playerId, role: "assistant", text: t });
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
          world.recordInteraction({ playerId, role: "assistant", text: t });
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
    return { type: "langchain", toolNames: [] };
  }
  const tools =
    (agent as { tools?: readonly { name: string }[] }).tools ?? [];
  return {
    type: "langchain",
    toolNames: tools.map((t) => t.name),
  };
}

export function attachLangChainInvoke(
  agent: unknown,
  world: PlayWorld,
  playerId: string
): void {
  requireInvoke(agent);
  const reg = langchainRegistration(agent);
  world.syncPlayerStructuresFromTools(playerId, reg.toolNames);
  agentPlayDebug("langchain", "attachLangChainInvoke", {
    playerId,
    toolNames: reg.toolNames,
  });
  const target = agent as {
    invoke: (...args: unknown[]) => Promise<unknown>;
  };
  const originalInvoke = target.invoke.bind(agent);
  target.invoke = async (...args: unknown[]) => {
    recordLastUserFromInvokeArgs(world, playerId, args);
    const result = await originalInvoke(...args);
    world.ingestInvokeResult(playerId, result);
    recordLastAssistantFromInvokeResult(world, playerId, result);
    return result;
  };
}

export function langchainAgent(
  agent: unknown,
  world: PlayWorld,
  playerId: string
): { type: "langchain"; toolNames: string[] } {
  attachLangChainInvoke(agent, world, playerId);
  return langchainRegistration(agent);
}
