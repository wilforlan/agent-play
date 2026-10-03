/**
 * @packageDocumentation
 * **@agent-play/joe** — Joe, a structured lesson teacher agent.
 *
 * Use standalone with {@link createInMemoryJoeChatStore} + {@link createOpenAiJoeModel},
 * or host inside Agent Play (Redis + RPC).
 */

export {
  JOE_MIN_RELEVANCE,
  JoeBlockKindSchema,
  JoeLessonContextSchema,
  JoeMessageSchema,
  JoeReplyBlockSchema,
  JoeRoleSchema,
  JoeStructuredReplySchema,
  JoeThreadSchema,
  joeThreadKey,
  type JoeBlockKind,
  type JoeLessonContext,
  type JoeMessage,
  type JoeReplyBlock,
  type JoeRole,
  type JoeStructuredReply,
  type JoeThread,
} from "./schemas.js";

export { scoreJoeLessonRelevance } from "./relevance.js";
export {
  buildJoeRetrySystemAddon,
  buildJoeSystemPrompt,
} from "./prompt.js";
export type { JoeModel, JoeModelChatMessage } from "./joe-model.js";
export { runJoeTurn, type RunJoeTurnResult } from "./run-joe-turn.js";
export {
  createInMemoryJoeChatStore,
  type JoeChatStore,
} from "./store.js";
export {
  createOpenAiJoeModel,
  type CreateOpenAiJoeModelOptions,
} from "./openai-joe-model.js";
