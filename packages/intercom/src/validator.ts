import { z } from "zod";

const NonEmpty = z.string().trim().min(1);

const IntercomCommandPayloadSchema = z
  .object({
    requestId: NonEmpty,
    mainNodeId: NonEmpty,
    fromPlayerId: NonEmpty,
    toPlayerId: NonEmpty,
    kind: z.enum(["assist", "chat"]),
    toolName: z.string().optional(),
    args: z.record(z.string(), z.unknown()).optional(),
    text: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "assist" && (value.toolName ?? "").trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toolName"],
        message: "toolName is required for assist",
      });
    }
    if (value.kind === "chat" && (value.text ?? "").trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["text"],
        message: "text is required for chat",
      });
    }
  });

const WorldIntercomEventPayloadSchema = z.object({
  requestId: NonEmpty,
  mainNodeId: NonEmpty,
  toPlayerId: NonEmpty,
  fromPlayerId: NonEmpty,
  kind: z.enum(["assist", "chat"]),
  status: z.enum(["started", "stream", "completed", "failed", "forwarded"]),
  toolName: z.string().optional(),
  message: z.string().optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.string().nullable().optional(),
  ts: NonEmpty,
  channelKey: z.string().optional(),
  command: IntercomCommandPayloadSchema.optional(),
});

const IntercomResponsePayloadSchema = z
  .object({
    requestId: NonEmpty,
    mainNodeId: NonEmpty,
    toPlayerId: NonEmpty,
    fromPlayerId: NonEmpty,
    kind: z.enum(["assist", "chat"]),
    status: z.enum(["stream", "completed", "failed"]),
    toolName: z.string().optional(),
    message: z.string().optional(),
    result: z.record(z.string(), z.unknown()).optional(),
    error: z.string().nullable().optional(),
    ts: NonEmpty,
  })
  .superRefine((value, ctx) => {
    if (value.status === "failed" && (value.error ?? "").trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["error"],
        message: "error is required when status is failed",
      });
    }
  });

const CreateHumanNodePayloadSchema = z
  .object({
    consent: z.literal(true),
    passw: NonEmpty,
  })
  .strict();

const WorldChatPublishPayloadSchema = z
  .object({
    requestId: NonEmpty,
    mainNodeId: NonEmpty,
    fromPlayerId: NonEmpty,
    message: NonEmpty,
  })
  .strict();

export type IntercomCommandPayload = z.infer<typeof IntercomCommandPayloadSchema>;
export type WorldIntercomEventPayload = z.infer<
  typeof WorldIntercomEventPayloadSchema
>;
export type IntercomResponsePayload = z.infer<
  typeof IntercomResponsePayloadSchema
>;
export type CreateHumanNodePayload = z.infer<typeof CreateHumanNodePayloadSchema>;
export type WorldChatPublishPayload = z.infer<
  typeof WorldChatPublishPayloadSchema
>;

export function parseIntercomCommandPayload(
  payload: unknown
): IntercomCommandPayload {
  return IntercomCommandPayloadSchema.parse(payload);
}

export function parseWorldIntercomEventPayload(
  payload: unknown
): WorldIntercomEventPayload {
  return WorldIntercomEventPayloadSchema.parse(payload);
}

export function parseIntercomResponsePayload(
  payload: unknown
): IntercomResponsePayload {
  return IntercomResponsePayloadSchema.parse(payload);
}

export function parseCreateHumanNodePayload(
  payload: unknown
): CreateHumanNodePayload {
  return CreateHumanNodePayloadSchema.parse(payload);
}

export function parseWorldChatPublishPayload(
  payload: unknown
): WorldChatPublishPayload {
  return WorldChatPublishPayloadSchema.parse(payload);
}
