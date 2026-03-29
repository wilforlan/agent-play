import {
  isAIMessage,
  isBaseMessage,
  isHumanMessage,
  isToolMessage,
} from "@langchain/core/messages";
import { agentPlayDebug } from "./agent-play-debug.js";
import type {
  DestinationJourneyStep,
  StructureJourneyStep,
  Journey,
  JourneyStep,
  OriginJourneyStep,
} from "./@types/world.js";

type RawMessage = Record<string, unknown>;

function getStringField(o: RawMessage, key: string): string | undefined {
  const v = o[key];
  return typeof v === "string" ? v : undefined;
}

function getId(msg: unknown): string {
  if (typeof msg !== "object" || msg === null) return "";
  const id = (msg as RawMessage).id;
  return typeof id === "string" ? id : "";
}

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return Array.from(content, String).join("");
  if (content === undefined || content === null) return "";
  return String(content);
}

type ToolCallEntry = {
  id: string;
  name: string;
  args?: Record<string, unknown>;
};

function getToolCalls(msg: RawMessage): ToolCallEntry[] {
  const raw = msg.tool_calls;
  if (!Array.isArray(raw)) return [];
  const out: ToolCallEntry[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as RawMessage;
    const id = getStringField(o, "id");
    const name = getStringField(o, "name");
    if (!id || !name) continue;
    const args = o.args;
    const argsRecord =
      typeof args === "object" && args !== null && !Array.isArray(args)
        ? (args as Record<string, unknown>)
        : {};
    out.push({ id, name, args: argsRecord });
  }
  return out;
}

function isPlainToolShape(msg: RawMessage): boolean {
  return (
    typeof msg.name === "string" &&
    typeof msg.tool_call_id === "string"
  );
}

function isPlainHumanShape(msg: RawMessage): boolean {
  const t = msg.type;
  if (t === "human" || t === "user") return true;
  return (
    normalizeContent(msg.content).length > 0 &&
    getToolCalls(msg).length === 0 &&
    !isPlainToolShape(msg) &&
    typeof msg.name !== "string"
  );
}

function isPlainAiWithTools(msg: RawMessage): boolean {
  return getToolCalls(msg).length > 0;
}

function isPlainAiFinal(msg: RawMessage): boolean {
  const content = normalizeContent(msg.content);
  return (
    content.length > 0 &&
    getToolCalls(msg).length === 0 &&
    !isPlainToolShape(msg) &&
    (typeof msg.name === "string" ||
      msg.type === "ai" ||
      msg.type === "assistant")
  );
}

function classifyMessage(
  msg: unknown
): "human" | "ai_tools" | "tool" | "ai_final" | "skip" {
  if (typeof msg !== "object" || msg === null) return "skip";
  if (isBaseMessage(msg)) {
    if (isHumanMessage(msg)) return "human";
    if (isToolMessage(msg)) return "tool";
    if (isAIMessage(msg)) {
      const tc = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
      if (tc.length > 0) return "ai_tools";
      if (normalizeContent(msg.content).length > 0) return "ai_final";
    }
    return "skip";
  }
  const plain = msg as RawMessage;
  if (isPlainToolShape(plain)) return "tool";
  if (isPlainHumanShape(plain)) return "human";
  if (isPlainAiWithTools(plain)) return "ai_tools";
  if (isPlainAiFinal(plain)) return "ai_final";
  return "skip";
}

export function extractJourney(
  messages: unknown[],
  startedAt: Date = new Date()
): Journey {
  agentPlayDebug("journey-from-messages", "extractJourney", {
    messageCount: messages.length,
  });
  const draftSteps: JourneyStep[] = [];
  const toolResults = new Map<string, string>();

  for (const raw of messages) {
    const kind = classifyMessage(raw);
    if (kind === "skip") continue;

    if (kind === "human") {
      const msg = raw as RawMessage;
      const step: OriginJourneyStep = {
        type: "origin",
        content: normalizeContent(msg.content),
        messageId: getId(raw),
      };
      draftSteps.push(step);
    } else if (kind === "ai_tools") {
      const msg = raw as RawMessage;
      for (const tc of getToolCalls(msg)) {
        const step: StructureJourneyStep = {
          type: "structure",
          toolName: tc.name,
          toolCallId: tc.id,
          args: tc.args ?? {},
        };
        draftSteps.push(step);
      }
    } else if (kind === "tool") {
      const msg = raw as RawMessage;
      const tid = msg.tool_call_id;
      if (typeof tid === "string") {
        toolResults.set(tid, normalizeContent(msg.content));
      }
    } else if (kind === "ai_final") {
      const msg = raw as RawMessage;
      const withResults: JourneyStep[] = draftSteps.map((step) => {
        if (step.type === "structure") {
          const r = toolResults.get(step.toolCallId);
          const merged: StructureJourneyStep = {
            ...step,
            ...(r !== undefined ? { result: r } : {}),
          };
          return merged;
        }
        return step;
      });
      const dest: DestinationJourneyStep = {
        type: "destination",
        content: normalizeContent(msg.content),
        messageId: getId(raw),
      };
      const completedAt = new Date();
      return {
        steps: [...withResults, dest],
        startedAt,
        completedAt,
      };
    }
  }

  const completedAt = new Date();
  return { steps: draftSteps, startedAt, completedAt };
}
