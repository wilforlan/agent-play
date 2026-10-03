import { z } from "zod";

export const JoeRoleSchema = z.enum(["student", "joe"]);
export type JoeRole = z.infer<typeof JoeRoleSchema>;

export const JoeBlockKindSchema = z.enum([
  "concept",
  "example",
  "probe",
  "checkpoint",
]);
export type JoeBlockKind = z.infer<typeof JoeBlockKindSchema>;

export const JoeReplyBlockSchema = z.object({
  kind: JoeBlockKindSchema,
  body: z.string().min(1),
});
export type JoeReplyBlock = z.infer<typeof JoeReplyBlockSchema>;

export const JoeStructuredReplySchema = z.object({
  headline: z.string().min(1),
  blocks: z.array(JoeReplyBlockSchema).min(1),
  nextMove: z.string().min(1),
  relevance: z.number().min(0).max(1),
});
export type JoeStructuredReply = z.infer<typeof JoeStructuredReplySchema>;

export const JoeMessageSchema = z.object({
  id: z.string().min(1),
  role: JoeRoleSchema,
  text: z.string().min(1),
  createdAt: z.string().min(1),
  structured: JoeStructuredReplySchema.optional(),
});
export type JoeMessage = z.infer<typeof JoeMessageSchema>;

export const JoeThreadSchema = z.object({
  facultyId: z.string().min(1),
  pathId: z.string().min(1),
  lessonId: z.string().min(1),
  messages: z.array(JoeMessageSchema),
});
export type JoeThread = z.infer<typeof JoeThreadSchema>;

export const JoeLessonContextSchema = z.object({
  facultyId: z.string().min(1),
  pathId: z.string().min(1),
  lessonId: z.string().min(1),
  lessonTitle: z.string().min(1),
  lessonBody: z.string().min(1),
  pathTitle: z.string().optional(),
  facultyLabel: z.string().optional(),
});
export type JoeLessonContext = z.infer<typeof JoeLessonContextSchema>;

export const joeThreadKey = (input: {
  facultyId: string;
  pathId: string;
  lessonId: string;
}): string => `${input.facultyId}:${input.pathId}:${input.lessonId}`;

export const JOE_MIN_RELEVANCE = 0.8;
