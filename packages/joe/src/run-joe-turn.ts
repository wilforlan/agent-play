import { buildJoeRetrySystemAddon, buildJoeSystemPrompt } from "./prompt.js";
import { scoreJoeLessonRelevance } from "./relevance.js";
import type { JoeModel, JoeModelChatMessage } from "./joe-model.js";
import {
  JOE_MIN_RELEVANCE,
  JoeStructuredReplySchema,
  type JoeLessonContext,
  type JoeMessage,
  type JoeStructuredReply,
} from "./schemas.js";

const extractJsonObject = (raw: string): unknown => {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    }
    throw new Error("Joe reply was not valid JSON");
  }
};

const replyToText = (reply: JoeStructuredReply): string =>
  [
    reply.headline,
    ...reply.blocks.map((b) => b.body),
    reply.nextMove,
  ].join("\n");

const historyToModelMessages = (
  history: readonly JoeMessage[]
): JoeModelChatMessage[] =>
  history.map((m) => ({
    role: m.role === "joe" ? "assistant" : "user",
    content:
      m.role === "joe" && m.structured !== undefined
        ? JSON.stringify(m.structured)
        : m.text,
  }));

export type RunJoeTurnResult = {
  readonly message: JoeMessage;
  readonly relevance: number;
  readonly structured: JoeStructuredReply;
};

export const runJoeTurn = async (input: {
  lesson: JoeLessonContext;
  history: readonly JoeMessage[];
  studentText: string;
  model: JoeModel;
  now: string;
  idFactory?: () => string;
}): Promise<RunJoeTurnResult> => {
  const idFactory =
    input.idFactory ??
    (() => `joe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);

  const baseSystem = buildJoeSystemPrompt(input.lesson);
  const prior = historyToModelMessages(input.history);
  const userMessages: JoeModelChatMessage[] = [
    ...prior,
    { role: "user", content: input.studentText },
  ];

  const attempt = async (system: string): Promise<RunJoeTurnResult> => {
    const raw = await input.model.complete({
      system,
      messages: userMessages,
    });
    const parsed = JoeStructuredReplySchema.parse(extractJsonObject(raw));
    const text = replyToText(parsed);
    const scored = scoreJoeLessonRelevance({
      lessonBody: input.lesson.lessonBody,
      replyText: text,
    });
    const relevance =
      scored >= JOE_MIN_RELEVANCE
        ? Math.max(scored, Math.min(1, parsed.relevance))
        : scored;
    const clamped = Math.max(0, Math.min(1, Math.round(relevance * 1000) / 1000));
    const structured: JoeStructuredReply = {
      ...parsed,
      relevance: clamped,
    };
    return {
      relevance: clamped,
      structured,
      message: {
        id: idFactory(),
        role: "joe",
        text,
        createdAt: input.now,
        structured,
      },
    };
  };

  const first = await attempt(baseSystem);
  if (first.relevance >= JOE_MIN_RELEVANCE) {
    return first;
  }
  return attempt(`${baseSystem}\n\n${buildJoeRetrySystemAddon()}`);
};
