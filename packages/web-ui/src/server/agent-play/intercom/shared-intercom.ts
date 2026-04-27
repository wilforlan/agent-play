import { z } from "zod";

export * from "../../../../../intercom/src/index.js";

export const WORLD_CHAT_PUBLISH_OP = "worldChatPublish" as const;
export const WORLD_CHAT_HISTORY_OP = "worldChatHistory" as const;

const NonEmpty = z.string().trim().min(1);

const WorldChatPublishPayloadSchema = z
  .object({
    requestId: NonEmpty,
    mainNodeId: NonEmpty,
    fromPlayerId: NonEmpty,
    message: NonEmpty,
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
