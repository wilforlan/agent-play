import { z } from "zod";
import { parseIntercomAddress } from "./channels.js";

const NonEmpty = z.string().trim().min(1);
const IntercomAddress = z
  .string()
  .trim()
  .transform((value) => {
    parseIntercomAddress(value);
    return value;
  });

const IntercomAudioPayloadSchema = z.object({
  encoding: NonEmpty,
  dataBase64: NonEmpty,
  durationMs: z.number().nonnegative().optional(),
});

const IntercomCommandPayloadSchema = z
  .object({
    requestId: NonEmpty,
    mainNodeId: NonEmpty,
    fromPlayerId: NonEmpty,
    toPlayerId: NonEmpty,
    kind: z.enum(["assist", "chat", "audio"]),
    toolName: z.string().optional(),
    args: z.record(z.string(), z.unknown()).optional(),
    text: z.string().optional(),
    audio: IntercomAudioPayloadSchema.optional(),
    intercomAddress: IntercomAddress.optional(),
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
    if (value.kind === "audio" && value.audio === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["audio"],
        message: "audio is required for audio kind",
      });
    }
  });

const WorldIntercomEventPayloadSchema = z.object({
  requestId: NonEmpty,
  mainNodeId: NonEmpty,
  toPlayerId: NonEmpty,
  fromPlayerId: NonEmpty,
  kind: z.enum(["assist", "chat", "audio"]),
  status: z.enum(["started", "stream", "completed", "failed", "forwarded"]),
  toolName: z.string().optional(),
  message: z.string().optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.string().nullable().optional(),
  ts: NonEmpty,
  channelKey: z.string().optional(),
  intercomAddress: IntercomAddress.optional(),
  command: IntercomCommandPayloadSchema.optional(),
});

const IntercomResponsePayloadSchema = z
  .object({
    requestId: NonEmpty,
    mainNodeId: NonEmpty,
    toPlayerId: NonEmpty,
    fromPlayerId: NonEmpty,
    kind: z.enum(["assist", "chat", "audio"]),
    status: z.enum(["stream", "completed", "failed"]),
    toolName: z.string().optional(),
    message: z.string().optional(),
    result: z.record(z.string(), z.unknown()).optional(),
    error: z.string().nullable().optional(),
    ts: NonEmpty,
    intercomAddress: IntercomAddress.optional(),
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
export type IntercomMessageKind = "text" | "audio" | "media";

type IntercomResultRecord = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function inferMessageKind(result: IntercomResultRecord): IntercomMessageKind {
  const explicit = result.messageKind;
  if (explicit === "text" || explicit === "audio" || explicit === "media") {
    return explicit;
  }
  if (isRecord(result.audio)) {
    return "audio";
  }
  if (isRecord(result.media)) {
    return "media";
  }
  return "text";
}

export function normalizeIntercomResult(input: {
  message?: string;
  result?: IntercomResultRecord;
}): IntercomResultRecord {
  const base: IntercomResultRecord = input.result ?? {};
  const messageKind = inferMessageKind(base);
  if (messageKind === "text") {
    const messageValue =
      typeof base.message === "string"
        ? base.message
        : typeof input.message === "string"
          ? input.message
          : undefined;
    if (messageValue === undefined) {
      return { ...base, messageKind };
    }
    return { ...base, messageKind, message: messageValue };
  }
  return { ...base, messageKind };
}

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
