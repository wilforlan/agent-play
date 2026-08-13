import { z } from "zod";

export const GeographyFacingSchema = z.enum(["left", "right"]);

export const GeographyPoseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  facing: GeographyFacingSchema.optional(),
  isMoving: z.boolean().optional(),
  stage: z.enum(["overworld", "space", "amenity"]).optional(),
  revisedAt: z.number().finite().optional(),
});

export type GeographyPose = z.infer<typeof GeographyPoseSchema>;

export const GeographyMemberSchema = z.object({
  humanId: z.string().min(1),
  name: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  stage: z.enum(["overworld", "space", "amenity"]).optional(),
  joinedAt: z.number().finite(),
  coarseRevisedAt: z.number().finite(),
});

export type GeographyMember = z.infer<typeof GeographyMemberSchema>;

export const GeographyMembershipJoinSchema = z.object({
  action: z.literal("join"),
  humanId: z.string().min(1),
  name: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  stage: z.enum(["overworld", "space", "amenity"]).optional(),
});

export const GeographyMembershipLeaveSchema = z.object({
  action: z.literal("leave"),
  humanId: z.string().min(1),
});

export const GeographyMembershipBodySchema = z.discriminatedUnion("action", [
  GeographyMembershipJoinSchema,
  GeographyMembershipLeaveSchema,
]);

export type GeographyMembershipBody = z.infer<
  typeof GeographyMembershipBodySchema
>;

export const GeographyCoarseBodySchema = z.object({
  humanId: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  stage: z.enum(["overworld", "space", "amenity"]).optional(),
});

export type GeographyCoarseBody = z.infer<typeof GeographyCoarseBodySchema>;

export const GeographyNeighborsPayloadSchema = z.object({
  humanId: z.string().min(1),
  neighborIds: z.array(z.string().min(1)),
  truncated: z.boolean(),
  memberCount: z.number().int().nonnegative(),
});

export type GeographyNeighborsPayload = z.infer<
  typeof GeographyNeighborsPayloadSchema
>;

export const GeographySignalKindSchema = z.enum([
  "offer",
  "answer",
  "ice",
]);

export const GeographySignalBodySchema = z.object({
  fromHumanId: z.string().min(1),
  toHumanId: z.string().min(1),
  kind: GeographySignalKindSchema,
  payload: z.unknown(),
});

export type GeographySignalBody = z.infer<typeof GeographySignalBodySchema>;

export const GeographyVec2Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export type GeographyVec2 = z.infer<typeof GeographyVec2Schema>;
