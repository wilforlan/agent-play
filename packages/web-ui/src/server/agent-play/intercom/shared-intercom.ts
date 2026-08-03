import { z } from "zod";

export * from "../../../../../intercom/src/index.js";

export const WORLD_CHAT_PUBLISH_OP = "worldChatPublish" as const;
export const WORLD_CHAT_HISTORY_OP = "worldChatHistory" as const;
export const WORLD_CHAT_REACT_OP = "worldChatReact" as const;

const NonEmpty = z.string().trim().min(1);

const WorldChatPublishPayloadSchema = z
  .object({
    requestId: NonEmpty,
    mainNodeId: NonEmpty,
    fromPlayerId: NonEmpty,
    message: NonEmpty,
    parentRequestId: NonEmpty.optional(),
  })
  .strict();

export type WorldChatPublishPayload = z.infer<
  typeof WorldChatPublishPayloadSchema
>;

const WorldChatHistoryPayloadSchema = z
  .object({
    limit: z.number().int().min(1).max(200).default(100),
    beforeSeq: z.number().int().positive().optional(),
  })
  .strict();

export type WorldChatHistoryPayload = z.infer<typeof WorldChatHistoryPayloadSchema>;

const WorldChatReactPayloadSchema = z
  .object({
    requestId: NonEmpty,
    mainNodeId: NonEmpty,
    fromPlayerId: NonEmpty,
    kind: z.enum(["love", "thumbs_up"]),
    action: z.enum(["set", "cancel"]),
  })
  .strict();

export type WorldChatReactPayload = z.infer<typeof WorldChatReactPayloadSchema>;

export function parseWorldChatPublishPayload(
  payload: unknown
): WorldChatPublishPayload {
  return WorldChatPublishPayloadSchema.parse(payload);
}

export function parseWorldChatHistoryPayload(
  payload: unknown
): WorldChatHistoryPayload {
  return WorldChatHistoryPayloadSchema.parse(payload);
}

export function parseWorldChatReactPayload(
  payload: unknown
): WorldChatReactPayload {
  return WorldChatReactPayloadSchema.parse(payload);
}
