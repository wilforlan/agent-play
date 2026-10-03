import { z } from "zod";
import {
  EducationFacultyIdSchema,
  type EducationFacultyId,
} from "./education-access-catalog.js";
import {
  EducationPathIdSchema,
  type EducationPathId,
} from "./education-tuition-catalog.js";

export const EducationLessonProgressSchema = z.object({
  facultyId: EducationFacultyIdSchema,
  pathId: EducationPathIdSchema,
  lessonId: z.string().min(1),
  completedAt: z.string().min(1),
  reflection: z.string().optional(),
});

export type EducationLessonProgress = z.infer<
  typeof EducationLessonProgressSchema
>;

export const educationProgressKey = (input: {
  facultyId: EducationFacultyId;
  pathId: EducationPathId;
  lessonId: string;
}): string => `${input.facultyId}:${input.pathId}:${input.lessonId}`;

export const resolveEducationPathProgress = (input: {
  lessonIds: readonly string[];
  completedLessonIds: ReadonlySet<string>;
}): {
  completedCount: number;
  totalCount: number;
  ratio: number;
  statuses: ReadonlyArray<{
    lessonId: string;
    complete: boolean;
  }>;
} => {
  const statuses = input.lessonIds.map((lessonId) => ({
    lessonId,
    complete: input.completedLessonIds.has(lessonId),
  }));
  const completedCount = statuses.filter((row) => row.complete).length;
  const totalCount = input.lessonIds.length;
  return {
    completedCount,
    totalCount,
    ratio: totalCount === 0 ? 0 : completedCount / totalCount,
    statuses,
  };
};
