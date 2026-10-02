import { EDUCATION_LESSON_BODIES } from "./lesson-bodies.js";

export const loadEducationLessonBody = (relativeFile: string): string => {
  const normalized = relativeFile.replace(/^\/+/, "");
  const direct = EDUCATION_LESSON_BODIES[normalized];
  if (typeof direct === "string") {
    return direct;
  }
  const suffix = normalized.startsWith("faculties/")
    ? normalized
    : `faculties/${normalized}`;
  const match = Object.entries(EDUCATION_LESSON_BODIES).find(([filePath]) =>
    filePath === suffix || filePath.endsWith(`/${normalized}`)
  );
  if (match !== undefined) {
    return match[1];
  }
  return `Lesson content unavailable for ${relativeFile}.`;
};
